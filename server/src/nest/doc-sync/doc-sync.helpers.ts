import crypto from 'crypto';
import path from 'path';
import { BLOCKED_EXTENSIONS } from '../files/files.constants';
import { MASS_DELETE_MIN_ITEMS, MASS_DELETE_RATIO } from './doc-sync.constants';
import type { RemoteDocument } from './document-provider';

/**
 * The pure half of the sync core.
 *
 * `planReconcile` takes a snapshot of both sides and returns the actions to
 * take. It touches no database, no HTTP and no container, which is what lets
 * the hard cases — conflict, echo, mass deletion, rename, a document that
 * exists on neither side any more — be tested exhaustively as plain data. The
 * service does nothing but execute the plan.
 */

// ── Identity and fingerprints ────────────────────────────────────────────────

/**
 * A stable fingerprint over an explicit field order.
 *
 * The order is written out rather than derived from the object for the reason
 * dawarich.helpers.ts gives: a hash over `Object.keys` changes when someone
 * adds a field or a provider reorders its JSON, and a changed hash means
 * "changed upstream" to every later run. Explicit means a reviewer can see what
 * participates.
 */
export function snapshotHash(parts: readonly (string | number | null | undefined)[]): string {
  return crypto.createHash('sha256').update(parts.map((p) => String(p ?? '')).join('\u0000')).digest('hex');
}

/** Per-document anchor, written into provider metadata where there is room. */
export function newTrekDocUid(): string {
  return crypto.randomUUID();
}

/**
 * Names arriving from a provider are hostile input: they can carry path
 * separators, control characters, leading dots and NTFS-illegal characters, and
 * they end up both in a DB column and in a Content-Disposition header.
 *
 * The extension is preserved deliberately — it is what TREK's download route
 * derives the Content-Type from, and what the blocklist check reads.
 */
export function sanitizeIncomingName(raw: string): string {
  // Split on separators by hand rather than through path.basename: the win32
  // flavour reads `a:` as a drive letter and silently drops it, so a perfectly
  // ordinary `a:b.pdf` from a Linux provider would arrive as `b.pdf`. Only
  // slashes are directory separators as far as this is concerned; the colon is
  // dealt with below, as an illegal character.
  const base = (raw || '').split(/[\\/]/).pop()?.trim() ?? '';
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 200);
  return cleaned || 'document';
}

/**
 * The blocklist is enforced on incoming provider documents for exactly the same
 * reason it is enforced on uploads: TREK serves downloads inline with an
 * extension-derived Content-Type, so an .svg or .html from a Nextcloud folder
 * would be a stored XSS. A rejected document becomes a visible `rejected_type`
 * row rather than a silent skip, so the person who put it there can find out.
 */
export function isBlockedName(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return !!ext && BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * The operator's own allowlist, applied to incoming provider documents.
 *
 * Same rule as an upload: `*` admits anything the blocklist above still lets
 * through, and an empty extension is refused rather than waved past, because a
 * file with no extension is served with a Content-Type TREK had to guess.
 */
export function isAllowedByOperator(name: string, allowedCsv: string): boolean {
  const ext = path.extname(name).toLowerCase().replace(/^\./, '');
  if (!ext) return false;
  if (allowedCsv.trim() === '*') return true;
  return allowedCsv
    .split(',')
    .map((e) => e.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
    .includes(ext);
}

// ── The plan ─────────────────────────────────────────────────────────────────

/** What the core knows about one pairing before the run. */
export interface SyncItemState {
  id: number;
  fileId: number | null;
  trekDocUid: string;
  remoteId: string | null;
  remoteVersion: string | null;
  /** The name the provider had at the last agreed state — the rename arbiter. */
  remoteName: string | null;
  /** The bytes both sides last agreed on. */
  contentSha256: string | null;
  /** What TREK itself last uploaded — the echo guard. */
  pushedSha256: string | null;
  state: string;
  attempts: number;
  remoteMissingAt: string | null;
}

/** What TREK currently holds for this trip. */
export interface LocalDocument {
  fileId: number;
  name: string;
  size: number;
  mimeType: string | null;
  sha256: string | null;
  deletedAt: string | null;
}

export type PlanAction =
  /** Bytes only exist upstream: download and create a trip_files row. */
  | { kind: 'pull'; remote: RemoteDocument; itemId: number | null }
  /** Bytes only exist in TREK: upload. */
  | { kind: 'push'; local: LocalDocument; itemId: number | null; remoteId: string | null }
  /** Upstream moved on while TREK did not: replace local bytes. */
  | { kind: 'pull_update'; remote: RemoteDocument; itemId: number }
  /** TREK moved on while upstream did not: push a new revision. */
  | { kind: 'push_update'; local: LocalDocument; itemId: number; remoteId: string }
  /** A name changed on one side only. */
  | { kind: 'rename_remote'; itemId: number; remoteId: string; name: string }
  | { kind: 'rename_local'; itemId: number; fileId: number; name: string }
  /** Both sides changed since the agreed state. */
  | { kind: 'conflict'; itemId: number; remote: RemoteDocument | null; local: LocalDocument | null }
  /** Present upstream last run, absent now. Recorded, never acted on. */
  | { kind: 'mark_remote_missing'; itemId: number }
  /** Deleted in TREK; what happens upstream is the link's delete policy. */
  | { kind: 'local_deleted'; itemId: number; remoteId: string }
  /** Nothing to do but the row should stop looking stale. */
  | { kind: 'touch'; itemId: number; remote: RemoteDocument | null };

export interface ReconcilePlan {
  actions: PlanAction[];
  /** True when the listing looked like a mass deletion and was not trusted. */
  massDeleteGuardTripped: boolean;
  /** Vanished upstream but below the guard threshold. */
  missingCount: number;
}

export interface ReconcileInput {
  items: readonly SyncItemState[];
  remote: readonly RemoteDocument[];
  local: readonly LocalDocument[];
  direction: 'both' | 'pull' | 'push';
  /** A truncated listing must never be read as "the rest was deleted". */
  remoteTruncated: boolean;
  /** Providers without stable ids need the rename heuristic. */
  stableRemoteIds: boolean;
}

/**
 * Decide what has to happen, from a snapshot of both sides.
 *
 * The three-way comparison is the whole point: `contentSha256` is the state
 * both sides last agreed on, so "changed here" and "changed there" are separate
 * questions and a change on one side alone is never a conflict. Collapsing that
 * into a two-way comparison is what makes naive sync engines either lose edits
 * or ping-pong forever.
 */
export function planReconcile(input: ReconcileInput): ReconcilePlan {
  const { items, remote, local, direction, remoteTruncated, stableRemoteIds } = input;
  const actions: PlanAction[] = [];

  const remoteById = new Map<string, RemoteDocument>();
  for (const r of remote) if (!r.isDeleted) remoteById.set(r.remoteId, r);
  const localById = new Map<number, LocalDocument>();
  for (const l of local) localById.set(l.fileId, l);

  const itemsByRemote = new Map<string, SyncItemState>();
  const itemsByFile = new Map<number, SyncItemState>();
  for (const it of items) {
    if (it.remoteId) itemsByRemote.set(it.remoteId, it);
    if (it.fileId !== null) itemsByFile.set(it.fileId, it);
  }

  // A listing that lost most of what it had last time is far more likely to be
  // a broken mount, a revoked token or a moved folder than a real mass delete.
  const known = items.filter((i) => i.remoteId && i.state === 'synced');
  const vanished = known.filter((i) => !remoteById.has(i.remoteId as string));
  const guardTripped =
    !remoteTruncated &&
    known.length >= MASS_DELETE_MIN_ITEMS &&
    vanished.length / known.length > MASS_DELETE_RATIO;

  // ── Pairs that exist on both sides ────────────────────────────────────────
  for (const it of items) {
    if (!it.remoteId) continue;
    const r = remoteById.get(it.remoteId);
    if (!r) continue;
    const l = it.fileId !== null ? localById.get(it.fileId) : undefined;

    const remoteChanged = it.remoteVersion !== null && r.remoteVersion !== it.remoteVersion;
    // The echo guard: bytes TREK itself pushed come back as a change on the
    // provider side. They are only TREK's own write if the hash still matches
    // what was pushed, so this compares content, never timestamps — a time
    // window would misfire on every clock skew.
    const isEcho =
      remoteChanged &&
      r.contentHash !== null &&
      it.pushedSha256 !== null &&
      r.contentHash === it.pushedSha256;

    const localChanged = !!l && l.sha256 !== null && it.contentSha256 !== null && l.sha256 !== it.contentSha256;

    if (l?.deletedAt) {
      actions.push({ kind: 'local_deleted', itemId: it.id, remoteId: it.remoteId });
      continue;
    }

    if (remoteChanged && !isEcho && localChanged) {
      actions.push({ kind: 'conflict', itemId: it.id, remote: r, local: l ?? null });
      continue;
    }
    if (remoteChanged && !isEcho) {
      if (direction === 'push') { actions.push({ kind: 'touch', itemId: it.id, remote: r }); continue; }
      actions.push({ kind: 'pull_update', remote: r, itemId: it.id });
      continue;
    }
    if (localChanged && l) {
      if (direction === 'pull') { actions.push({ kind: 'touch', itemId: it.id, remote: r }); continue; }
      actions.push({ kind: 'push_update', local: l, itemId: it.id, remoteId: it.remoteId });
      continue;
    }

    // Same bytes, different name. Which side renamed is decided by comparing
    // each against the name they last agreed on — not by direction. Reading
    // `both` as "TREK always wins" silently renamed the provider's copy back
    // every time somebody tidied up a folder, which is the opposite of a
    // two-way sync.
    if (l && r.name !== l.name) {
      const providerRenamed = it.remoteName !== null && r.name !== it.remoteName;
      const localRenamed = it.remoteName !== null && l.name !== it.remoteName;

      if (providerRenamed && !localRenamed && direction !== 'push') {
        actions.push({ kind: 'rename_local', itemId: it.id, fileId: l.fileId, name: r.name });
        continue;
      }
      if (localRenamed && !providerRenamed && direction !== 'pull') {
        actions.push({ kind: 'rename_remote', itemId: it.id, remoteId: it.remoteId, name: l.name });
        continue;
      }
      if (providerRenamed && localRenamed) {
        // Both sides renamed. Nothing here can pick the right one, and picking
        // wrong loses a name somebody chose, so it goes to a person.
        actions.push({ kind: 'conflict', itemId: it.id, remote: r, local: l });
        continue;
      }
      // No stored name to arbitrate with (a row from before this column, or a
      // freshly paired document): follow the binding's direction.
      if (direction === 'pull') actions.push({ kind: 'rename_local', itemId: it.id, fileId: l.fileId, name: r.name });
      else if (direction === 'push') actions.push({ kind: 'rename_remote', itemId: it.id, remoteId: it.remoteId, name: l.name });
      else actions.push({ kind: 'touch', itemId: it.id, remote: r });
      continue;
    }

    actions.push({ kind: 'touch', itemId: it.id, remote: r });
  }

  // ── Upstream only ─────────────────────────────────────────────────────────
  if (direction !== 'push') {
    for (const r of remote) {
      if (r.isDeleted) continue;
      const existing = itemsByRemote.get(r.remoteId);
      if (existing) continue;

      // Without stable ids a rename reads as "old one gone, new one appeared".
      // Re-pair on content instead of downloading the same bytes again and
      // leaving a phantom behind.
      if (!stableRemoteIds && r.contentHash) {
        const reuse = items.find(
          (i) => i.contentSha256 === r.contentHash && i.remoteId !== null && !remoteById.has(i.remoteId),
        );
        if (reuse) {
          actions.push({ kind: 'touch', itemId: reuse.id, remote: r });
          continue;
        }
      }
      actions.push({ kind: 'pull', remote: r, itemId: null });
    }
  }

  // ── TREK only ─────────────────────────────────────────────────────────────
  if (direction !== 'pull') {
    for (const l of local) {
      if (l.deletedAt) continue;
      const it = itemsByFile.get(l.fileId);
      if (it?.remoteId && remoteById.has(it.remoteId)) continue;
      // A row that has a remoteId which is no longer listed is handled below as
      // "missing", not re-uploaded — otherwise a broken listing duplicates the
      // entire trip upstream.
      if (it?.remoteId) continue;
      actions.push({ kind: 'push', local: l, itemId: it?.id ?? null, remoteId: null });
    }
  }

  // ── Vanished upstream ─────────────────────────────────────────────────────
  if (!guardTripped && !remoteTruncated) {
    for (const it of vanished) {
      if (it.remoteMissingAt) continue;
      actions.push({ kind: 'mark_remote_missing', itemId: it.id });
    }
  }

  return { actions, massDeleteGuardTripped: guardTripped, missingCount: vanished.length };
}

/** Backoff lookup that saturates instead of running off the end of the curve. */
export function backoffSeconds(curve: readonly number[], failures: number): number {
  if (failures <= 0) return curve[0];
  return curve[Math.min(failures - 1, curve.length - 1)];
}
