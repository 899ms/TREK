import { useCallback, useEffect, useMemo, useState } from 'react'
import { docsyncApi } from '../../../api/client'

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
}

export function useDocSync(tripId: number | string, enabled: boolean) {
  const [providers, setProviders] = useState<DocSyncProvider[]>([])
  const [connections, setConnections] = useState<DocSyncConnection[]>([])
  const [links, setLinks] = useState<DocSyncLink[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const [p, c, l, s] = await Promise.all([
        docsyncApi.providers(tripId),
        docsyncApi.listConnections(tripId),
        docsyncApi.listLinks(tripId),
        docsyncApi.status(tripId),
      ])
      setProviders(p as DocSyncProvider[])
      setConnections(c as DocSyncConnection[])
      setLinks(l as DocSyncLink[])
      setItemCounts(((s as { items?: Record<string, number> }).items) || {})
      setError(null)
    } catch {
      // A failure here means the addon is off or the user lost access, both of
      // which the panel renders as "nothing to configure" rather than an alarm.
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [tripId, enabled])

  useEffect(() => { void load() }, [load])

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

  const createScope = useCallback(async (connectionId: number, name: string) => {
    setBusy('scope')
    try {
      return await docsyncApi.createScope(tripId, connectionId, name) as DocSyncScope
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
      const res = await docsyncApi.syncNow(tripId, linkId, full)
      await load()
      return res as { state: string; pulled: number; pushed: number; conflicts: number; missing: number }
    } finally {
      setBusy(null)
    }
  }, [tripId, load])

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
    createLink, updateLink, removeLink, syncNow, resolveConflict,
  }
}

function readError(e: unknown): string {
  const res = (e as { response?: { data?: { error?: string; message?: string } } })?.response
  return res?.data?.error || res?.data?.message || 'unknown'
}
