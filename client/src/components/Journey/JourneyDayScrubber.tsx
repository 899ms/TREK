import { useTranslation } from '../../i18n'
import type { JourneyDay } from './journeyCard'

/**
 * The day bar above the phone timeline.
 *
 * A horizontal carousel of cards tells you what happened but never where you are
 * in the trip: scrolling for a while gives no sense of having crossed from the
 * second day into the third, and there is no way to reach day nine except by
 * swiping past days three to eight (discussion #2299). One segment per day fixes
 * both — it says how long the journey is, how far in you are, and it takes you
 * anywhere in one tap.
 *
 * The segment colours are the same `DAY_COLORS` the map markers and the card
 * edges use, so the bar is a legend for the whole screen rather than a fourth
 * thing to learn.
 */

interface Props {
  days: JourneyDay[]
  activeDate: string | null
  onPick: (date: string) => void
}

export default function JourneyDayScrubber({ days, activeDate, onPick }: Props) {
  const { t, locale } = useTranslation()
  // One day is not a journey to scrub through, and the bar would say nothing the
  // card's own date does not already say.
  if (days.length < 2) return null

  const long = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })

  const activeIndex = activeDate ? days.findIndex(d => d.date === activeDate) : -1
  const shown = activeIndex >= 0 ? days[activeIndex] : days[0]

  return (
    <div className="pointer-events-auto px-4 pb-[6px]">
      <div className="mb-[5px] flex items-baseline gap-2">
        <span className="rounded-full bg-black/55 px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap text-white backdrop-blur-[3px]">
          {long(shown.date)}
        </span>
        {activeIndex >= 0 && (
          <span className="text-[10px] font-semibold text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,.65)]">
            {t('journey.detail.day', { number: String(activeIndex + 1) })}
          </span>
        )}
      </div>
      {/* Buttons rather than one draggable rail: a 9px-wide drag target on a map that
          also pans is a fight, and a tap is the whole gesture anyway. */}
      <div className="flex items-end gap-[3px]">
        {days.map(day => {
          const on = day.date === shown.date
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onPick(day.date)}
              aria-label={t('journey.detail.jumpToDay', { date: long(day.date) })}
              aria-current={on ? 'true' : undefined}
              className="min-w-[6px] flex-1 rounded-full transition-all duration-150"
              style={{
                height: on ? 6 : 3,
                background: day.color,
                opacity: on ? 1 : 0.42,
                boxShadow: on ? `0 0 0 1.5px rgba(255,255,255,.75)` : '0 0 0 1px rgba(0,0,0,.18)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
