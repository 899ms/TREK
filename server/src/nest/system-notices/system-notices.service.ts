import { Injectable } from '@nestjs/common';
import type { SystemNoticeDto } from '@trek/shared';
import { getActiveNoticesFor, dismissNotice } from '../../systemNotices/service';
import { AddonsService } from '../addons/addons.service';
import { RuntimeEnvService } from '../app-config/runtime-env.service';

/**
 * Thin Nest wrapper around the existing system-notices service. The condition
 * evaluation, version gating, sorting and dismissal persistence all stay in the
 * upstream service — this only adapts it for DI (and threads the injected
 * addon-enablement check into the condition context, so the plain modules
 * underneath carry no bridge import), so behaviour is unchanged.
 */
@Injectable()
export class SystemNoticesService {
  constructor(
    private readonly addons: AddonsService,
    private readonly env: RuntimeEnvService,
  ) {}

  /**
   * `supports` names the layouts the calling bundle can draw. A notice with a release
   * block is held back from a bundle that does not name `release`: after an update the
   * service worker keeps serving the previous bundle until the new one is installed,
   * and that bundle would draw the release notice as bare keys and let the reader
   * dismiss it for good, because the dismissal is recorded against the server's
   * version. A bundle that never sends the parameter loses only the notice it could
   * not read anyway and gets it after the reload. Nothing is spent by holding it back:
   * a notice is used up by a dismissal and by nothing else.
   */
  getActiveFor(userId: number, supports: ReadonlySet<string> = new Set()): SystemNoticeDto[] {
    const notices = getActiveNoticesFor(
      userId,
      (addonId) => this.addons.isAddonEnabled(addonId),
      this.env.isManaged(),
    ) as SystemNoticeDto[];
    return supports.has('release') ? notices : notices.filter(n => !n.release);
  }

  dismiss(userId: number, noticeId: string): boolean {
    return dismissNotice(userId, noticeId);
  }
}
