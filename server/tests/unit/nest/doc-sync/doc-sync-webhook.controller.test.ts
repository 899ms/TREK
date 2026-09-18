import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import type { Request } from 'express';

// Nothing here touches SQLite; the stub keeps the import chain from opening a
// database and running 238 migrations for a handler that never queries one.
vi.mock('../../../../src/db/database', () => ({
  db: {},
  closeDb: () => {},
  reinitialize: () => {},
  getPlaceWithTags: () => null,
  canAccessTrip: () => undefined,
  isOwner: () => false,
}));

import { DocSyncWebhookController } from '../../../../src/nest/doc-sync/doc-sync-webhook.controller';
import type { DocSyncConfigService, LinkRow } from '../../../../src/nest/doc-sync/doc-sync-config.service';
import type { DocSyncService } from '../../../../src/nest/doc-sync/doc-sync.service';

/**
 * The webhook endpoint, with both services stubbed.
 *
 * It is the only route in TREK a stranger on the internet can reach with a
 * guessed URL, so what matters is what it does NOT do: it never says whether a
 * token exists, never says whether a secret matched, and never acts on the
 * payload. Every case below therefore asserts two things — the answer, which is
 * always the same, and whether a run was scheduled, which is the only place the
 * decision is visible at all.
 *
 * No timers and no clock: the signature is computed here from a fixed id and
 * timestamp, exactly as the provider would.
 */

const SECRET = 'M7dQ2vLp5rTn8kYw1xZc4bJh';

const link = (over: Partial<LinkRow> = {}): LinkRow => ({
  id: 4,
  trip_id: 1,
  connection_id: 2,
  provider_id: 'papra',
  remote_scope_key: 'tag:1',
  remote_root_id: '1',
  remote_root_path: '/TREK/japan',
  remote_label: 'Japan 2026',
  direction: 'both',
  delete_policy: 'unlink',
  conflict_policy: 'manual',
  sync_enabled: 1,
  webhook_token: 'tok-live',
  webhook_secret: 'enc:v1:whatever',
  webhook_subscription_id: null,
  remote_cursor: null,
  last_sync_at: null,
  last_sync_state: 'never',
  last_sync_error: null,
  failure_count: 0,
  next_attempt_at: null,
  ...over,
});

const config = {
  getLinkByToken: vi.fn((token: string) => (token === 'tok-live' ? link() : undefined)),
  webhookSecret: vi.fn(() => SECRET),
};

const sync = {
  syncLink: vi.fn(async (_link: LinkRow) => ({ state: 'ok', pulled: 0, pushed: 0, conflicts: 0, missing: 0 })),
};

const controller = new DocSyncWebhookController(
  config as unknown as DocSyncConfigService,
  sync as unknown as DocSyncService,
);

/** Only what the handler reads: headers, the parsed body, and the raw bytes. */
function makeReq(headers: Record<string, string> = {}, opts: { body?: unknown; rawBody?: Buffer | undefined } = {}): Request {
  return {
    headers,
    body: opts.body,
    rawBody: opts.rawBody,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

const WEBHOOK_ID = 'msg_2f8a';
const WEBHOOK_TS = '1758200000';

function sign(payload: string, secret = SECRET, id = WEBHOOK_ID, ts = WEBHOOK_TS): string {
  return crypto.createHmac('sha256', Buffer.from(secret)).update(`${id}.${ts}.${payload}`).digest('base64');
}

function papraReq(payload: string, signature: string, sent = payload): Request {
  return makeReq(
    { 'webhook-id': WEBHOOK_ID, 'webhook-timestamp': WEBHOOK_TS, 'webhook-signature': `v1,${signature}` },
    { rawBody: Buffer.from(sent, 'utf8') },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  config.getLinkByToken.mockImplementation((token: string) => (token === 'tok-live' ? link() : undefined));
  config.webhookSecret.mockReturnValue(SECRET);
});

describe('an unknown token', () => {
  it('answers as if it were known, so nobody can enumerate which tokens exist', () => {
    expect(controller.nudge('tok-guessed', makeReq())).toEqual({ received: true });
  });

  it('schedules no run', () => {
    controller.nudge('tok-guessed', makeReq());
    expect(sync.syncLink).not.toHaveBeenCalled();
  });
});

describe('a binding whose sync is switched off', () => {
  it('is left alone, and says nothing about it', () => {
    config.getLinkByToken.mockReturnValue(link({ sync_enabled: 0 }));
    expect(controller.nudge('tok-live', makeReq({ 'x-trek-docsync-secret': SECRET }))).toEqual({ received: true });
    expect(sync.syncLink).not.toHaveBeenCalled();
  });
});

describe('a shared-secret header', () => {
  it('triggers the run when it matches', () => {
    controller.nudge('tok-live', makeReq({ 'x-trek-docsync-secret': SECRET }));
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
    expect(sync.syncLink.mock.calls[0][0]).toMatchObject({ id: 4 });
  });

  it('triggers nothing when it is wrong, and the answer looks identical', () => {
    const wrong = `${SECRET.slice(0, -1)}X`;
    expect(controller.nudge('tok-live', makeReq({ 'x-trek-docsync-secret': wrong }))).toEqual({ received: true });
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('triggers nothing when the header is missing altogether', () => {
    controller.nudge('tok-live', makeReq());
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('is not demanded from a binding that carries no secret — the token alone authenticates there', () => {
    config.webhookSecret.mockReturnValue('');
    controller.nudge('tok-live', makeReq());
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });
});

describe('a Papra standard-webhooks signature', () => {
  const payload = JSON.stringify({ event: 'document.created', documentId: 'doc_1' });

  it('triggers the run when it covers the bytes that arrived', () => {
    controller.nudge('tok-live', papraReq(payload, sign(payload)));
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });

  it('triggers nothing when the payload was altered after it was signed', () => {
    const tampered = JSON.stringify({ event: 'document.created', documentId: 'doc_999' });
    expect(controller.nudge('tok-live', papraReq(payload, sign(payload), tampered))).toEqual({ received: true });
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('triggers nothing when the signature was made with another secret', () => {
    controller.nudge('tok-live', papraReq(payload, sign(payload, 'someone-elses-secret-value')));
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('triggers nothing when the id or timestamp does not match what was signed', () => {
    const req = makeReq(
      { 'webhook-id': 'msg_other', 'webhook-timestamp': WEBHOOK_TS, 'webhook-signature': `v1,${sign(payload)}` },
      { rawBody: Buffer.from(payload, 'utf8') },
    );
    controller.nudge('tok-live', req);
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('accepts a header carrying several signatures, as a key rotation sends', () => {
    const req = makeReq(
      {
        'webhook-id': WEBHOOK_ID,
        'webhook-timestamp': WEBHOOK_TS,
        'webhook-signature': `v1,${sign(payload, 'the-previous-secret')} v1,${sign(payload)}`,
      },
      { rawBody: Buffer.from(payload, 'utf8') },
    );
    controller.nudge('tok-live', req);
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });

  it('verifies against the parsed body when a mount left no raw bytes behind', () => {
    const body = { event: 'document.created', documentId: 'doc_1' };
    const req = makeReq(
      { 'webhook-id': WEBHOOK_ID, 'webhook-timestamp': WEBHOOK_TS, 'webhook-signature': `v1,${sign(JSON.stringify(body))}` },
      { body },
    );
    controller.nudge('tok-live', req);
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });

  it('is ignored when the timestamp header is missing, rather than verified without it', () => {
    const req = makeReq(
      { 'webhook-id': WEBHOOK_ID, 'webhook-signature': `v1,${sign(payload)}` },
      { rawBody: Buffer.from(payload, 'utf8') },
    );
    controller.nudge('tok-live', req);
    expect(sync.syncLink).not.toHaveBeenCalled();
  });
});

describe('a credential of the wrong length', () => {
  // crypto.timingSafeEqual throws on buffers of unequal length, so a one-byte
  // header would turn into a 500 that tells a prober the secret is longer than
  // what they sent.
  it('is rejected rather than thrown over, whether it arrives as a header or as a signature', () => {
    expect(() => controller.nudge('tok-live', makeReq({ 'x-trek-docsync-secret': 'a' }))).not.toThrow();
    expect(() =>
      controller.nudge('tok-live', papraReq('{}', 'short')),
    ).not.toThrow();
    expect(sync.syncLink).not.toHaveBeenCalled();
  });

  it('is rejected the same way when it is longer than the stored secret', () => {
    expect(() => controller.nudge('tok-live', makeReq({ 'x-trek-docsync-secret': `${SECRET}extra` }))).not.toThrow();
    expect(sync.syncLink).not.toHaveBeenCalled();
  });
});
