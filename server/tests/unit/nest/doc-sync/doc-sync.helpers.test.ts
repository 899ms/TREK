import { describe, expect, it } from 'vitest';
import {
  backoffSeconds,
  isAllowedByOperator,
  isBlockedName,
  planReconcile,
  sanitizeIncomingName,
  snapshotHash,
  type LocalDocument,
  type SyncItemState,
} from '../../../../src/nest/doc-sync/doc-sync.helpers';
import type { RemoteDocument } from '../../../../src/nest/doc-sync/document-provider';

/**
 * The planner decides everything that matters about two-way sync, and it does
 * it without a database, a container or a network. That is the point of having
 * it: the cases that are painful to reproduce against a live provider — an
 * unmounted share, a rename with no stable id, TREK's own write echoing back —
 * are cheap to state here as data.
 */

const remote = (over: Partial<RemoteDocument> = {}): RemoteDocument => ({
  remoteId: 'r1',
  name: 'boarding.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  remoteVersion: 'v1',
  contentHash: null,
  remoteModifiedAt: '2026-09-18T10:00:00Z',
  isDeleted: false,
  ...over,
});

const local = (over: Partial<LocalDocument> = {}): LocalDocument => ({
  fileId: 1,
  name: 'boarding.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  sha256: 'aaa',
  deletedAt: null,
  ...over,
});

const item = (over: Partial<SyncItemState> = {}): SyncItemState => ({
  id: 10,
  fileId: 1,
  trekDocUid: 'uid-1',
  remoteId: 'r1',
  remoteVersion: 'v1',
  remoteName: 'boarding.pdf',
  contentSha256: 'aaa',
  pushedSha256: null,
  state: 'synced',
  attempts: 0,
  nextAttemptAt: null,
  remoteMissingAt: null,
  ...over,
});

const plan = (over: Partial<Parameters<typeof planReconcile>[0]> = {}) =>
  planReconcile({
    items: [],
    remote: [],
    local: [],
    direction: 'both',
    remoteTruncated: false,
    remoteUnchanged: false,
    stableRemoteIds: true,
    maxAttempts: 6,
    ...over,
  });

describe('planReconcile', () => {
  it('pulls a document that only exists at the provider', () => {
    const p = plan({ remote: [remote()] });
    expect(p.actions).toEqual([{ kind: 'pull', remote: remote(), itemId: null }]);
  });

  it('pushes a document that only exists in TREK', () => {
    const p = plan({ local: [local()] });
    expect(p.actions).toEqual([{ kind: 'push', local: local(), itemId: null, remoteId: null }]);
  });

  it('does nothing when both sides match', () => {
    const p = plan({ items: [item()], remote: [remote()], local: [local()] });
    expect(p.actions).toEqual([{ kind: 'touch', itemId: 10, remote: remote() }]);
  });

  it('pulls an update when only the provider moved on', () => {
    const p = plan({ items: [item()], remote: [remote({ remoteVersion: 'v2' })], local: [local()] });
    expect(p.actions[0].kind).toBe('pull_update');
  });

  it('pushes an update when only TREK moved on', () => {
    const p = plan({ items: [item()], remote: [remote()], local: [local({ sha256: 'bbb' })] });
    expect(p.actions[0]).toMatchObject({ kind: 'push_update', remoteId: 'r1' });
  });

  it('reports a conflict when both sides moved on', () => {
    const p = plan({
      items: [item()],
      remote: [remote({ remoteVersion: 'v2' })],
      local: [local({ sha256: 'bbb' })],
    });
    expect(p.actions[0].kind).toBe('conflict');
  });

  /**
   * The echo guard. A provider reports TREK's own upload as a change, and
   * without this the file would be pulled back down, re-uploaded, and bounce
   * forever. It compares content rather than timestamps on purpose: a time
   * window misfires on any clock skew between TREK and a NAS.
   */
  it('treats a change whose content matches TREK\'s own push as no change', () => {
    const p = plan({
      items: [item({ pushedSha256: 'aaa' })],
      remote: [remote({ remoteVersion: 'v2', contentHash: 'aaa' })],
      local: [local()],
    });
    expect(p.actions[0].kind).toBe('touch');
  });

  it('still sees a real foreign change when the content differs from what was pushed', () => {
    const p = plan({
      items: [item({ pushedSha256: 'aaa' })],
      remote: [remote({ remoteVersion: 'v2', contentHash: 'ccc' })],
      local: [local()],
    });
    expect(p.actions[0].kind).toBe('pull_update');
  });

  /**
   * An unmounted share and a revoked token both answer with a short listing.
   * Reading that as a mass deletion would empty a trip, so the run refuses
   * everything rather than acting on a listing it cannot trust.
   */
  it('refuses the run when most known documents vanish at once', () => {
    const items = Array.from({ length: 10 }, (_, i) => item({ id: i, remoteId: `r${i}`, fileId: i }));
    const p = plan({ items, remote: [remote({ remoteId: 'r0' })], local: [] });
    expect(p.massDeleteGuardTripped).toBe(true);
    expect(p.actions.filter((a) => a.kind === 'mark_remote_missing')).toHaveLength(0);
  });

  it('records a single disappearance without acting on it', () => {
    const items = Array.from({ length: 10 }, (_, i) => item({ id: i, remoteId: `r${i}`, fileId: i }));
    const stillThere = items.slice(1).map((i) => remote({ remoteId: i.remoteId as string }));
    const p = plan({ items, remote: stillThere, local: [] });
    expect(p.massDeleteGuardTripped).toBe(false);
    expect(p.actions.filter((a) => a.kind === 'mark_remote_missing')).toHaveLength(1);
  });

  it('never marks anything missing from a truncated listing', () => {
    const items = Array.from({ length: 10 }, (_, i) => item({ id: i, remoteId: `r${i}`, fileId: i }));
    const p = plan({ items, remote: [], local: [], remoteTruncated: true });
    expect(p.actions.filter((a) => a.kind === 'mark_remote_missing')).toHaveLength(0);
  });

  /**
   * Synology FileStation has no stable file id, so a rename upstream looks like
   * a deletion plus a new file. Re-pairing on content avoids downloading the
   * same bytes again and leaving a phantom behind.
   */
  it('re-pairs a renamed document when the provider has no stable ids', () => {
    const p = plan({
      items: [item({ remoteId: '/trek/old.pdf', contentSha256: 'hash-x' })],
      remote: [remote({ remoteId: '/trek/new.pdf', contentHash: 'hash-x' })],
      local: [local()],
      stableRemoteIds: false,
    });
    expect(p.actions.some((a) => a.kind === 'pull')).toBe(false);
    expect(p.actions.some((a) => a.kind === 'touch')).toBe(true);
  });

  /**
   * Which side renamed is decided against the name both sides last agreed on.
   * Reading a `both` binding as "TREK always wins" renamed the provider's copy
   * back every time somebody tidied a folder, which is the opposite of what a
   * two-way sync is for.
   */
  it('renames at the provider when TREK is the side that renamed', () => {
    const p = plan({
      items: [item({ remoteName: 'old.pdf' })],
      remote: [remote({ name: 'old.pdf' })],
      local: [local({ name: 'new.pdf' })],
    });
    expect(p.actions[0]).toMatchObject({ kind: 'rename_remote', name: 'new.pdf' });
  });

  it('renames in TREK when the provider is the side that renamed', () => {
    const p = plan({
      items: [item({ remoteName: 'old.pdf' })],
      remote: [remote({ name: 'new-upstream.pdf' })],
      local: [local({ name: 'old.pdf' })],
    });
    expect(p.actions[0]).toMatchObject({ kind: 'rename_local', name: 'new-upstream.pdf' });
  });

  it('asks a person when both sides renamed', () => {
    const p = plan({
      items: [item({ remoteName: 'old.pdf' })],
      remote: [remote({ name: 'theirs.pdf' })],
      local: [local({ name: 'mine.pdf' })],
    });
    expect(p.actions[0].kind).toBe('conflict');
  });

  it('does nothing about a name difference it cannot arbitrate', () => {
    // No stored name: a row from before the column existed, or a pairing made
    // in the same run. Guessing here would rename somebody's file.
    const p = plan({
      items: [item({ remoteName: null })],
      remote: [remote({ name: 'a.pdf' })],
      local: [local({ name: 'b.pdf' })],
    });
    expect(p.actions[0].kind).toBe('touch');
  });

  it('honours a pull-only binding by never pushing', () => {
    const p = plan({ local: [local()], remote: [], direction: 'pull' });
    expect(p.actions).toHaveLength(0);
  });

  it('honours a push-only binding by never pulling', () => {
    const p = plan({ remote: [remote()], direction: 'push' });
    expect(p.actions).toHaveLength(0);
  });

  it('does not re-upload a document whose remote copy is merely unlisted', () => {
    // The row has a remoteId but the listing does not contain it. Re-pushing
    // here would duplicate the whole trip upstream every time a listing fails.
    const p = plan({ items: [item()], remote: [], local: [local()] });
    expect(p.actions.some((a) => a.kind === 'push')).toBe(false);
  });

  it('reports a local deletion instead of acting on it', () => {
    const p = plan({ items: [item()], remote: [remote()], local: [local({ deletedAt: '2026-09-18' })] });
    expect(p.actions[0]).toMatchObject({ kind: 'local_deleted', remoteId: 'r1' });
  });

  it('ignores a provider-side tombstone rather than pulling it', () => {
    const p = plan({ remote: [remote({ isDeleted: true })] });
    expect(p.actions).toHaveLength(0);
  });
});

describe('sanitizeIncomingName', () => {
  it('strips directory traversal from both path flavours', () => {
    expect(sanitizeIncomingName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeIncomingName('C:\\Windows\\system32\\evil.pdf')).toBe('evil.pdf');
  });

  it('removes control characters and leading dots', () => {
    expect(sanitizeIncomingName('.hidden\u0000.pdf')).toBe('hidden.pdf');
  });

  it('replaces characters that are illegal in a filename', () => {
    expect(sanitizeIncomingName('a:b*c?.pdf')).toBe('a_b_c_.pdf');
  });

  it('never returns an empty name', () => {
    expect(sanitizeIncomingName('...')).toBe('document');
    expect(sanitizeIncomingName('')).toBe('document');
  });
});

describe('isBlockedName', () => {
  it('blocks the extensions TREK serves inline', () => {
    // A download is served with a Content-Type derived from the extension, so
    // these would be stored XSS if a provider folder could introduce them.
    expect(isBlockedName('map.svg')).toBe(true);
    expect(isBlockedName('page.html')).toBe(true);
    expect(isBlockedName('run.exe')).toBe(true);
  });

  it('allows ordinary documents', () => {
    expect(isBlockedName('boarding.pdf')).toBe(false);
  });
});

describe('isAllowedByOperator', () => {
  it('honours the wildcard', () => {
    expect(isAllowedByOperator('x.pdf', '*')).toBe(true);
  });

  it('matches case-insensitively and tolerates dots and spaces in the list', () => {
    expect(isAllowedByOperator('x.PDF', ' .pdf , jpg ')).toBe(true);
  });

  it('refuses a file with no extension even under the wildcard', () => {
    expect(isAllowedByOperator('README', '*')).toBe(false);
  });
});

describe('snapshotHash', () => {
  it('is stable for the same field order and differs when a field changes', () => {
    expect(snapshotHash(['a', 1, null])).toBe(snapshotHash(['a', 1, null]));
    expect(snapshotHash(['a', 1, null])).not.toBe(snapshotHash(['a', 2, null]));
  });

  it('does not collide when field boundaries shift', () => {
    // Joining without a separator would make ['ab','c'] and ['a','bc'] equal.
    expect(snapshotHash(['ab', 'c'])).not.toBe(snapshotHash(['a', 'bc']));
  });
});

describe('backoffSeconds', () => {
  it('saturates at the end of the curve instead of running off it', () => {
    expect(backoffSeconds([60, 300], 1)).toBe(60);
    expect(backoffSeconds([60, 300], 2)).toBe(300);
    expect(backoffSeconds([60, 300], 99)).toBe(300);
  });

  it('treats a zero failure count as the first step', () => {
    expect(backoffSeconds([60, 300], 0)).toBe(60);
  });
});

/**
 * The retry limit, read back out.
 *
 * Found in a live database at 46 attempts against a limit of 6: the counter and
 * the backoff were written on every failure and never consulted when planning
 * the next run, so a document a provider refuses — a file it reads as corrupt,
 * a type it will not take, a full quota — was re-uploaded on every cron tick
 * for as long as it existed.
 */
describe('planReconcile > shelving a row that keeps failing', () => {
  const failing = (over: Partial<SyncItemState> = {}) =>
    item({ id: 20, remoteId: null, remoteVersion: null, remoteName: null, contentSha256: null, state: 'error', ...over });

  it('re-plans a failed push while attempts are left', () => {
    const p = plan({
      items: [failing({ attempts: 2 })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
    });
    expect(p.actions.map(a => a.kind)).toContain('push');
  });

  it('stops re-planning once the attempts are used up', () => {
    const p = plan({
      items: [failing({ attempts: 6 })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
    });
    expect(p.actions.map(a => a.kind)).not.toContain('push');
  });

  it('stops re-planning past the limit as well, not only exactly at it', () => {
    const p = plan({
      items: [failing({ attempts: 46 })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
    });
    expect(p.actions).toEqual([]);
  });

  it('holds off while the backoff window is still open', () => {
    const p = plan({
      items: [failing({ attempts: 1, nextAttemptAt: '2030-01-01 00:00:00' })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
      now: '2026-01-01 00:00:00',
    });
    expect(p.actions).toEqual([]);
  });

  it('tries again once the backoff window has passed', () => {
    const p = plan({
      items: [failing({ attempts: 1, nextAttemptAt: '2026-01-01 00:00:00' })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
      now: '2026-06-01 00:00:00',
    });
    expect(p.actions.map(a => a.kind)).toContain('push');
  });

  it('leaves a healthy row alone however high its old attempt count is', () => {
    // attempts is not reset on success, so a row that failed twice and then
    // went through must not be mistaken for a shelved one.
    const p = plan({
      items: [item({ attempts: 9, state: 'synced' })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v2' })],
      local: [local({ fileId: 1 })],
      maxAttempts: 6,
    });
    expect(p.actions.map(a => a.kind)).toContain('pull_update');
  });

  it('leaves a shelved row alone even when its provider copy is gone too', () => {
    // "Vanished" is only said about a row that was synced last run, and a row is
    // only shelved while it is in error, so these two never describe the same
    // row — nothing is planned for it either way.
    const p = plan({
      items: [item({ id: 30, attempts: 99, state: 'error', remoteId: 'r-gone' })],
      remote: [],
      local: [],
      maxAttempts: 6,
    });
    expect(p.actions).toEqual([]);
  });
});

/**
 * An unchanged upstream, which the WebDAV adapters report by NOT fetching.
 *
 * Their root-ETag probe answers "nothing has happened here" in one request, and
 * they then return an empty document list. The core ignored the flag and read
 * that emptiness as a folder somebody had emptied: from the third run of every
 * idle Nextcloud or OpenCloud binding onward, every run ended in the mass-delete
 * guard — `partial`, `missing: 6`, forever, until the failure counter opened the
 * circuit and the scheduler dropped the binding entirely. Reproduced against a
 * live Nextcloud before this was written.
 */
describe('planReconcile > upstream reported as unchanged', () => {
  it('does not read an empty listing as a mass deletion', () => {
    const p = plan({
      items: [item({ id: 1, remoteId: 'r1' }), item({ id: 2, fileId: 2, remoteId: 'r2' })],
      remote: [],
      local: [local({ fileId: 1 }), local({ fileId: 2 })],
      remoteUnchanged: true,
    });
    expect(p.massDeleteGuardTripped).toBe(false);
    expect(p.missingCount).toBe(0);
  });

  it('marks nothing as gone from the provider', () => {
    const p = plan({
      items: [item({ id: 1, remoteId: 'r1' })],
      remote: [],
      local: [local({ fileId: 1 })],
      remoteUnchanged: true,
    });
    expect(p.actions.map(a => a.kind)).not.toContain('mark_remote_missing');
  });

  it('still pushes a document TREK gained in the meantime', () => {
    const p = plan({
      items: [],
      remote: [],
      local: [local({ fileId: 7, name: 'new.pdf' })],
      remoteUnchanged: true,
    });
    expect(p.actions).toEqual([{ kind: 'push', local: expect.objectContaining({ fileId: 7 }), itemId: null, remoteId: null }]);
  });

  it('still reports a document TREK deleted in the meantime', () => {
    const p = plan({
      items: [item({ id: 5, fileId: 3, remoteId: 'r3' })],
      remote: [],
      local: [local({ fileId: 3, deletedAt: '2026-09-18 10:00:00' })],
      remoteUnchanged: true,
    });
    expect(p.actions).toEqual([{ kind: 'local_deleted', itemId: 5, remoteId: 'r3' }]);
  });

  it('does not push out of a pull-only binding', () => {
    const p = plan({
      items: [],
      remote: [],
      local: [local({ fileId: 7 })],
      direction: 'pull',
      remoteUnchanged: true,
    });
    expect(p.actions).toEqual([]);
  });

  it('plans nothing at all when neither side moved', () => {
    const p = plan({
      items: [item({ id: 1, remoteId: 'r1' })],
      remote: [],
      local: [local({ fileId: 1 })],
      remoteUnchanged: true,
    });
    expect(p.actions).toEqual([]);
  });

  it('works the old way when the provider does report a change', () => {
    // The same shape with the flag off is exactly the case that used to break:
    // an empty listing then really does mean everything vanished.
    const many = Array.from({ length: 6 }, (_, i) =>
      item({ id: i + 1, fileId: i + 1, remoteId: `r${i + 1}` }));
    const p = plan({
      items: many,
      remote: [],
      local: many.map((_, i) => local({ fileId: i + 1 })),
      remoteUnchanged: false,
    });
    expect(p.massDeleteGuardTripped).toBe(true);
  });
});

/**
 * A download that failed once must be tried again.
 *
 * `pull()` records the failure together with the remote's current version, so
 * the next run computed `remoteChanged = false`; with no local file the other
 * branches had nothing to compare and the row fell through to `touch`. Nothing
 * in the planner ever planned a second attempt, so the document never arrived,
 * the attempt counter never grew past one, and "Sync now" produced the same
 * plan. The asymmetry was visible in these tests: a failed PUSH was covered,
 * because the TREK-only branch re-plans it; a failed PULL was not.
 */
describe('planReconcile > a pairing whose download never landed', () => {
  const failedPull = (over: Partial<SyncItemState> = {}) =>
    item({ id: 40, fileId: null, remoteId: 'r1', remoteVersion: 'v1', contentSha256: null, state: 'error', ...over });

  it('plans another download', () => {
    const p = plan({
      items: [failedPull()],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [],
    });
    expect(p.actions).toEqual([{ kind: 'pull_update', remote: expect.objectContaining({ remoteId: 'r1' }), itemId: 40 }]);
  });

  it('does not on a push-only binding, which has no business pulling', () => {
    const p = plan({
      items: [failedPull()],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [],
      direction: 'push',
    });
    expect(p.actions.map(a => a.kind)).not.toContain('pull_update');
  });

  it('leaves a rejected type alone: that answer does not change by trying again', () => {
    const p = plan({
      items: [failedPull({ state: 'rejected_type' })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [],
    });
    expect(p.actions.map(a => a.kind)).not.toContain('pull_update');
  });

  it('leaves an oversized document alone for the same reason', () => {
    const p = plan({
      items: [failedPull({ state: 'too_large' })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [],
    });
    expect(p.actions.map(a => a.kind)).not.toContain('pull_update');
  });

  it('does try a rejected one again once the document upstream changes', () => {
    const p = plan({
      items: [failedPull({ state: 'rejected_type' })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v2' })],
      local: [],
    });
    expect(p.actions.map(a => a.kind)).toContain('pull_update');
  });

  it('gives up with the rest once the attempts are spent', () => {
    const p = plan({
      items: [failedPull({ attempts: 6 })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [],
      maxAttempts: 6,
    });
    expect(p.actions).toEqual([]);
  });

  it('leaves a healthy pairing on touch, not on a pointless re-download', () => {
    const p = plan({
      items: [item({ remoteId: 'r1', remoteVersion: 'v1' })],
      remote: [remote({ remoteId: 'r1', remoteVersion: 'v1' })],
      local: [local({ fileId: 1 })],
    });
    expect(p.actions.map(a => a.kind)).toEqual(['touch']);
  });
});

/**
 * Names are compared through the same sanitiser the local one went through.
 *
 * A provider name TREK had to clean up — a slash, a control character, a
 * leading dot — otherwise reads as "TREK renamed this document" on the very
 * next run, and the provider's copy is renamed to the cleaned version without
 * anybody asking for it.
 */
describe('planReconcile > a provider name TREK had to clean up', () => {
  it('does not read the cleaning as a local rename', () => {
    const p = plan({
      items: [item({ remoteName: 'a/b.pdf', contentSha256: 'aaa' })],
      remote: [remote({ remoteId: 'r1', name: 'a/b.pdf', remoteVersion: 'v1' })],
      local: [local({ fileId: 1, name: 'b.pdf' })],   // what sanitizeIncomingName made of it
    });
    expect(p.actions.map(a => a.kind)).toEqual(['touch']);
  });

  it('still follows a real rename at the provider', () => {
    const p = plan({
      items: [item({ remoteName: 'b.pdf', contentSha256: 'aaa' })],
      remote: [remote({ remoteId: 'r1', name: 'invoice.pdf', remoteVersion: 'v1' })],
      local: [local({ fileId: 1, name: 'b.pdf' })],
    });
    expect(p.actions.map(a => a.kind)).toEqual(['rename_local']);
  });
});
