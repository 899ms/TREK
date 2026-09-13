import { MapPin } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { moodMeta, weatherMeta } from '../../mobile/screens/journey/mobileJourneyMeta'
import { cardDateLabel, cardPhotoId, cardPlace, cardTitle, countryFlag, type CardPhoto } from './journeyCard'
import type { JourneyEntry } from '../../store/journeyStore'

/**
 * One entry of the phone timeline: the photo IS the card.
 *
 * It used to be a 64px thumbnail beside three lines of text, which spent the
 * card's width on a story nobody reads at that size and left the title truncated
 * after a handful of characters (discussion #2299). Now the picture fills the
 * card and the words sit on it: title and place bottom-left, where the eye lands,
 * and the two facts that place the moment — which country, which day — in the
 * corners above.
 *
 * The day is carried by the colour rather than by a number. A numbered card only
 * answers "how many stops into this day am I", which is not a question anyone
 * asks; the day scrubber above the carousel answers the one they do.
 *
 * Two shells draw this card. `tone` picks the surface a card without a photo
 * falls back to, because the phone shell's tokens are scoped to `.m-root` and
 * the tablet timeline is outside it. Everything else is a photo and white text,
 * which needs no tokens at all.
 */

/** The subset of an entry a card reads. Shared journeys hand over less than the journey's own. */
export interface CoverEntry {
  id: number
  type: JourneyEntry['type']
  title?: string | null
  story?: string | null
  location_name?: string | null
  location_lat?: number | null
  location_lng?: number | null
  country_code?: string | null
  entry_date: string
  entry_time?: string | null
  mood?: string | null
  weather?: string | null
  photos?: CardPhoto[]
}

interface Props {
  entry: CoverEntry | JourneyEntry
  /** The colour of the day this entry belongs to, from `DAY_COLORS`. */
  dayColor: string
  isActive: boolean
  onClick: () => void
  /** Off when the journey has put that field away (journey settings). */
  showMood?: boolean
  showWeather?: boolean
  /** The public journey page serves photos through a share token. */
  photoUrlFor?: (photoId: number) => string
  tone?: 'app' | 'mobile'
}

export default function JourneyEntryCover({
  entry,
  dayColor,
  isActive,
  onClick,
  showMood = true,
  showWeather = true,
  photoUrlFor,
  tone = 'app',
}: Props) {
  const { t, locale } = useTranslation()
  const isSuggestion = entry.type === 'skeleton'

  const photoId = cardPhotoId(entry.photos?.[0])
  const src = photoId == null ? null : photoUrlFor ? photoUrlFor(photoId) : `/api/photos/${photoId}/thumbnail`

  const title = cardTitle(entry, t)
  const place = cardPlace(entry)
  const flag = countryFlag(entry.country_code)
  const date = cardDateLabel(entry.entry_date, locale)
  const mood = showMood ? moodMeta(entry.mood) : undefined
  const weather = showWeather ? weatherMeta(entry.weather) : undefined

  const emptyGround = tone === 'mobile' ? 'bg-[color:var(--m-sheet)]' : 'bg-white/90 dark:bg-zinc-800/90'

  return (
    <button
      type="button"
      onClick={onClick}
      // The whole card is the photo, so its own ring is what separates it from the
      // map behind. A suggestion is drawn as an outline rather than a solid thing:
      // it is somewhere you planned to be, not somewhere you have written about.
      className={`relative flex-none overflow-hidden rounded-[18px] text-left transition-[width,height] duration-150 ${
        isActive ? 'h-[180px] w-[164px] shadow-[0_18px_40px_-16px_rgba(0,0,0,.55)]' : 'h-[152px] w-[136px] shadow-[0_10px_24px_-14px_rgba(0,0,0,.5)]'
      } ${src ? '' : emptyGround} ${
        isActive ? 'ring-2 ring-white/85 dark:ring-white/70' : 'ring-1 ring-black/10 dark:ring-white/15'
      } ${isSuggestion ? 'opacity-90' : ''}`}
      style={src ? undefined : { background: `linear-gradient(160deg, ${dayColor}2e, ${dayColor}0d)` }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <MapPin size={24} strokeWidth={1.8} style={{ color: dayColor }} className="opacity-60" />
        </span>
      )}

      {/* Two washes rather than one: the top corners carry small marks that would
          otherwise sit on a bright sky, and the bottom has to hold two lines of text. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />

      {/* Top left: where in the world, and whether this has happened yet. */}
      <span className="absolute left-2 top-2 flex items-center gap-1">
        {flag && <span className="text-[15px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]">{flag}</span>}
        {isSuggestion && (
          <span className="rounded-full bg-white/22 px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.06em] text-white backdrop-blur-[2px]">
            {t('journey.entry.suggestion')}
          </span>
        )}
      </span>

      {/* Top right: when, plus whatever the journey still keeps of mood and weather. */}
      <span className="absolute right-2 top-2 flex items-center gap-1">
        {mood && (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/22 backdrop-blur-[2px]" style={{ color: mood.color }}>
            <mood.icon size={11} strokeWidth={2.4} />
          </span>
        )}
        {weather && (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/22 text-white backdrop-blur-[2px]">
            <weather.icon size={11} strokeWidth={2.4} />
          </span>
        )}
        <span className="rounded-full bg-white/22 px-[7px] py-[2px] text-[10px] font-bold whitespace-nowrap text-white backdrop-blur-[2px]">
          {date}
        </span>
      </span>

      {/* Bottom: the name gets the room the thumbnail layout never had. */}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-[1px] px-[10px] pb-[10px]">
        <span className={`line-clamp-2 text-[13px] leading-[1.25] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.6)] ${isSuggestion ? 'italic' : ''}`}>
          {title}
        </span>
        {place && (
          <span className="truncate text-[10.5px] leading-[1.3] font-medium text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,.6)]">
            {place}
          </span>
        )}
      </span>

      {/* The day, as a colour. Sits under the text rather than beside it so it costs
          the card no width, and reads as one bar across the carousel per day. */}
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: dayColor }} />
    </button>
  )
}
