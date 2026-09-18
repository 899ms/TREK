import type { ReactNode } from 'react'
import { useTranslation } from '../../../i18n/TranslationContext'
import { relativeTime } from '../../../utils/relativeTime'

/**
 * The small shared pieces of the document-sync dialog.
 *
 * They live together because the panel, the store list and the binding card all
 * label the same five sync states, and three hand-written copies of that mapping
 * is how one of them ends up saying something different from the other two.
 */

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-secondary text-content-secondary',
  accent: 'bg-accent-subtle text-accent-on',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

/** A count or a short label, on a tinted pill. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  title,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-medium ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** The tone each sync state carries, in one place. */
function toneForState(state: string): Tone {
  if (state === 'ok') return 'success'
  if (state === 'partial') return 'warning'
  if (state === 'never') return 'neutral'
  return 'danger'
}

/**
 * A binding's state as a dot plus its word.
 *
 * A dot alone is a colour puzzle and a word alone is easy to skim past; the two
 * together survive both colour blindness and a glance.
 */
export function StateBadge({ state, compact }: { state: string; compact?: boolean }) {
  const { t } = useTranslation()
  const tone = toneForState(state)
  const dot =
    tone === 'success' ? 'bg-success'
    : tone === 'warning' ? 'bg-warning'
    : tone === 'danger' ? 'bg-danger'
    : 'bg-content-faint'

  if (compact) return <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} title={t(`docsync.linkState.${state}`)} />

  return (
    <Badge tone={tone} icon={<span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}>
      {t(`docsync.linkState.${state}`)}
    </Badge>
  )
}

/** "2h ago", or "never" when a binding has not run yet. */
export function LastRun({ at }: { at: string | null }) {
  const { t, language, locale } = useTranslation()
  if (!at) return <span className="text-content-faint">{t('docsync.binding.neverRun')}</span>
  const ms = Date.parse(at)
  if (Number.isNaN(ms)) return null
  return <span title={new Date(ms).toLocaleString(locale)}>{relativeTime(ms, language)}</span>
}
