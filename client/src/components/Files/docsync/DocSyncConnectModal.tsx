import { useState } from 'react'
import { AlertTriangle, Check, Loader2, ShieldAlert } from 'lucide-react'
import Modal from '../../shared/Modal'
import ToggleSwitch from '../../Settings/ToggleSwitch'
import { useTranslation } from '../../../i18n/TranslationContext'
import { Badge } from './DocSyncBits'
import { DOCUMENT_PROVIDER_ICONS } from '../../shared/DocumentProviderIcons'
import type { DocSyncProvider, useDocSync } from './useDocSync'

/**
 * Connecting a store, as a dialog rather than a panel that unfolds in place.
 *
 * Entering a URL and a token is a task with a beginning and an end, and doing it
 * inside the list meant the list jumped around while someone typed. The dialog
 * also gives the probe result somewhere to live that is not a line of text
 * squeezed between two fields.
 */
export default function DocSyncConnectModal({
  provider,
  sync,
  onClose,
  onConnected,
}: {
  provider: DocSyncProvider
  sync: ReturnType<typeof useDocSync>
  onClose: () => void
  onConnected: (providerId: string) => void
}) {
  const { t } = useTranslation()
  const existing = sync.connectionFor(provider.id)
  const Icon = DOCUMENT_PROVIDER_ICONS[provider.id]

  const [values, setValues] = useState<Record<string, string>>({})
  const [insecure, setInsecure] = useState<boolean | null>(null)
  const [verdict, setVerdict] = useState<{ connected: boolean; account?: string; error?: string } | null>(null)

  // Null until touched, so a connection that loads after the dialog opened is
  // still reflected. Seeding the state at mount showed a stored "allow
  // self-signed" as off and wrote that back on the next save — a security
  // switch silently turning itself off is the worst version of this bug.
  const insecureOn = insecure ?? existing?.allowInsecureTls ?? false

  const baseUrl = values.base_url ?? existing?.baseUrl ?? ''
  // The address is a column of its own, not a settings entry, so it has to be
  // read from there — otherwise the field sits empty while the form submits the
  // stored value behind it.
  const shown = (key: string) =>
    values[key] ?? (key === 'base_url' ? existing?.baseUrl : existing?.settings?.[key]) ?? ''
  const required = provider.fields.filter(f => f.required)
  const canSubmit = required.every(f =>
    f.field_key === 'base_url'
      ? baseUrl.trim().length > 0
      : f.secret
        ? (values[f.field_key] ?? '').length > 0 || !!existing?.secrets?.[f.field_key]
        : shown(f.field_key).trim().length > 0,
  )

  const test = async () => setVerdict(await sync.testConnection(provider.id, baseUrl, values, insecureOn))

  const save = async () => {
    if (await sync.saveConnection(provider.id, baseUrl, values, insecureOn)) onConnected(provider.id)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2.5">
          {Icon && <Icon className="h-5 w-5 text-content" />}
          <span>{provider.name}</span>
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <Verdict verdict={verdict} busy={sync.busy === 'test'} />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void test()}
              disabled={!canSubmit || sync.busy === 'test'}
              className="rounded-lg border border-edge px-3.5 py-2 text-body text-content-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {t('docsync.test')}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSubmit || sync.busy === 'save'}
              className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-body font-medium text-accent-text transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sync.busy === 'save' && <Loader2 size={14} className="animate-spin" />}
              {t('docsync.connect.submit')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-caption text-content-muted">{t(`docsync.connect.about.${provider.id}`)}</p>

        {provider.fields.filter(f => f.field_key !== 'allow_insecure_tls').map(f => (
          <Field
            key={f.field_key}
            label={t(`docsync.${f.label}`)}
            hint={f.hint ? t(`docsync.${f.hint}`) : undefined}
            required={f.required}
          >
            <input
              type={f.input_type === 'password' ? 'password' : 'text'}
              value={f.secret ? (values[f.field_key] ?? '') : shown(f.field_key)}
              // A stored secret never comes back, so an empty field with a dotted
              // placeholder means "the one already saved" rather than "blank".
              placeholder={f.secret && existing?.secrets?.[f.field_key] ? '••••••••' : f.placeholder || ''}
              onChange={e => setValues({ ...values, [f.field_key]: e.target.value })}
              className="w-full rounded-lg border border-edge bg-surface-input px-3 py-2.5 text-body text-content ring-accent transition-shadow placeholder:text-content-faint focus:outline-none focus:ring-2"
            />
          </Field>
        ))}

        <label className="flex items-start justify-between gap-4 rounded-lg border border-edge bg-surface-secondary px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-body text-content">{t('docsync.allowInsecureTls')}</span>
            <span className="mt-0.5 block text-caption text-content-muted">
              {t('docsync.connect.insecureHint')}
            </span>
          </span>
          <span className="shrink-0 pt-0.5">
            <ToggleSwitch on={insecureOn} onToggle={() => setInsecure(!insecureOn)} />
          </span>
        </label>
      </div>
    </Modal>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2">
        <span className="text-body font-medium text-content">{label}</span>
        {!required && <Badge tone="neutral">{t('docsync.connect.optional')}</Badge>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-caption text-content-muted">{hint}</span>}
    </label>
  )
}

/** The probe result, in the footer where it stays put while the form scrolls. */
function Verdict({
  verdict,
  busy,
}: {
  verdict: { connected: boolean; account?: string; error?: string } | null
  busy: boolean
}) {
  const { t } = useTranslation()
  if (busy) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-caption text-content-muted">
        <Loader2 size={14} className="animate-spin" />
        {t('docsync.connect.testing')}
      </span>
    )
  }
  if (!verdict) return <span />
  if (verdict.connected) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-caption text-success">
        <Check size={14} strokeWidth={2.5} />
        <span className="truncate">
          {verdict.account ? t('docsync.connect.okAs', { account: verdict.account }) : t('docsync.connected')}
        </span>
      </span>
    )
  }
  const blocked = verdict.error === 'ssrf_blocked' || verdict.error === 'tls_untrusted'
  return (
    <span className="flex min-w-0 items-center gap-2 text-caption text-danger">
      {blocked ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
      <span className="truncate">{t(`docsync.error.${verdict.error || 'unknown'}`)}</span>
    </span>
  )
}
