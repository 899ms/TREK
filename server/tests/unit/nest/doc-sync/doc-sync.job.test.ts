/**
 * The scheduling shell around document sync, built with `new` and plain mocks:
 * no container, no timer, no provider.
 *
 * What the job itself decides is small, and all of it is the kind that breaks
 * silently. The addon gate and the kill switch are re-read per tick, which is
 * the promise the docblock makes an admin ("toggle it and it takes effect")
 * and the only thing that makes the difference between this job and the
 * Dawarich one visible. The interval is typed by a human into app_settings, so
 * '5' and '999999' both have to land somewhere the cron parser accepts. And one
 * unreachable NAS must not take the other trips' bindings down with it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const log = vi.hoisted(() => ({
  LOG_LEVEL: 'error',
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn(),
}));
vi.mock('../../../../src/nest/audit/audit-log.logger', () => log);

import { ADDON_IDS } from '../../../../src/addons';
import { DocSyncJob } from '../../../../src/nest/doc-sync/doc-sync.job';
import { SETTING_POLL_INTERVAL, SETTING_SYNC_ENABLED } from '../../../../src/nest/doc-sync/doc-sync.constants';
import type { DocSyncConfigService, LinkRow } from '../../../../src/nest/doc-sync/doc-sync-config.service';
import type { DocSyncService } from '../../../../src/nest/doc-sync/doc-sync.service';
import type { AddonsService } from '../../../../src/nest/addons/addons.service';
import type { DatabaseService } from '../../../../src/nest/database/database.service';
import type { CronRegistrarService } from '../../../../src/nest/scheduling/cron-registrar.service';

const link = (id: number): LinkRow => ({ id, provider_id: 'paperless' } as LinkRow);

const RUN = { state: 'ok', pulled: 0, pushed: 0, conflicts: 0, missing: 0 };

interface Setup {
  /** Absent means no app_settings row at all, which is the shipped state. */
  interval?: string;
  killSwitch?: string;
  addonOn: boolean;
  registrarEnabled: boolean;
  links: LinkRow[];
  orphaned: number;
}

function makeJob(over: Partial<Setup> = {}) {
  const setup: Setup = { addonOn: true, registrarEnabled: true, links: [], orphaned: 0, ...over };

  const settings = new Map<string, string>();
  if (setup.interval !== undefined) settings.set(SETTING_POLL_INTERVAL, setup.interval);
  if (setup.killSwitch !== undefined) settings.set(SETTING_SYNC_ENABLED, setup.killSwitch);

  // Shaped like the real `get<T>(sql, ...params)` so the stub cannot drift from
  // the signature the job calls, and so a case can tell the two keys apart.
  const db = {
    get: vi.fn((_sql: string, key?: unknown) => {
      const value = settings.get(String(key));
      return value === undefined ? undefined : { value };
    }),
  };

  let onTick: (() => void | Promise<void>) | undefined;
  const registrar = {
    isEnabled: vi.fn(() => setup.registrarEnabled),
    register: vi.fn((_name: string, _expression: string, cb: () => void | Promise<void>) => {
      onTick = cb;
      return setup.registrarEnabled;
    }),
    unregister: vi.fn(),
  };

  // Both stubs carry the real signatures, so a case can read back which link a
  // run was asked for instead of only that some run happened.
  const sync = {
    dueLinks: vi.fn((_limit?: number) => setup.links),
    syncLink: vi.fn(async (_link: LinkRow, _opts?: { full?: boolean }) => RUN),
  };
  const config = { markOrphanedLinks: vi.fn(() => setup.orphaned) };
  const addons = { isAddonEnabled: vi.fn(() => setup.addonOn) };

  const job = new DocSyncJob(
    db as unknown as DatabaseService,
    sync as unknown as DocSyncService,
    config as unknown as DocSyncConfigService,
    addons as unknown as AddonsService,
    registrar as unknown as CronRegistrarService,
  );
  return { job, db, registrar, sync, config, addons, takeTick: () => onTick };
}

beforeEach(() => vi.clearAllMocks());

describe('DocSyncJob bootstrap', () => {
  it('schedules nothing, reads nothing and logs nothing while the registrar is off', () => {
    // The test gate. A job that registered past it would have every suite boot
    // start polling whatever document store sits in the fixture database.
    const { job, registrar, db } = makeJob({ registrarEnabled: false });
    job.onApplicationBootstrap();
    expect(registrar.register).not.toHaveBeenCalled();
    expect(db.get).not.toHaveBeenCalled();
    expect(log.logInfo).not.toHaveBeenCalled();
  });

  it('registers one cron under a name of its own and announces the cadence', () => {
    const { job, registrar } = makeJob();
    job.onApplicationBootstrap();
    expect(registrar.register).toHaveBeenCalledWith('docsync', '*/5 * * * *', expect.any(Function));
    expect(log.logInfo).toHaveBeenCalledWith('Document sync: scheduled every 5m');
  });

  it('reads the interval from its own app_settings key', () => {
    const { job, db } = makeJob({ interval: '600' });
    job.onApplicationBootstrap();
    expect(db.get).toHaveBeenCalledWith('SELECT value FROM app_settings WHERE key = ?', SETTING_POLL_INTERVAL);
  });

  it('clamps a hand-typed interval to between a minute and an hour', () => {
    for (const [setting, minutes] of [
      [undefined, 5], // no row: the 300s default
      ['', 5],
      ['not-a-number', 5],
      ['0', 1], // below the floor, and a `*/0` expression the parser would reject
      ['10', 1],
      ['60', 1], // the floor itself
      ['600', 10],
      ['3600', 60], // the ceiling itself
      ['86400', 60],
      ['-300', 1], // a minus sign parses fine and must not become a negative cron
    ] as const) {
      vi.clearAllMocks();
      const { job, registrar } = makeJob({ interval: setting });
      job.onApplicationBootstrap();
      expect(registrar.register).toHaveBeenCalledWith('docsync', `*/${minutes} * * * *`, expect.any(Function));
    }
  });

  it('rounds a sub-minute remainder to the nearest whole minute rather than down to nothing', () => {
    const { job, registrar } = makeJob({ interval: '90' });
    job.onApplicationBootstrap();
    expect(registrar.register).toHaveBeenCalledWith('docsync', '*/2 * * * *', expect.any(Function));
  });

  it('hands the registrar the tick itself, so a fired cron reaches the sync', async () => {
    const { job, sync, takeTick } = makeJob({ links: [link(1)] });
    job.onApplicationBootstrap();
    const tick = takeTick();
    expect(tick).toBeTypeOf('function');
    await tick?.();
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });

  it('does not decide at bootstrap whether the addon is on', () => {
    // Asking here would freeze the answer for the life of the process, and the
    // bug would read as "the documents toggle needs a restart".
    const { job, addons } = makeJob();
    job.onApplicationBootstrap();
    expect(addons.isAddonEnabled).not.toHaveBeenCalled();
  });
});

describe('DocSyncJob tick', () => {
  it('does nothing at all while the documents addon is off', async () => {
    const { job, sync, config, db } = makeJob({ addonOn: false, links: [link(1)] });
    await job.tick();
    expect(sync.dueLinks).not.toHaveBeenCalled();
    expect(sync.syncLink).not.toHaveBeenCalled();
    expect(config.markOrphanedLinks).not.toHaveBeenCalled();
    expect(db.get).not.toHaveBeenCalled();
  });

  it('asks the addon gate again on every tick, so switching it on needs no restart', async () => {
    const { job, addons, sync } = makeJob({ addonOn: false, links: [link(1)] });
    await job.tick();
    expect(sync.syncLink).not.toHaveBeenCalled();

    addons.isAddonEnabled.mockReturnValue(true);
    await job.tick();
    expect(addons.isAddonEnabled).toHaveBeenCalledTimes(2);
    expect(addons.isAddonEnabled).toHaveBeenLastCalledWith(ADDON_IDS.DOCUMENTS);
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
  });

  it('stops the run on the kill switch, without touching the bindings', async () => {
    const { job, sync, config, db } = makeJob({ killSwitch: 'false', links: [link(1)] });
    await job.tick();
    expect(db.get).toHaveBeenCalledWith('SELECT value FROM app_settings WHERE key = ?', SETTING_SYNC_ENABLED);
    expect(config.markOrphanedLinks).not.toHaveBeenCalled();
    expect(sync.dueLinks).not.toHaveBeenCalled();
  });

  it('keeps syncing on anything that is not exactly the string false', async () => {
    // The setting is absent by default, so an unrecognised value has to mean ON.
    // Treating '0' or 'off' as a stop would silently disable sync for anyone who
    // typed the switch by hand into app_settings.
    for (const value of [undefined, '', '0', 'off', 'no', 'FALSE', 'true']) {
      vi.clearAllMocks();
      const { job, sync } = makeJob({ killSwitch: value, links: [link(1)] });
      await job.tick();
      expect(sync.syncLink).toHaveBeenCalledTimes(1);
    }
  });

  it('re-reads the kill switch per tick instead of remembering the first answer', async () => {
    const { job, db, sync } = makeJob({ links: [link(1)] });
    await job.tick();
    await job.tick();
    expect(db.get).toHaveBeenCalledTimes(2);
    expect(sync.syncLink).toHaveBeenCalledTimes(2);
  });

  it('sweeps bindings whose credential owner left the trip before it syncs anything', async () => {
    const { job, config, sync } = makeJob({ orphaned: 2, links: [link(1)] });
    await job.tick();
    expect(config.markOrphanedLinks).toHaveBeenCalledTimes(1);
    expect(config.markOrphanedLinks.mock.invocationCallOrder[0]).toBeLessThan(
      sync.dueLinks.mock.invocationCallOrder[0],
    );
    expect(log.logInfo).toHaveBeenCalledWith('Document sync: 2 link(s) orphaned, owner no longer on the trip');
  });

  it('stays quiet when the sweep found nothing', async () => {
    const { job, config } = makeJob({ orphaned: 0 });
    await job.tick();
    expect(config.markOrphanedLinks).toHaveBeenCalledTimes(1);
    expect(log.logInfo).not.toHaveBeenCalled();
  });

  it('runs the remaining bindings after one of them throws', async () => {
    // An unreachable NAS on one trip is not a reason to skip a Paperless
    // binding on another, and the two are ordinary neighbours in one list.
    const { job, sync } = makeJob({ links: [link(1), link(2), link(3)] });
    sync.syncLink.mockRejectedValueOnce(new Error('EHOSTUNREACH'));
    await expect(job.tick()).resolves.toBeUndefined();
    expect(sync.syncLink).toHaveBeenCalledTimes(3);
    expect(log.logError).toHaveBeenCalledWith('Document sync: link 1 failed: EHOSTUNREACH');
  });

  it('logs a non-Error rejection by value rather than as an empty message', async () => {
    const { job, sync } = makeJob({ links: [link(7)] });
    sync.syncLink.mockRejectedValueOnce('ECONNREFUSED');
    await job.tick();
    expect(log.logError).toHaveBeenCalledWith('Document sync: link 7 failed: ECONNREFUSED');
  });

  it('never rejects, so a failure inside it cannot escape into the scheduler', async () => {
    const { job, sync } = makeJob();
    sync.dueLinks.mockImplementation(() => {
      throw new Error('database is locked');
    });
    await expect(job.tick()).resolves.toBeUndefined();
    expect(log.logError).toHaveBeenCalledWith('Document sync tick failed: database is locked');
  });

  it('logs a failure thrown as a bare value by what it printed, not as an empty message', async () => {
    const { job, addons } = makeJob();
    addons.isAddonEnabled.mockImplementation(() => {
      throw 'SQLITE_BUSY';
    });
    await expect(job.tick()).resolves.toBeUndefined();
    expect(log.logError).toHaveBeenCalledWith('Document sync tick failed: SQLITE_BUSY');
  });

  it('recovers on the next tick after a failed one', async () => {
    const { job, sync } = makeJob({ links: [link(1)] });
    sync.dueLinks.mockImplementationOnce(() => {
      throw new Error('down');
    });
    await job.tick();
    await job.tick();
    expect(sync.syncLink).toHaveBeenCalledTimes(1);
    expect(log.logError).toHaveBeenCalledTimes(1);
  });

  it('leaves the choice of what is due to the sync service', async () => {
    // The job passes the rows through untouched: the backoff, the circuit
    // breaker and the ordering all live in dueLinks, and a filter copied up
    // here would be a second place to keep them in step with.
    const links = [link(4), link(5)];
    const { job, sync } = makeJob({ links });
    await job.tick();
    expect(sync.syncLink.mock.calls.map((c) => c[0])).toEqual(links);
  });
});
