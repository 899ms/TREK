import { CalendarMinus } from 'lucide-react'
import type { ImpactLine, ImpactTone } from '../../utils/dayImpactLines'

/** The class names one shell draws the list with. */
export interface ImpactListSkin {
  list: string
  row: string
  /** Between two rows; the desktop card divides them itself. */
  divider: string
  chip: string
  /** One removed day, named in the row above the content rows. */
  dayChip: string
  iconSize: number
  text: string
  hint: string
  chipTone: Record<ImpactTone, string>
  textTone: Record<ImpactTone, string>
}

const DESKTOP: ImpactListSkin = {
  list: 'mt-4 overflow-hidden rounded-xl border border-edge-faint bg-surface-secondary divide-y divide-edge-faint',
  row: 'flex items-start gap-3 px-3 py-2.5',
  divider: '',
  chip: 'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
  dayChip: 'rounded-full border border-edge-faint bg-surface px-2.5 py-0.5 text-caption font-medium text-content-secondary',
  iconSize: 15,
  text: 'text-body font-medium leading-snug',
  hint: 'mt-0.5 text-caption text-content-muted',
  chipTone: {
    neutral: 'bg-surface text-content-muted',
    muted: 'bg-surface text-content-faint',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  },
  textTone: { neutral: 'text-content', muted: 'text-content-muted', warning: 'text-content', danger: 'text-danger' },
}

interface DayImpactListProps {
  lines: ImpactLine[]
  /**
   * The days themselves, as chips in a first row: when several days go at
   * once, the list names them before it says what is on them.
   */
  days?: string[]
  /** Names the list for assistive tech; the dialog title usually says it already. */
  label?: string
  /** The phone passes its own; the default is the desktop card. */
  skin?: ImpactListSkin
}

/**
 * What goes with the days being removed, one row per kind of content: an icon
 * chip in the row's tone, the count, and a caption saying what happens to it.
 * The rows come ready made from utils/dayImpactLines, and the look comes from a
 * skin, so the desktop dialog and the phone sheet share this markup and differ
 * only in their tokens.
 */
export default function DayImpactList({ lines, days = [], label, skin = DESKTOP }: DayImpactListProps) {
  if (lines.length === 0) return null
  const offset = days.length > 0 ? 1 : 0
  return (
    <ul aria-label={label} className={skin.list}>
      {offset > 0 && (
        <li data-kind="days" className={skin.row}>
          <span className={`${skin.chip} ${skin.chipTone.warning}`}>
            <CalendarMinus size={skin.iconSize} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 pt-1">
            {days.map((name, i) => <span key={`${i}-${name}`} className={skin.dayChip}>{name}</span>)}
          </div>
        </li>
      )}
      {lines.map(({ key, icon: Icon, text, hint, tone }, i) => (
        <li key={key} data-tone={tone} className={`${skin.row} ${i + offset > 0 ? skin.divider : ''}`.trim()}>
          <span className={`${skin.chip} ${skin.chipTone[tone]}`}>
            <Icon size={skin.iconSize} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${skin.text} ${skin.textTone[tone]}`}>{text}</p>
            {hint && <p className={skin.hint}>{hint}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
