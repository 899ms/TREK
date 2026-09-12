// FE-DAWARICH-ATLASDLG-001 to FE-DAWARICH-ATLASDLG-009
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../tests/helpers/render'
import { fireEvent } from '@testing-library/react'
import DawarichAtlasDialog from './DawarichAtlasDialog'

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
vi.mock('../shared/Toast', () => ({ useToast: () => toast, default: () => toast }))

const repo = {
  bucketScan: vi.fn(),
  atlasSuggestions: vi.fn(),
}
vi.mock('../../repo/dawarichRepo', () => ({
  dawarichRepo: {
    bucketScan: (...args: unknown[]) => repo.bucketScan(...args),
    atlasSuggestions: (...args: unknown[]) => repo.atlasSuggestions(...args),
  },
  DawarichOfflineError: class extends Error {},
}))

const api = {
  confirmBucketVisits: vi.fn(),
  acceptAtlasCountries: vi.fn(),
}
vi.mock('../../api/dawarich', () => ({
  dawarichApi: {
    confirmBucketVisits: (...args: unknown[]) => api.confirmBucketVisits(...args),
    acceptAtlasCountries: (...args: unknown[]) => api.acceptAtlasCountries(...args),
  },
}))

const SCAN = {
  matches: [
    {
      itemId: 11,
      name: 'Museum Ludwig',
      match: { at: '2026-09-10T14:00:00Z', minutes: 145, distanceMeters: 49, points: 60 },
      alreadyVisited: false,
    },
    {
      itemId: 12,
      name: 'Kölner Dom',
      match: { at: '2026-09-09T14:00:00Z', minutes: 30, distanceMeters: 80, points: 12 },
      alreadyVisited: true,
    },
    { itemId: 13, name: 'Rheinpark', match: null, alreadyVisited: false },
  ],
  skippedWithoutCoordinates: 2,
  truncated: false,
  fetchedAt: '2026-09-12T10:00:00Z',
}

const COUNTRIES = {
  countries: [
    { countryCode: 'DE', sourceName: 'Germany', cities: [{ name: 'Cologne', minutes: 400, lastSeenAt: '2026-09-10T10:00:00Z' }], alreadyVisited: true },
    { countryCode: 'NL', sourceName: 'Netherlands', cities: [{ name: 'Maastricht', minutes: 90, lastSeenAt: '2026-09-08T10:00:00Z' }], alreadyVisited: false },
  ],
  unresolved: ['Freedonia'],
  fetchedAt: '2026-09-12T10:00:00Z',
}

function open(props: Partial<React.ComponentProps<typeof DawarichAtlasDialog>> = {}) {
  return render(<DawarichAtlasDialog isOpen onClose={vi.fn()} {...props} />)
}

beforeEach(() => {
  toast.success.mockReset()
  toast.error.mockReset()
  repo.bucketScan.mockReset().mockResolvedValue(SCAN)
  repo.atlasSuggestions.mockReset().mockResolvedValue(COUNTRIES)
  api.confirmBucketVisits.mockReset().mockResolvedValue({ updated: 1 })
  api.acceptAtlasCountries.mockReset().mockResolvedValue({ marked: 1 })
})

describe('DawarichAtlasDialog', () => {
  it('FE-DAWARICH-ATLASDLG-001: asks nothing on its own — the scan runs when the reader says so', () => {
    open()
    expect(repo.bucketScan).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check wishlist' })).toBeInTheDocument()
  })

  it('FE-DAWARICH-ATLASDLG-002: offers no confirmation before there is anything to confirm', () => {
    open()
    // Hidden until a result is on screen rather than merely disabled: a greyed
    // out "Tick off 0" is a dead control asking to be understood, and `hidden`
    // keeps it out of the accessibility tree too.
    expect(screen.queryByRole('button', { name: /Tick off/ })).toBeNull()
  })

  it('FE-DAWARICH-ATLASDLG-003: a scan lists what it found, with the distance, the time and the day', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Check wishlist' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toBeInTheDocument())
    const row = screen.getByRole('checkbox', { name: 'Museum Ludwig' })
    expect(row.textContent).toContain('49 m away')
    expect(row.textContent).toContain('2 h 25 min')
    // A wish with no match at all is not a row — there is nothing to decide.
    expect(screen.queryByRole('checkbox', { name: 'Rheinpark' })).not.toBeInTheDocument()
  })

  it('FE-DAWARICH-ATLASDLG-004: open wishes start selected, already ticked ones do not', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Check wishlist' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Kölner Dom' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox', { name: 'Kölner Dom' })).toBeDisabled()
  })

  it('FE-DAWARICH-ATLASDLG-005: unticking a row takes it out of what gets written', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Check wishlist' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('checkbox', { name: 'Museum Ludwig' }))

    expect(screen.getByRole('button', { name: /Tick off 0/ })).toBeDisabled()
  })

  it('FE-DAWARICH-ATLASDLG-006: confirming writes exactly the picked wishes and reports back', async () => {
    const onChanged = vi.fn()
    open({ onChanged })
    fireEvent.click(screen.getByRole('button', { name: 'Check wishlist' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Tick off 1/ }))

    // With the date the stay was actually reached on — a wish from last year
    // ticked off with today's date is a wrong entry in a list people keep.
    await waitFor(() => expect(api.confirmBucketVisits).toHaveBeenCalledWith([11], '2026-09-10T14:00:00Z'))
    expect(onChanged).toHaveBeenCalled()
    // Marked in place rather than rescanned — one upstream request per wish is
    // not worth spending to tell the reader what they just did.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Museum Ludwig' })).toBeDisabled())
    expect(repo.bucketScan).toHaveBeenCalledTimes(1)
  })

  it('FE-DAWARICH-ATLASDLG-007: the countries tab offers only what the Atlas does not already have', async () => {
    open({ initialTab: 'countries' })
    fireEvent.click(screen.getByRole('button', { name: 'Look for countries' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Netherlands' })).toBeInTheDocument())
    expect(screen.queryByRole('checkbox', { name: 'Germany' })).not.toBeInTheDocument()
    // A country Dawarich named but TREK could not code is said out loud, not dropped.
    expect(screen.getByText(/Freedonia/)).toBeInTheDocument()
  })

  it('FE-DAWARICH-ATLASDLG-008: confirming countries sends their codes', async () => {
    open({ initialTab: 'countries' })
    fireEvent.click(screen.getByRole('button', { name: 'Look for countries' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Netherlands' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Add 1 countries/ }))

    await waitFor(() => expect(api.acceptAtlasCountries).toHaveBeenCalledWith(['NL']))
  })

  it('FE-DAWARICH-ATLASDLG-009: a scan that fails says so and leaves the dialog usable', async () => {
    repo.bucketScan.mockRejectedValue({ response: { data: { error: 'Dawarich rejected the API key.' } } })
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Check wishlist' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Dawarich rejected the API key.'))
    expect(screen.getByRole('button', { name: 'Check wishlist' })).toBeInTheDocument()
  })
})
