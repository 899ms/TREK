import { CalendarPlus, CalendarRange, Plus, Trash2 } from 'lucide-react'
import MSheet from '../../../components/MSheet'
import { ReorderStack } from '../plan/MPlanTimelineRows'
import { INNER_CLS, TileHeader } from './MTripSheetUi'
import { useTranslation } from '../../../../i18n'
import { dayLabel } from '../../../../utils/dayLabel'
import { formatDate } from '../../../../utils/formatters'
import type { DayAddControls } from '../../../../utils/dayAdd'
import type { MTripSheetsProps } from '../MTripShell'

const TILE = 'flex w-full items-center gap-[10px] rounded-[13px] px-[11px] text-left disabled:opacity-40'
const TILE_ICON = 'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full'
const TILE_TITLE = 'block text-[0.8125rem] font-semibold leading-tight'
const TILE_HINT = 'mt-[2px] block text-[0.6875rem] leading-snug'

/**
 * The two ways to add a day on a trip with dates, as tiles: the next date on
 * top in the action colour, since it is the one that moves the trip's end, and
 * a day without a date below it in the dashed look the single button had.
 */
function DayAddTiles({ dayAdd, date, onAddUndated, t }: {
  dayAdd: DayAddControls
  date: string
  onAddUndated: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const addOff = dayAdd.busy || !!dayAdd.blocked
  return (
    <div className="mt-[10px] flex flex-col gap-[6px]">
      <button
        type="button"
        onClick={dayAdd.onAddDated}
        disabled={addOff || !!dayAdd.datedBlocked}
        className={`${TILE} bg-m-act py-[9px] text-m-actfg`}
      >
        <span className={`${TILE_ICON} bg-[color:color-mix(in_srgb,var(--m-actfg)_14%,transparent)]`}>
          <CalendarPlus size={14} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={TILE_TITLE}>{t('dayplan.addDatedDay', { date })}</span>
          <span className={`${TILE_HINT} opacity-70`}>{dayAdd.datedBlocked ?? t('dayplan.addDatedDayHint', { date })}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onAddUndated}
        disabled={addOff}
        className={`${TILE} border-[1.5px] border-dashed border-[color:var(--m-faint)] py-[8px] text-m-muted`}
      >
        <span className={`${TILE_ICON} bg-[color:var(--m-ic)]`}>
          <Plus size={14} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`${TILE_TITLE} text-m-ink`}>{t('dayplan.addUndatedDay')}</span>
          <span className={TILE_HINT}>{t('dayplan.addUndatedDayHint')}</span>
        </span>
      </button>
    </div>
  )
}

/**
 * Day management sheet ('days'): move whole days up/down, add a day or delete
 * one, the mobile counterpart of the desktop DayReorderPopup and button-based
 * like the rest of the touch reordering (#1432). A day's places, notes and
 * bookings move with it (store handles that optimistically). Delete only asks;
 * the confirm sheet with what goes with the day is MTripSheets'. On a trip with
 * dates a day can be added with the next date as well as without one.
 */
export default function MDaysSheet({ planner, shell }: MTripSheetsProps) {
  const { t, locale } = useTranslation()
  const open = shell.sheet?.id === 'days'
  const canEditDays = planner.can('day_edit', planner.trip)
  const ordered = [...planner.days].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0))
  const deleteBlocked = planner.deleteDayBlocked
  const { dayAdd } = planner
  // Offline, both say the same sentence; it is shown once.
  const notices = [deleteBlocked, dayAdd.blocked].filter((n, i, all): n is string => !!n && all.indexOf(n) === i)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return
    const ids = ordered.map(d => d.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    planner.handleReorderDays(ids)
  }

  return (
    <MSheet open={open} onClose={shell.closeSheet} variant="card" material="glass" ariaLabel={t('dayplan.reorderTitle')}>
      <div className="flex-none px-[18px] pt-4">
        <TileHeader
          icon={<CalendarRange size={19} strokeWidth={1.8} />}
          title={t('dayplan.reorderTitle')}
          sub={t('dayplan.reorderHint')}
          subWrap
          onClose={shell.closeSheet}
          closeLabel={t('common.close')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[18px] pt-[14px]">
        <div className="flex flex-col gap-[6px]">
          {ordered.map((day, i) => (
            <div key={day.id} className={`flex items-center gap-[10px] rounded-[13px] px-[11px] py-[7px] ${INNER_CLS}`}>
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[color:var(--m-ic)] font-geist text-[0.65625rem] font-bold text-m-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{dayLabel(day, i, t, locale)}</span>
              {canEditDays && (
                <ReorderStack
                  onUp={() => move(i, i - 1)}
                  onDown={() => move(i, i + 1)}
                  canUp={i > 0}
                  canDown={i < ordered.length - 1}
                  t={t}
                />
              )}
              {canEditDays && (
                <button
                  type="button"
                  onClick={() => planner.handleDeleteDay(day.id)}
                  disabled={!!deleteBlocked}
                  aria-label={t('dayplan.deleteDay')}
                  title={deleteBlocked ?? undefined}
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[color:var(--m-ic)] text-[color:var(--m-st-danger)] disabled:text-m-faint disabled:opacity-40"
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEditDays && dayAdd.nextDate && (
          <DayAddTiles
            dayAdd={dayAdd}
            date={formatDate(dayAdd.nextDate, locale) ?? dayAdd.nextDate}
            onAddUndated={() => planner.handleAddDay()}
            t={t}
          />
        )}
        {canEditDays && !dayAdd.nextDate && (
          <button
            type="button"
            onClick={() => planner.handleAddDay()}
            disabled={dayAdd.busy || !!dayAdd.blocked}
            className="mt-[10px] flex w-full items-center justify-center gap-[6px] rounded-[13px] border-[1.5px] border-dashed border-[color:var(--m-faint)] py-[9px] text-[0.75rem] font-semibold text-m-muted disabled:opacity-40"
          >
            <Plus size={13} strokeWidth={2.2} />
            {t('dayplan.addDay')}
          </button>
        )}
        {canEditDays && notices.map(notice => (
          <p key={notice} className="mt-[10px] text-center text-[0.6875rem] text-m-muted">{notice}</p>
        ))}
      </div>
    </MSheet>
  )
}
