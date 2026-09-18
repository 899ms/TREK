import { Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import crypto from 'crypto';
import { Public } from '../auth/public.decorator';
import { DocSyncConfigService } from './doc-sync-config.service';
import { DocSyncService } from './doc-sync.service';

/**
 * `/api/docsync/webhook/:token` — the one endpoint a provider calls.
 *
 * Deliberately the thinnest thing in the domain. It answers 200 and schedules a
 * run; it never reads the body as truth. Every provider here has a different
 * payload, none of them signs it in a way all five share, Paperless gives its
 * webhook five seconds before it retries, and Nextcloud's payload carries a
 * path that is different for every member of a share. Treating any of that as
 * data would mean trusting an unauthenticated stranger's description of what
 * changed. So the webhook means exactly one thing: look now.
 *
 * `@Public` because a provider cannot hold a TREK session. The token in the URL
 * is the authentication, one per binding, so a leaked URL can only ever nudge
 * the one trip it belongs to — and nudging is all it can do. Where the provider
 * supports it, a shared secret is checked as well.
 */
@Controller('api/docsync/webhook')
export class DocSyncWebhookController {
  constructor(
    private readonly config: DocSyncConfigService,
    private readonly sync: DocSyncService,
  ) {}

  @Post(':token')
  @Public('A provider cannot hold a TREK session; the per-link token in the URL is the authentication, and the call can only ever trigger a sync run.')
  @HttpCode(200)
  nudge(@Param('token') token: string, @Req() req: Request) {
    const link = this.config.getLinkByToken(token);
    // Always 200, even for an unknown token: a 404 here would let anyone probe
    // which tokens exist, and a provider that gets an error will retry anyway.
    if (!link || link.sync_enabled !== 1) return { received: true };

    const secret = this.config.webhookSecret(link);
    if (secret && !this.secretMatches(req, secret)) return { received: true };

    // Fire and forget. Paperless allows five seconds before it counts the call
    // as failed and retries, and a sync run takes longer than that whenever
    // there is anything to do.
    void this.sync.syncLink(link);
    return { received: true };
  }

  /**
   * Accept either a plain shared-secret header (Paperless workflows, Nextcloud
   * `authMethod: header`) or Papra's standard-webhooks HMAC. Compared in
   * constant time, and a mismatch is silently ignored rather than reported, so
   * the endpoint tells a prober nothing either way.
   */
  private secretMatches(req: Request, secret: string): boolean {
    const header = req.get('x-trek-docsync-secret');
    if (header && timingSafeEqualStr(header, secret)) return true;

    const sig = req.get('webhook-signature');
    const id = req.get('webhook-id');
    const ts = req.get('webhook-timestamp');
    if (sig && id && ts) {
      const raw = (req as Request & { rawBody?: Buffer }).rawBody;
      const body = raw ? raw.toString('utf8') : JSON.stringify(req.body ?? {});
      const expected = crypto
        .createHmac('sha256', Buffer.from(secret))
        .update(`${id}.${ts}.${body}`)
        .digest('base64');
      for (const part of sig.split(' ')) {
        const value = part.startsWith('v1,') ? part.slice(3) : part;
        if (timingSafeEqualStr(value, expected)) return true;
      }
    }
    return false;
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
