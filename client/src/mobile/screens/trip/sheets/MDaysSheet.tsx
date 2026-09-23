import { CalendarRange, Plus, Trash2 } from 'lucide-react'
import MSheet from '../../../components/MSheet'
import { ReorderStack } from '../plan/MPlanTimelineRows'
import { INNER_CLS, TileHeader } from './MTripSheetUi'
import { useTranslation } from '../../../../i18n'
import { dayLabel } from '../../../../utils/dayLabel'
import type { MTripSheetsProps } from '../MTripShell'

/**
 * Day management sheet ('days'): move whole days up/down, append a new day or
 * delete one, the mobile counterpart of the desktop DayReorderPopup and
 * button-based like the rest of the touch reordering (#1432). A day's places,
 * notes and bookings move with it (store handles that optimistically). Delete
 * only asks; the confirm sheet with what goes with the day is MTripSheets'.
 */
export default function MDaysSheet({ planner, shell }: MTripSheetsProps) {
  const { t, locale } = useTranslation()
  const open = shell.sheet?.id === 'days'
  const canEditDays = planner.can('day_edit', planner.trip)
  const ordered = [...planner.days].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0))
  const deleteBlocked = planner.deleteDayBlocked

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
        {canEditDays && (
          <button
            type="button"
            onClick={() => planner.handleAddDay()}
            className="mt-[10px] flex w-full items-center justify-center gap-[6px] rounded-[13px] border-[1.5px] border-dashed border-[color:var(--m-faint)] py-[9px] text-[0.75rem] font-semibold text-m-muted"
          >
            <Plus size={13} strokeWidth={2.2} />
            {t('dayplan.addDay')}
          </button>
        )}
        {canEditDays && deleteBlocked && (
          <p className="mt-[10px] text-center text-[0.6875rem] text-m-muted">{deleteBlocked}</p>
        )}
      </div>
    </MSheet>
  )
}
