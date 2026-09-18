import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { Readable } from 'node:stream';
import type { DocsyncErrorCode } from '@trek/shared';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { FilesService } from '../files/files.service';
import { AllowedFileTypesService } from '../files/allowed-file-types.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MAX_FILE_SIZE } from '../files/files.constants';
import { DocumentProviderRegistry } from './document-provider.registry';
import { DocSyncConfigService, type ConnectionRow, type LinkRow } from './doc-sync-config.service';
import type { DocumentProvider, RemoteDocument } from './document-provider';
import { docFailed } from './document-provider';
import {
  ITEM_BACKOFF_SECONDS,
  ITEM_MAX_ATTEMPTS,
  LINK_BACKOFF_SECONDS,
  LINK_CIRCUIT_OPEN_AFTER,
  MAX_TRANSFERS_PER_RUN,
} from './doc-sync.constants';
import {
  backoffSeconds,
  isAllowedByOperator,
  isBlockedName,
  newTrekDocUid,
  planReconcile,
  sanitizeIncomingName,
  type LocalDocument,
  type PlanAction,
  type SyncItemState,
} from './doc-sync.helpers';

/**
 * The reconciler: it executes what `planReconcile` decided, and does nothing
 * else of consequence.
 *
 * It enumerates both sides in full on every run rather than asking for a delta.
 * That looks wasteful and is deliberate. A changed-since query cannot see a
 * deletion at all; Papra does not bump `updatedAt` when a tag changes (measured,
 * not assumed); Paperless's bulk edit changes documents without touching
 * `modified`; and Synology FileStation has no change feed whatsoever. A webhook
 * is therefore only ever "look now", never a source of truth — the same
 * conclusion AirTrail and Dawarich reached for their own providers, written
 * down in dawarich-sync.service.ts.
 *
 * Two safety rules outrank everything else here:
 *   1. A document that disappears upstream is RECORDED as missing. It is never
 *      deleted locally as a side effect. An unmounted share answers with an
 *      empty listing, and a trip is not a cache.
 *   2. TREK's own writes must not come back as foreign changes. That is what
 *      `pushed_sha256` is for, and why the comparison is over content rather
 *      than over timestamps.
 */
@Injectable()
export class DocSyncService {
  private readonly logger = new Logger(DocSyncService.name);
  /** Container singleton, so one in-flight run per link across callers. */
  private readonly running = new Set<number>();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: DocSyncConfigService,
    private readonly registry: DocumentProviderRegistry,
    private readonly storage: StorageService,
    private readonly files: FilesService,
    private readonly allowedTypes: AllowedFileTypesService,
    private readonly realtime: RealtimeService,
  ) {}

  // ── Entry points ───────────────────────────────────────────────────────────

  /** Links the scheduler should look at now. */
  dueLinks(limit = 20): LinkRow[] {
    return this.db.connection
      .prepare(
        `SELECT * FROM trip_document_links
          WHERE sync_enabled = 1
            AND failure_count < ?
            AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
          ORDER BY COALESCE(next_attempt_at, '1970-01-01') ASC
          LIMIT ?`,
      )
      .all(LINK_CIRCUIT_OPEN_AFTER, limit) as LinkRow[];
  }

  /**
   * Run one link.
   *
   * Never throws for provider trouble: a failing link records its state, backs
   * off and lets the next link run. One unreachable NAS must not stop the
   * Paperless binding on another trip.
   */
  async syncLink(link: LinkRow, opts: { full?: boolean } = {}): Promise<{
    state: string;
    pulled: number;
    pushed: number;
    conflicts: number;
    missing: number;
    errorCode?: DocsyncErrorCode;
  }> {
    if (this.running.has(link.id)) {
      return { state: 'busy', pulled: 0, pushed: 0, conflicts: 0, missing: 0 };
    }
    this.running.add(link.id);
    try {
      return await this.runLink(link, opts);
    } catch (err) {
      this.logger.error(`link ${link.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      this.recordLinkFailure(link, 'unknown');
      return { state: 'failed', pulled: 0, pushed: 0, conflicts: 0, missing: 0, errorCode: 'unknown' };
    } finally {
      this.running.delete(link.id);
    }
  }

  private async runLink(link: LinkRow, opts: { full?: boolean }): Promise<{
    state: string; pulled: number; pushed: number; conflicts: number; missing: number; errorCode?: DocsyncErrorCode;
  }> {
    const conn = this.config.getConnection(link.connection_id);
    if (!conn) {
      this.recordLinkFailure(link, 'not_found');
      return { state: 'failed', pulled: 0, pushed: 0, conflicts: 0, missing: 0, errorCode: 'not_found' };
    }
    const provider = this.registry.get(link.provider_id);
    if (!provider) {
      this.recordLinkFailure(link, 'provider_error');
      return { state: 'failed', pulled: 0, pushed: 0, conflicts: 0, missing: 0, errorCode: 'provider_error' };
    }

    const ref = this.config.toRef(conn);
    const scope = this.config.toScopeRef(link);
    if (opts.full) scope.cursor = null;

    // A binding whose folder or tag is gone needs a human, not a retry: the
    // alternative is re-creating someone's deleted folder and filling it again.
    const resolved = await provider.resolveScope(ref, scope);
    if (docFailed(resolved)) {
      const code = resolved.error.code === 'not_found' || resolved.error.code === 'scope_missing' ? 'scope_missing' : resolved.error.code;
      this.recordLinkFailure(link, code, code === 'scope_missing' ? 'scope_lost' : undefined);
      return { state: code === 'scope_missing' ? 'scope_lost' : 'failed', pulled: 0, pushed: 0, conflicts: 0, missing: 0, errorCode: code };
    }

    const listing = await provider.list(ref, scope);
    if (docFailed(listing)) {
      const state = listing.error.code === 'unauthorized' ? 'needs_reauth' : 'failed';
      this.recordLinkFailure(link, listing.error.code, state);
      return { state, pulled: 0, pushed: 0, conflicts: 0, missing: 0, errorCode: listing.error.code };
    }

    const items = this.loadItems(link.id);
    const local = this.loadLocalDocuments(link);

    const plan = planReconcile({
      items,
      remote: listing.data.documents,
      local,
      direction: link.direction as 'both' | 'pull' | 'push',
      remoteTruncated: listing.data.truncated,
      stableRemoteIds: provider.capabilities(ref).stableId,
    });

    if (plan.massDeleteGuardTripped) {
      // Refusing the whole run is the point: the listing is not trustworthy, so
      // nothing in it should be acted on, not even the parts that look fine.
      this.logger.warn(`link ${link.id}: mass-delete guard tripped (${plan.missingCount} of ${items.length} gone), run abandoned`);
      this.recordLinkFailure(link, 'mass_delete_guard', 'partial');
      return { state: 'partial', pulled: 0, pushed: 0, conflicts: 0, missing: plan.missingCount, errorCode: 'mass_delete_guard' };
    }

    let pulled = 0;
    let pushed = 0;
    let conflicts = 0;
    let transfers = 0;
    let budgetExhausted = false;
    let softFailure: DocsyncErrorCode | undefined;

    for (const action of plan.actions) {
      if (transfers >= MAX_TRANSFERS_PER_RUN && isTransfer(action)) {
        // Leaving the rest for the next run keeps one enormous trip from
        // starving every other binding on the instance. Reported as `partial`
        // rather than `ok`: the binding is not in step yet, and a status line
        // claiming it is would be a lie a user acts on.
        budgetExhausted = true;
        break;
      }
      const outcome = await this.applyAction(action, { provider, ref, scope, link, conn });
      if (outcome === 'pulled') { pulled += 1; transfers += 1; }
      else if (outcome === 'pushed') { pushed += 1; transfers += 1; }
      else if (outcome === 'conflict') conflicts += 1;
      else if (outcome && outcome !== 'ok') softFailure = outcome;
    }

    const state = softFailure || budgetExhausted ? 'partial' : 'ok';
    this.recordLinkSuccess(link, listing.data.cursor, state, softFailure ?? null);
    if (pulled > 0 || pushed > 0) {
      this.realtime.broadcast(link.trip_id, 'docsync:changed', { linkId: link.id, pulled, pushed });
    }
    return { state, pulled, pushed, conflicts, missing: plan.missingCount, errorCode: softFailure };
  }

  // ── Action execution ───────────────────────────────────────────────────────

  private async applyAction(
    action: PlanAction,
    ctx: { provider: DocumentProvider; ref: ReturnType<DocSyncConfigService['toRef']>; scope: ReturnType<DocSyncConfigService['toScopeRef']>; link: LinkRow; conn: ConnectionRow },
  ): Promise<'ok' | 'pulled' | 'pushed' | 'conflict' | DocsyncErrorCode> {
    switch (action.kind) {
      case 'pull':
      case 'pull_update':
        return this.pull(action.remote, action.kind === 'pull_update' ? action.itemId : null, ctx);
      case 'push':
      case 'push_update':
        return this.push(action.local, 'itemId' in action ? action.itemId : null, 'remoteId' in action ? action.remoteId : null, ctx);
      case 'rename_remote': {
        const res = await ctx.provider.rename(ctx.ref, ctx.scope, action.remoteId, action.name);
        if (docFailed(res)) return res.error.code;
        this.db.connection
          .prepare('UPDATE document_sync_items SET remote_name = ?, remote_version = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(action.name, res.data.remoteVersion, action.itemId);
        return 'ok';
      }
      case 'rename_local': {
        this.db.connection.prepare('UPDATE trip_files SET original_name = ? WHERE id = ?').run(action.name, action.fileId);
        this.realtime.broadcast(ctx.link.trip_id, 'file:updated', {
          file: this.files.getFileById(action.fileId, ctx.link.trip_id),
        });
        this.db.connection
          .prepare('UPDATE document_sync_items SET remote_name = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(action.name, action.itemId);
        return 'ok';
      }
      case 'conflict': {
        this.db.connection
          .prepare("UPDATE document_sync_items SET state = 'conflict', last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(action.itemId);
        return 'conflict';
      }
      case 'mark_remote_missing': {
        // Recorded, not executed. A human decides whether the local copy goes.
        this.db.connection
          .prepare(
            `UPDATE document_sync_items
                SET state = 'remote_missing', remote_missing_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
          )
          .run(action.itemId);
        return 'ok';
      }
      case 'local_deleted': {
        if (ctx.link.delete_policy === 'trash') {
          const res = await ctx.provider.trash(ctx.ref, ctx.scope, action.remoteId);
          if (docFailed(res)) return res.error.code;
        }
        this.db.connection
          .prepare("UPDATE document_sync_items SET state = 'local_deleted', last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(action.itemId);
        return 'ok';
      }
      case 'touch': {
        // `error` is NOT cleared here. A row in that state has no bytes in TREK
        // — the download failed — and marking it synced would hide a document
        // that nobody will ever fetch again. Only a `remote_missing` row, whose
        // file is present and whose provider copy came back, recovers this way.
        this.db.connection
          .prepare(
            `UPDATE document_sync_items
                SET last_seen_at = CURRENT_TIMESTAMP,
                    remote_version = COALESCE(?, remote_version),
                    remote_name = COALESCE(?, remote_name),
                    remote_id = COALESCE(?, remote_id),
                    remote_missing_at = NULL,
                    state = CASE WHEN state = 'remote_missing' AND file_id IS NOT NULL THEN 'synced' ELSE state END
              WHERE id = ?`,
          )
          .run(action.remote?.remoteVersion ?? null, action.remote?.name ?? null, action.remote?.remoteId ?? null, action.itemId);
        return 'ok';
      }
      default:
        return 'ok';
    }
  }

  /** Download a remote document into TREK as an ordinary trip file. */
  private async pull(
    remote: RemoteDocument,
    itemId: number | null,
    ctx: { provider: DocumentProvider; ref: ReturnType<DocSyncConfigService['toRef']>; scope: ReturnType<DocSyncConfigService['toScopeRef']>; link: LinkRow },
  ): Promise<'pulled' | DocsyncErrorCode> {
    const name = sanitizeIncomingName(remote.name);

    // The same defences an upload goes through. A provider folder routinely
    // holds .svg and .html, and TREK serves downloads inline with a
    // Content-Type derived from the extension — letting those through would be
    // stored XSS. Rejected documents become a visible row, never a silent skip.
    if (isBlockedName(name) || !isAllowedByOperator(name, this.allowedTypes.get())) {
      this.upsertItem(ctx.link, { itemId, remote, state: 'rejected_type', errorCode: 'unsupported_type' });
      return 'unsupported_type';
    }
    if (remote.size !== null && remote.size > MAX_FILE_SIZE) {
      this.upsertItem(ctx.link, { itemId, remote, state: 'too_large', errorCode: 'too_large' });
      return 'too_large';
    }

    const fetched = await ctx.provider.fetch(ctx.ref, ctx.scope, remote.remoteId);
    if (docFailed(fetched)) {
      this.upsertItem(ctx.link, { itemId, remote, state: 'error', errorCode: fetched.error.code });
      return fetched.error.code;
    }

    // Spool to disk first and hash while writing: the size a provider claims in
    // a listing is not a promise, and the hash is needed for the echo guard
    // regardless. Committing to storage only after the bytes are complete keeps
    // a half-written object from ever becoming a trip_files row.
    const ext = path.extname(name);
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const spoolDir = this.storage.spoolDirFor('files');
    const tmpPath = path.join(spoolDir, `${storageKey}.part`);
    const hash = crypto.createHash('sha256');
    let bytes = 0;

    try {
      const counting = new Transform({
        transform(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null, d?: Buffer) => void) {
          bytes += chunk.length;
          hash.update(chunk);
          if (bytes > MAX_FILE_SIZE) { cb(new Error('too_large')); return; }
          cb(null, chunk);
        },
      });
      await pipeline(fetched.data.body, counting, fs.createWriteStream(tmpPath));
    } catch (err) {
      await fs.promises.rm(tmpPath, { force: true });
      const code: DocsyncErrorCode = err instanceof Error && err.message === 'too_large' ? 'too_large' : 'provider_error';
      this.upsertItem(ctx.link, { itemId, remote, state: code === 'too_large' ? 'too_large' : 'error', errorCode: code });
      return code;
    }

    const sha256 = hash.digest('hex');
    try {
      await this.storage.put('files', storageKey, { tmpPath });
    } catch {
      await fs.promises.rm(tmpPath, { force: true });
      this.upsertItem(ctx.link, { itemId, remote, state: 'error', errorCode: 'provider_error' });
      return 'provider_error';
    }

    const created = this.files.createFile(
      ctx.link.trip_id,
      { filename: storageKey, originalname: name, size: bytes, mimetype: remote.mimeType || 'application/octet-stream' },
      // Attributed to the person whose connection brought it in, which is the
      // only honest answer: nobody in TREK uploaded it.
      this.config.getConnection(ctx.link.connection_id)?.owner_user_id ?? 0,
      {},
    );

    this.upsertItem(ctx.link, {
      itemId,
      remote,
      state: 'synced',
      fileId: Number(created.id),
      contentSha256: sha256,
      errorCode: null,
    });
    this.realtime.broadcast(ctx.link.trip_id, 'file:created', { file: created });
    return 'pulled';
  }

  /** Upload a TREK document to the provider. */
  private async push(
    local: LocalDocument,
    itemId: number | null,
    remoteId: string | null,
    ctx: { provider: DocumentProvider; ref: ReturnType<DocSyncConfigService['toRef']>; scope: ReturnType<DocSyncConfigService['toScopeRef']>; link: LinkRow },
  ): Promise<'pushed' | DocsyncErrorCode> {
    const caps = ctx.provider.capabilities(ctx.ref);
    const mime = local.mimeType || 'application/octet-stream';

    // Paperless refuses anything outside its parser list with a 400. Checking
    // first turns a recurring hard failure into one visible row that says why.
    if (caps.acceptedMimeTypes && !caps.acceptedMimeTypes.includes(mime)) {
      this.upsertItem(ctx.link, { itemId, fileId: local.fileId, state: 'rejected_type', errorCode: 'unsupported_type' });
      return 'unsupported_type';
    }
    if (caps.maxUploadBytes !== null && local.size > caps.maxUploadBytes) {
      this.upsertItem(ctx.link, { itemId, fileId: local.fileId, state: 'too_large', errorCode: 'too_large' });
      return 'too_large';
    }

    const file = this.files.getFileById(local.fileId, ctx.link.trip_id);
    if (!file) return 'not_found';

    let sha256 = local.sha256;
    let stream: Readable;
    try {
      // Hash before sending when it is not known yet: the push result has to
      // record exactly what was written, or the echo guard has nothing to
      // compare against on the next run.
      if (!sha256) sha256 = await this.hashStoredFile(String(file.filename));
      const got = await this.storage.getStream('files', String(file.filename));
      stream = got.stream;
    } catch {
      this.upsertItem(ctx.link, { itemId, fileId: local.fileId, state: 'error', errorCode: 'provider_error' });
      return 'provider_error';
    }

    const uid = this.existingUid(ctx.link.id, itemId) ?? newTrekDocUid();
    const res = await ctx.provider.push(ctx.ref, ctx.scope, {
      body: stream,
      fileName: local.name,
      mimeType: mime,
      size: local.size,
      sha256,
      mtimeSeconds: Math.floor(Date.now() / 1000),
      remoteId: remoteId ?? undefined,
      trekDocUid: uid,
      trekTripUid: `trek-trip-${ctx.link.trip_id}`,
    });

    if (docFailed(res)) {
      this.upsertItem(ctx.link, { itemId, fileId: local.fileId, state: 'error', errorCode: res.error.code, trekDocUid: uid });
      return res.error.code;
    }

    this.upsertItem(ctx.link, {
      itemId,
      fileId: local.fileId,
      state: 'synced',
      remoteIdOverride: res.data.remoteId,
      remoteVersion: res.data.remoteVersion,
      contentSha256: sha256,
      pushedSha256: sha256,
      trekDocUid: uid,
      errorCode: null,
    });
    return 'pushed';
  }

  // ── State loading and writing ──────────────────────────────────────────────

  private loadItems(linkId: number): SyncItemState[] {
    const rows = this.db.connection
      .prepare(
        `SELECT id, file_id, trek_doc_uid, remote_id, remote_version, remote_name, content_sha256,
                pushed_sha256, state, attempts, remote_missing_at
           FROM document_sync_items WHERE link_id = ?`,
      )
      .all(linkId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      fileId: r.file_id === null ? null : Number(r.file_id),
      trekDocUid: String(r.trek_doc_uid),
      remoteId: r.remote_id === null ? null : String(r.remote_id),
      remoteVersion: r.remote_version === null ? null : String(r.remote_version),
      remoteName: r.remote_name === null || r.remote_name === undefined ? null : String(r.remote_name),
      contentSha256: r.content_sha256 === null ? null : String(r.content_sha256),
      pushedSha256: r.pushed_sha256 === null ? null : String(r.pushed_sha256),
      state: String(r.state),
      attempts: Number(r.attempts ?? 0),
      remoteMissingAt: r.remote_missing_at === null ? null : String(r.remote_missing_at),
    }));
  }

  /**
   * The trip's own documents, minus the ones that are not really documents.
   *
   * Chat attachments (`message_id`) and note attachments (`note_id`) live in
   * the same table but belong to a conversation, not to the trip's paperwork —
   * syncing them would push someone's chat screenshot into a shared Paperless.
   *
   * The set is per TRIP, not per binding, and that is a property rather than an
   * oversight: a binding mirrors the trip's documents, so two bindings on one
   * trip each hold a full copy. That is the right answer for "the same papers,
   * in both my Nextcloud and my Paperless", and the wrong one for "receipts to
   * Paperless, everything else to Nextcloud" — splitting a trip across bindings
   * would need a per-document assignment that nothing in the UI offers yet.
   */
  private loadLocalDocuments(link: LinkRow): LocalDocument[] {
    const rows = this.db.connection
      .prepare(
        `SELECT f.id, f.original_name, f.file_size, f.mime_type, f.deleted_at
           FROM trip_files f
          WHERE f.trip_id = ? AND f.message_id IS NULL AND f.note_id IS NULL`,
      )
      .all(link.trip_id) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      fileId: Number(r.id),
      name: String(r.original_name),
      size: Number(r.file_size ?? 0),
      mimeType: r.mime_type === null ? null : String(r.mime_type),
      // Deliberately null, and not the agreed hash out of document_sync_items:
      // reading that column here would compare it against itself, and
      // `localChanged` in the planner could then never be true. TREK has no way
      // to replace a document's bytes — an upload creates a new row — so there
      // is no local change to detect, and claiming otherwise would be worse
      // than admitting it. The day the file manager grows a replace, this needs
      // a real hash column on trip_files, filled at upload time.
      sha256: null,
      deletedAt: r.deleted_at === null ? null : String(r.deleted_at),
    }));
  }

  private existingUid(linkId: number, itemId: number | null): string | null {
    if (itemId === null) return null;
    const row = this.db.connection
      .prepare('SELECT trek_doc_uid FROM document_sync_items WHERE id = ? AND link_id = ?')
      .get(itemId, linkId) as { trek_doc_uid?: string } | undefined;
    return row?.trek_doc_uid ?? null;
  }

  private async hashStoredFile(storageKey: string): Promise<string> {
    const { stream } = await this.storage.getStream('files', storageKey);
    const hash = crypto.createHash('sha256');
    for await (const chunk of stream) hash.update(chunk as Buffer);
    return hash.digest('hex');
  }

  private upsertItem(
    link: LinkRow,
    patch: {
      itemId: number | null;
      remote?: RemoteDocument;
      remoteIdOverride?: string;
      remoteVersion?: string;
      fileId?: number;
      state: string;
      errorCode?: DocsyncErrorCode | null;
      contentSha256?: string;
      pushedSha256?: string;
      trekDocUid?: string;
    },
  ): void {
    const remoteId = patch.remoteIdOverride ?? patch.remote?.remoteId ?? null;
    const remoteVersion = patch.remoteVersion ?? patch.remote?.remoteVersion ?? null;
    const failed = patch.state === 'error';

    if (patch.itemId !== null) {
      const attempts = failed ? 1 : 0;
      this.db.connection
        .prepare(
          `UPDATE document_sync_items
              SET state = ?, error_code = ?, file_id = COALESCE(?, file_id),
                  -- see the giveUp() note below: a row that has run out of
                  -- attempts stops retrying and waits for a person

                  remote_id = COALESCE(?, remote_id), remote_version = COALESCE(?, remote_version),
                  remote_name = COALESCE(?, remote_name), remote_size = COALESCE(?, remote_size),
                  remote_modified_at = COALESCE(?, remote_modified_at),
                  content_sha256 = COALESCE(?, content_sha256),
                  pushed_sha256 = COALESCE(?, pushed_sha256),
                  attempts = attempts + ?,
                  next_attempt_at = CASE
                    WHEN ? = 1 AND attempts + 1 < ? THEN datetime('now', '+' || ? || ' seconds')
                    ELSE NULL
                  END,
                  remote_missing_at = NULL,
                  synced_at = CASE WHEN ? = 'synced' THEN CURRENT_TIMESTAMP ELSE synced_at END,
                  last_seen_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
        )
        .run(
          patch.state, patch.errorCode ?? null, patch.fileId ?? null,
          remoteId, remoteVersion,
          patch.remote?.name ?? null, patch.remote?.size ?? null, patch.remote?.remoteModifiedAt ?? null,
          patch.contentSha256 ?? null, patch.pushedSha256 ?? null,
          attempts, failed ? 1 : 0, ITEM_MAX_ATTEMPTS, backoffSeconds(ITEM_BACKOFF_SECONDS, 1), patch.state,
          patch.itemId,
        );
      return;
    }

    // The WHERE clause is repeated on purpose: the unique index is partial
    // (`WHERE remote_id IS NOT NULL`, so a not-yet-pushed local file can exist
    // without one), and SQLite only matches an ON CONFLICT target to a partial
    // index when the predicate is restated. Without it every insert fails with
    // "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
    this.db.connection
      .prepare(
        `INSERT INTO document_sync_items
           (link_id, trip_id, file_id, trek_doc_uid, remote_id, remote_name, remote_version, remote_size,
            remote_modified_at, content_sha256, pushed_sha256, state, error_code, attempts, next_attempt_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 CASE WHEN ? = 1 THEN datetime('now', '+' || ? || ' seconds') ELSE NULL END,
                 CASE WHEN ? = 'synced' THEN CURRENT_TIMESTAMP ELSE NULL END)
         ON CONFLICT(link_id, remote_id) WHERE remote_id IS NOT NULL DO UPDATE SET
           state = excluded.state, error_code = excluded.error_code,
           file_id = COALESCE(excluded.file_id, document_sync_items.file_id),
           remote_version = COALESCE(excluded.remote_version, document_sync_items.remote_version),
           content_sha256 = COALESCE(excluded.content_sha256, document_sync_items.content_sha256),
           pushed_sha256 = COALESCE(excluded.pushed_sha256, document_sync_items.pushed_sha256),
           last_seen_at = CURRENT_TIMESTAMP`,
      )
      .run(
        link.id, link.trip_id, patch.fileId ?? null, patch.trekDocUid ?? newTrekDocUid(),
        remoteId, patch.remote?.name ?? null, remoteVersion, patch.remote?.size ?? null,
        patch.remote?.remoteModifiedAt ?? null, patch.contentSha256 ?? null, patch.pushedSha256 ?? null,
        patch.state, patch.errorCode ?? null, failed ? 1 : 0,
        failed ? 1 : 0, backoffSeconds(ITEM_BACKOFF_SECONDS, 1),
        patch.state,
      );
  }

  private recordLinkSuccess(link: LinkRow, cursor: string | null, state: string, errorCode: string | null): void {
    this.db.connection
      .prepare(
        `UPDATE trip_document_links
            SET remote_cursor = ?, last_sync_at = CURRENT_TIMESTAMP, last_sync_state = ?,
                last_sync_error = ?, failure_count = 0, next_attempt_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
      )
      .run(cursor, state, errorCode, link.id);
  }

  private recordLinkFailure(link: LinkRow, code: string, state = 'failed'): void {
    const failures = link.failure_count + 1;
    const wait = backoffSeconds(LINK_BACKOFF_SECONDS, failures);
    this.db.connection
      .prepare(
        `UPDATE trip_document_links
            SET last_sync_at = CURRENT_TIMESTAMP, last_sync_state = ?, last_sync_error = ?,
                failure_count = ?, next_attempt_at = datetime('now', '+' || ? || ' seconds'),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
      )
      .run(state, code, failures, wait, link.id);
  }

  // ── Conflict resolution ────────────────────────────────────────────────────

  /**
   * Resolve a conflict the way a human chose.
   *
   * `both` keeps the provider copy as a second TREK document rather than
   * overwriting either side, which is the only outcome that cannot lose work
   * and is therefore what the UI offers first.
   */
  async resolveConflict(itemId: number, keep: 'trek' | 'provider' | 'both'): Promise<boolean> {
    const item = this.db.connection
      .prepare('SELECT * FROM document_sync_items WHERE id = ?')
      .get(itemId) as Record<string, unknown> | undefined;
    if (!item || item.state !== 'conflict') return false;
    const link = this.config.getLink(Number(item.link_id));
    if (!link) return false;

    if (keep === 'trek') {
      // Forget the provider's version marker, so the next run sees no upstream
      // change and pushes TREK's copy. Clearing content_sha256 instead would do
      // the opposite: it reads as "TREK never agreed to these bytes", and the
      // provider's copy comes down over the one the user just chose to keep.
      this.db.connection
        .prepare("UPDATE document_sync_items SET state = 'pending', remote_version = NULL, error_code = NULL WHERE id = ?")
        .run(itemId);
    } else if (keep === 'provider') {
      this.db.connection
        .prepare("UPDATE document_sync_items SET state = 'pending', content_sha256 = NULL, error_code = NULL WHERE id = ?")
        .run(itemId);
    } else {
      // Detach the pairing and let the next run pull the provider copy as a new
      // document. Both versions survive, under two rows.
      this.db.connection
        .prepare("UPDATE document_sync_items SET state = 'local_deleted', remote_id = NULL, error_code = NULL WHERE id = ?")
        .run(itemId);
    }
    await this.syncLink(link, { full: true });
    return true;
  }

  /**
   * The documents a person has to decide about: conflicts, refusals and things
   * that vanished upstream. Deliberately not "everything not synced" — a row
   * waiting for its turn is not a problem anyone should be shown.
   */
  issues(tripId: number): Array<Record<string, unknown>> {
    return this.db.connection
      .prepare(
        `SELECT i.id, i.state, i.error_code, i.remote_name, i.remote_missing_at, f.original_name AS file_name
           FROM document_sync_items i
           LEFT JOIN trip_files f ON f.id = i.file_id
          WHERE i.trip_id = ?
            AND i.state IN ('conflict', 'rejected_type', 'too_large', 'remote_missing', 'error')
          ORDER BY i.id DESC
          LIMIT 200`,
      )
      .all(tripId) as Array<Record<string, unknown>>;
  }

  /** Per-trip view for the UI: what is synced, what needs attention. */
  status(tripId: number): Record<string, unknown> {
    const links = this.config.listLinks(tripId);
    const counts = this.db.connection
      .prepare('SELECT state, COUNT(*) AS n FROM document_sync_items WHERE trip_id = ? GROUP BY state')
      .all(tripId) as Array<{ state: string; n: number }>;
    return {
      links: links.map((l) => this.config.publicLink(l, null)),
      items: Object.fromEntries(counts.map((c) => [c.state, c.n])),
    };
  }
}

function isTransfer(action: PlanAction): boolean {
  return action.kind === 'pull' || action.kind === 'pull_update' || action.kind === 'push' || action.kind === 'push_update';
}
