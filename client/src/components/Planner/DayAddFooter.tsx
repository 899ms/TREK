import { useId, useState } from 'react'
import { CalendarPlus, Plus } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import type { DayAddControls } from '../../utils/dayAdd'

interface DayAddFooterProps {
  /** Without it, or on a trip without dates, the footer keeps its single "Add day" button. */
  dayAdd?: DayAddControls
  onAddDay: () => void
  onClose: () => void
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
}

const outlineBtn =
  'flex items-center justify-center gap-1.5 rounded-lg border border-edge py-2 text-body font-medium transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent'
const primaryBtn =
  'flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-body font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-accent'

/**
 * The foot of the reorder dialog: close it, or add a day.
 *
 * On a trip with dates there are two ways to add one, side by side. A day
 * without a date goes to the end and leaves the trip dates alone; the next
 * calendar day, named on its button, extends the trip by one. The line under
 * them says what the button in view does, and switches while the pointer or the
 * focus rests on the other one. When no day can be added it says why instead.
 */
export function DayAddFooter({ dayAdd, onAddDay, onClose, t, locale }: DayAddFooterProps) {
  const [aboutUndated, setAboutUndated] = useState(false)
  const hintId = useId()
  const busy = dayAdd?.busy ?? false
  const blocked = dayAdd?.blocked ?? null
  const addOff = busy || !!blocked

  const closeButton = (
    <button type="button" onClick={onClose} className={`${outlineBtn} flex-shrink-0 px-4 text-content-muted`}>
      {t('common.close')}
    </button>
  )

  if (!dayAdd?.nextDate) {
    return (
      <div className="flex items-center justify-between gap-3">
        {closeButton}
        <div className="flex min-w-0 items-center gap-3">
          {blocked && <span className="min-w-0 text-caption text-content-faint">{blocked}</span>}
          <button type="button" onClick={onAddDay} disabled={addOff} className={`${primaryBtn} flex-shrink-0 px-4`}>
            <Plus size={15} strokeWidth={2} />
            {t('dayplan.addDay')}
          </button>
        </div>
      </div>
    )
  }

  const date = formatDate(dayAdd.nextDate, locale) ?? dayAdd.nextDate
  const hint = blocked
    ?? (aboutUndated ? t('dayplan.addUndatedDayHint') : dayAdd.datedBlocked ?? t('dayplan.addDatedDayHint', { date }))
  const pointAtUndated = {
    onMouseEnter: () => setAboutUndated(true),
    onMouseLeave: () => setAboutUndated(false),
    onFocus: () => setAboutUndated(true),
    onBlur: () => setAboutUndated(false),
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddDay}
          disabled={addOff}
          aria-describedby={hintId}
          className={`${outlineBtn} min-w-0 px-3 text-center leading-tight text-content-secondary`}
          {...pointAtUndated}
        >
          <Plus size={15} strokeWidth={2} className="flex-shrink-0" />
          {t('dayplan.addUndatedDay')}
        </button>
        <button
          type="button"
          onClick={dayAdd.onAddDated}
          disabled={addOff || !!dayAdd.datedBlocked}
          aria-describedby={hintId}
          className={`${primaryBtn} min-w-0 px-3 text-center leading-tight`}
        >
          <CalendarPlus size={15} strokeWidth={2} className="flex-shrink-0" />
          {t('dayplan.addDatedDay', { date })}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p id={hintId} aria-live="polite" className="m-0 min-w-0 text-caption text-content-faint">
          {hint}
        </p>
        {closeButton}
      </div>
    </div>
  )
}
