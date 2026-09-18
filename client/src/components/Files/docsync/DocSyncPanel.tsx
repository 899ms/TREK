import { useState } from 'react'
import { AlertTriangle, Check, Cloud, FolderSync, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../../i18n/TranslationContext'
import ToggleSwitch from '../../Settings/ToggleSwitch'
import { useDocSync, type DocSyncProvider, type DocSyncScope } from './useDocSync'

/**
 * The trip's document sync, configured where the documents are.
 *
 * It lives in the file manager rather than in settings because this is the one
 * screen where someone has the context "these documents belong in that folder".
 * Only the trip owner can change it — the credential usually reaches the
 * owner's whole archive — but every member can see where their documents go,
 * which is the minimum a shared folder owes the people sharing it.
 */
export default function DocSyncPanel({ tripId, isOwner, onClose }: { tripId: number | string; isOwner: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const sync = useDocSync(tripId, true)
  const [openProvider, setOpenProvider] = useState<string | null>(null)

  if (sync.loading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 size={20} className="animate-spin text-content-faint" />
      </div>
    )
  }

  if (sync.providers.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface p-5 text-center">
        <Cloud size={22} className="mx-auto text-content-faint" />
        <p className="mt-2 text-body text-content">{t('docsync.noProviders')}</p>
        <p className="mt-1 text-caption text-content-muted">{t('docsync.noProvidersHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-subtitle font-semibold text-content">{t('docsync.title')}</h3>
          <p className="mt-0.5 text-caption text-content-muted">{t('docsync.subtitle')}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover" aria-label={t('common.close')}>
          <X size={16} />
        </button>
      </div>

      {sync.links.map(link => {
        const provider = sync.providers.find(p => p.id === link.providerId)
        return (
          <div key={link.id} className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FolderSync size={16} className="text-accent" />
                  <span className="truncate text-body font-medium text-content">{provider?.name || link.providerId}</span>
                  <StateBadge state={link.lastSyncState} t={t} />
                </div>
                <p className="mt-1 truncate text-caption text-content-muted">
                  {link.remoteLabel || link.remoteRootPath || link.scopeKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sync.busy === `sync-${link.id}`}
                  onClick={() => void sync.syncNow(link.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-caption text-content hover:bg-surface-hover disabled:opacity-50"
                >
                  {sync.busy === `sync-${link.id}`
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />}
                  {t('docsync.syncNow')}
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void sync.removeLink(link.id)}
                    className="rounded-lg border border-edge p-1.5 text-content-muted hover:bg-surface-hover"
                    aria-label={t('docsync.unlink')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {link.lastSyncError && (
              <p className="mt-2 flex items-center gap-1.5 text-caption text-danger">
                <AlertTriangle size={13} />
                {t(`docsync.error.${link.lastSyncError}`)}
              </p>
            )}

            {isOwner && (
              <div className="mt-3 grid gap-3 border-t border-edge pt-3 sm:grid-cols-2">
                <label className="text-caption text-content-muted">
                  {t('docsync.direction')}
                  <select
                    value={link.direction}
                    onChange={e => void sync.updateLink(link.id, { direction: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-edge bg-surface px-2 py-1.5 text-body text-content"
                  >
                    <option value="both">{t('docsync.directionBoth')}</option>
                    <option value="pull">{t('docsync.directionPull')}</option>
                    <option value="push">{t('docsync.directionPush')}</option>
                  </select>
                </label>
                <label className="text-caption text-content-muted">
                  {t('docsync.deletePolicy')}
                  <select
                    value={link.deletePolicy}
                    onChange={e => void sync.updateLink(link.id, { deletePolicy: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-edge bg-surface px-2 py-1.5 text-body text-content"
                  >
                    <option value="unlink">{t('docsync.deleteUnlink')}</option>
                    <option value="trash">{t('docsync.deleteTrash')}</option>
                  </select>
                </label>
                <div className="flex items-center justify-between sm:col-span-2">
                  <span className="text-caption text-content-muted">{t('docsync.syncEnabled')}</span>
                  <ToggleSwitch
                    on={link.syncEnabled}
                    onToggle={() => void sync.updateLink(link.id, { syncEnabled: !link.syncEnabled })}
                  />
                </div>
                {/* Shown only where TREK could not subscribe itself: Papra's
                    webhook API is closed to API keys and Nextcloud's needs admin
                    rights, so the user pastes this in by hand. Polling carries
                    the binding either way. */}
                {link.webhookUrl && (
                  <div className="sm:col-span-2">
                    <p className="text-caption text-content-muted">{t('docsync.webhookHint')}</p>
                    <code className="mt-1 block overflow-x-auto rounded-lg bg-surface-subtle px-2 py-1.5 text-caption text-content">
                      {link.webhookUrl}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {Object.keys(sync.itemCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(sync.itemCounts).map(([state, n]) => (
            <span key={state} className="rounded-full border border-edge px-2.5 py-1 text-caption text-content-muted">
              {t(`docsync.state.${state}`)}: {n}
            </span>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="space-y-2">
          <p className="text-caption font-medium text-content-muted">{t('docsync.addProvider')}</p>
          {sync.providers.map(p => (
            <ProviderRow
              key={p.id}
              provider={p}
              tripId={tripId}
              sync={sync}
              open={openProvider === p.id}
              onOpen={() => setOpenProvider(openProvider === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StateBadge({ state, t }: { state: string; t: (k: string) => string }) {
  const tone =
    state === 'ok' ? 'text-success'
    : state === 'never' ? 'text-content-faint'
    : state === 'partial' ? 'text-warning'
    : 'text-danger'
  return <span className={`text-caption ${tone}`}>{t(`docsync.linkState.${state}`)}</span>
}

/** One provider: credentials, a probe, then a folder to bind the trip to. */
function ProviderRow({
  provider, tripId, sync, open, onOpen,
}: {
  provider: DocSyncProvider
  tripId: number | string
  sync: ReturnType<typeof useDocSync>
  open: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const existing = sync.connectionFor(provider.id)
  const [values, setValues] = useState<Record<string, string>>({})
  const [insecure, setInsecure] = useState(existing?.allowInsecureTls ?? false)
  const [verdict, setVerdict] = useState<{ connected: boolean; account?: string; error?: string } | null>(null)
  const [scopes, setScopes] = useState<DocSyncScope[] | null>(null)
  const [newScopeName, setNewScopeName] = useState('')

  const baseUrl = values.base_url ?? existing?.baseUrl ?? ''
  const field = (key: string) => values[key] ?? existing?.settings?.[key] ?? ''

  const runTest = async () => {
    const res = await sync.testConnection(provider.id, baseUrl, values, insecure)
    setVerdict(res)
  }

  const save = async () => {
    const ok = await sync.saveConnection(provider.id, baseUrl, values, insecure)
    if (ok) setVerdict({ connected: true })
  }

  const loadScopes = async () => {
    const conn = sync.connectionFor(provider.id)
    if (!conn) return
    const res = await sync.loadScopes(conn.id)
    setScopes(res.scopes)
  }

  const bind = async (scope: DocSyncScope) => {
    const conn = sync.connectionFor(provider.id)
    if (!conn) return
    await sync.createLink({
      connectionId: conn.id,
      scopeKey: scope.scopeKey,
      remoteRootId: scope.remoteRootId,
      remoteRootPath: scope.remoteRootPath,
      remoteLabel: scope.label,
      direction: 'both',
      deletePolicy: 'unlink',
      conflictPolicy: 'manual',
      syncEnabled: true,
    })
    setScopes(null)
  }

  return (
    <div className="rounded-xl border border-edge bg-surface">
      <button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2">
          <Cloud size={15} className="text-content-muted" />
          <span className="text-body text-content">{provider.name}</span>
          {existing && <Check size={13} className="text-success" />}
        </span>
        <Plus size={15} className={`text-content-faint transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-edge px-4 py-3">
          {provider.fields.map(f => (
            <label key={f.field_key} className="block text-caption text-content-muted">
              {t(`docsync.${f.label}`)}{f.required && ' *'}
              {f.input_type === 'checkbox' ? (
                <div className="mt-1">
                  <ToggleSwitch on={insecure} onToggle={() => setInsecure(!insecure)} />
                </div>
              ) : (
                <input
                  type={f.input_type === 'password' ? 'password' : 'text'}
                  // A stored secret is never sent back, so the field stays empty
                  // and an empty field means "keep what is stored".
                  placeholder={f.secret && existing?.secrets?.[f.field_key] ? '••••••••' : f.placeholder || ''}
                  value={f.secret ? (values[f.field_key] ?? '') : field(f.field_key)}
                  onChange={e => setValues({ ...values, [f.field_key]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-body text-content"
                />
              )}
              {f.hint && <span className="mt-0.5 block text-caption text-content-faint">{t(`docsync.${f.hint}`)}</span>}
            </label>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void runTest()} disabled={sync.busy === 'test'}
              className="rounded-lg border border-edge px-3 py-1.5 text-caption text-content hover:bg-surface-hover disabled:opacity-50">
              {sync.busy === 'test' ? <Loader2 size={13} className="animate-spin" /> : t('docsync.test')}
            </button>
            <button type="button" onClick={() => void save()} disabled={sync.busy === 'save'}
              className="rounded-lg bg-accent px-3 py-1.5 text-caption text-accent-contrast disabled:opacity-50">
              {t('common.save')}
            </button>
            {existing && (
              <button type="button" onClick={() => void loadScopes()}
                className="rounded-lg border border-edge px-3 py-1.5 text-caption text-content hover:bg-surface-hover">
                {t('docsync.chooseFolder')}
              </button>
            )}
            {verdict && (
              <span className={`text-caption ${verdict.connected ? 'text-success' : 'text-danger'}`}>
                {verdict.connected
                  ? t('docsync.connected') + (verdict.account ? ` (${verdict.account})` : '')
                  : t(`docsync.error.${verdict.error || 'unknown'}`)}
              </span>
            )}
          </div>

          {scopes && (
            <div className="space-y-2 rounded-lg border border-edge bg-surface-subtle p-3">
              <p className="text-caption text-content-muted">{t('docsync.chooseFolderHint')}</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {scopes.map(s => (
                  <button key={s.scopeKey} type="button" onClick={() => void bind(s)}
                    className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-caption text-content hover:bg-surface-hover">
                    {s.label}
                    {s.remoteRootPath && <span className="ml-2 text-content-faint">{s.remoteRootPath}</span>}
                  </button>
                ))}
                {scopes.length === 0 && <p className="text-caption text-content-faint">{t('docsync.noFolders')}</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={newScopeName}
                  onChange={e => setNewScopeName(e.target.value)}
                  placeholder={t('docsync.newFolderPlaceholder')}
                  className="flex-1 rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-caption text-content"
                />
                <button
                  type="button"
                  disabled={!newScopeName.trim() || sync.busy === 'scope'}
                  onClick={async () => {
                    const conn = sync.connectionFor(provider.id)
                    if (!conn) return
                    const created = await sync.createScope(conn.id, newScopeName.trim())
                    setNewScopeName('')
                    await bind(created)
                  }}
                  className="rounded-lg border border-edge px-3 py-1.5 text-caption text-content hover:bg-surface-hover disabled:opacity-50"
                >
                  {t('docsync.createFolder')}
                </button>
              </div>
            </div>
          )}

          {sync.error && <p className="text-caption text-danger">{t(`docsync.error.${sync.error}`)}</p>}
        </div>
      )}
    </div>
  )
}
