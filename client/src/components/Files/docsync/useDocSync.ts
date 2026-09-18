import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { docsyncApi } from '../../../api/client'
import { useServerPing } from '../../../sync/useServerPing'

/**
 * All document-sync state and actions, in one hook.
 *
 * Deliberately a hook rather than logic inside the panel: the phone shell is a
 * separate component tree (client/src/mobile/screens/trip/...), and duplicating
 * this across both would land on SonarCloud's 3% duplication budget the way the
 * photo provider section already does. `useDawarichConnection` states the same
 * reason for the same problem.
 */

export interface DocSyncField {
  field_key: string
  label: string
  input_type: string
  placeholder: string | null
  hint: string | null
  required: boolean
  secret: boolean
}

export interface DocSyncProvider {
  id: string
  name: string
  description: string | null
  icon: string
  available: boolean
  fields: DocSyncField[]
}

export interface DocSyncConnection {
  id: number
  providerId: string
  baseUrl: string
  settings: Record<string, string>
  secrets: Record<string, string>
  allowInsecureTls: boolean
  lastProbeState: string
  lastProbeError: string | null
}

export interface DocSyncScope {
  scopeKey: string
  label: string
  remoteRootId: string | null
  remoteRootPath: string | null
}

export interface DocSyncLink {
  id: number
  connectionId: number
  providerId: string
  scopeKey: string
  remoteLabel: string
  remoteRootPath: string | null
  direction: 'both' | 'pull' | 'push'
  deletePolicy: 'unlink' | 'trash'
  conflictPolicy: string
  syncEnabled: boolean
  lastSyncAt: string | null
  lastSyncState: string
  lastSyncError: string | null
  webhookUrl: string | null
  /** Standing counts per side, from the status route. */
  holdings?: { inTrek: number; atProvider: number; paired: number; missing: number }
}

/**
 * Whether this person may change a sync binding.
 *
 * Only the trip owner: the credential a binding stores usually reaches that
 * person's entire document archive, so letting any member repoint it would
 * share a folder the owner never chose to share. Instance admins are included
 * because they already override every other permission check in the client.
 *
 * Shared by both shells rather than written out twice — the desktop file
 * manager and the phone sheet must not be able to drift on who may do this.
 */
export function canManageDocSync(
  user: { id?: number | string; role?: string } | null | undefined,
  trip: { user_id?: number | string } | null | undefined,
): boolean {
  if (!user) return false
  return user.role === 'admin' || Number(trip?.user_id) === Number(user.id)
}

export function useDocSync(tripId: number | string, enabled: boolean) {
  const [providers, setProviders] = useState<DocSyncProvider[]>([])
  const [connections, setConnections] = useState<DocSyncConnection[]>([])
  const [links, setLinks] = useState<DocSyncLink[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  /**
   * What the last run of each binding moved, so the flow bar can show numbers
   * on its lanes. Kept in memory rather than persisted: it describes one run,
   * and after a reload "nothing moved since you got here" is the honest answer.
   */
  const [lastRun, setLastRun] = useState<Record<number, { pulled: number; pushed: number }>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Whether the first load is through.
   *
   * Every mutation refreshes, and a refresh that flips `loading` swaps the whole
   * dialog for a spinner and back — a white flash on something as small as
   * toggling a direction. Only the first load has nothing to show yet.
   */
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!enabled) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const [p, c, l, s] = await Promise.all([
        docsyncApi.providers(tripId),
        docsyncApi.listConnections(tripId),
        docsyncApi.listLinks(tripId),
        docsyncApi.status(tripId),
      ])
      setProviders(p as DocSyncProvider[])
      setConnections(c as DocSyncConnection[])
      // The status route carries the holdings; the links route does not, so the
      // two are merged here rather than asking every caller to join them.
      const status = s as { items?: Record<string, number>; links?: DocSyncLink[] }
      const holdingsById = new Map((status.links ?? []).map(x => [x.id, x.holdings]))
      setLinks((l as DocSyncLink[]).map(x => ({ ...x, holdings: holdingsById.get(x.id) })))
      setItemCounts(status.items || {})
      setError(null)
      loadedOnce.current = true
    } catch {
      // A failure here means the addon is off or the user lost access, both of
      // which the panel renders as "nothing to configure" rather than an alarm.
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [tripId, enabled])

  useEffect(() => { void load() }, [load])

  // A run started by another member moves the same documents and the same
  // counts. The event is a ping rather than a payload: the numbers it would
  // carry are per-binding server state, and reading them back is the only way
  // this panel and that member's panel end up saying the same thing.
  useServerPing('docsync:changed', enabled, load)

  const connectionFor = useCallback(
    (providerId: string) => connections.find(c => c.providerId === providerId) || null,
    [connections],
  )

  const saveConnection = useCallback(async (providerId: string, baseUrl: string, credentials: Record<string, string>, allowInsecureTls: boolean) => {
    setBusy('save')
    setError(null)
    try {
      await docsyncApi.saveConnection(tripId, { providerId, baseUrl, credentials, allowInsecureTls })
      await load()
      return true
    } catch (e: unknown) {
      setError(readError(e))
      return false
    } finally {
      setBusy(null)
    }
  }, [tripId, load])

  /**
   * Probe without saving. Always resolves to a verdict object — the route
   * answers 200 even for an unreachable instance, because a form showing a typo
   * needs a field to render, not an exception.
   */
  const testConnection = useCallback(async (providerId: string, baseUrl: string, credentials: Record<string, string>, allowInsecureTls: boolean) => {
    setBusy('test')
    try {
      return await docsyncApi.testConnection(tripId, { providerId, baseUrl, credentials, allowInsecureTls }) as {
        connected: boolean; account?: string; error?: string; detail?: string
      }
    } catch (e: unknown) {
      return { connected: false, error: readError(e) }
    } finally {
      setBusy(null)
    }
  }, [tripId])

  const loadScopes = useCallback(async (connectionId: number, q?: string) => {
    const res = await docsyncApi.listScopes(tripId, connectionId, q) as { scopes: DocSyncScope[]; error?: string }
    return res
  }, [tripId])

  /**
   * Make a container at the provider.
   *
   * Reports failure the same way every other write here does — a rejected
   * create used to escape as an unhandled rejection, so the button blinked and
   * nothing happened and nothing was said. Null rather than a throw, because
   * the caller's next step is to bind what came back, and there is nothing to
   * bind.
   */
  const createScope = useCallback(async (connectionId: number, name: string): Promise<DocSyncScope | null> => {
    setBusy('scope')
    setError(null)
    try {
      return await docsyncApi.createScope(tripId, connectionId, name) as DocSyncScope
    } catch (e: unknown) {
      setError(readError(e))
      return null
    } finally {
      setBusy(null)
    }
  }, [tripId])

  const createLink = useCallback(async (payload: Record<string, unknown>) => {
    setBusy('link')
    setError(null)
    try {
      await docsyncApi.createLink(tripId, payload)
      await load()
      return true
    } catch (e: unknown) {
      setError(readError(e))
      return false
    } finally {
      setBusy(null)
    }
  }, [tripId, load])

  const updateLink = useCallback(async (linkId: number, patch: Record<string, unknown>) => {
    setLinks(prev => prev.map(l => (l.id === linkId ? { ...l, ...patch } as DocSyncLink : l)))
    try {
      await docsyncApi.updateLink(tripId, linkId, patch)
    } finally {
      await load()
    }
  }, [tripId, load])

  const removeLink = useCallback(async (linkId: number) => {
    setBusy('link')
    try {
      await docsyncApi.deleteLink(tripId, linkId)
      await load()
    } finally {
      setBusy(null)
    }
  }, [tripId, load])

  const syncNow = useCallback(async (linkId: number, full = false) => {
    setBusy(`sync-${linkId}`)
    try {
      const res = await docsyncApi.syncNow(tripId, linkId, full) as {
        state: string; pulled: number; pushed: number; conflicts: number; missing: number
      }
      setLastRun(prev => ({ ...prev, [linkId]: { pulled: res.pulled ?? 0, pushed: res.pushed ?? 0 } }))
      await load()
      return res
    } finally {
      setBusy(null)
    }
  }, [tripId, load])

  const lastRunFor = useCallback(
    (linkId: number) => lastRun[linkId] ?? { pulled: 0, pushed: 0 },
    [lastRun],
  )

  const resolveConflict = useCallback(async (itemId: number, keep: 'trek' | 'provider' | 'both') => {
    await docsyncApi.resolve(tripId, itemId, keep)
    await load()
  }, [tripId, load])

  /** Providers the admin switched on that also have a working adapter. */
  const usableProviders = useMemo(() => providers.filter(p => p.available), [providers])

  return {
    providers: usableProviders,
    connections, links, itemCounts,
    loading, busy, error,
    connectionFor, load,
    saveConnection, testConnection,
    loadScopes, createScope,
    createLink, updateLink, removeLink, syncNow, resolveConflict, lastRunFor,
  }
}

function readError(e: unknown): string {
  const res = (e as { response?: { data?: { error?: string; message?: string } } })?.response
  return res?.data?.error || res?.data?.message || 'unknown'
}
