import { describe, it, expect, vi, beforeEach } from 'vitest'

const plyrCtor = vi.fn()
vi.mock('plyr', () => ({
  default: class {
    constructor(el: HTMLElement, options: Record<string, unknown>) {
      plyrCtor(el, options)
    }
    destroy = vi.fn()
  },
}))
vi.mock('plyr/dist/plyr.css', () => ({}))

import { render } from '../../../tests/helpers/render'
import VideoPlayer from './VideoPlayer'

describe('VideoPlayer', () => {
  beforeEach(() => { plyrCtor.mockClear() })

  it('hands Plyr the sprite from this origin, not the one on cdn.plyr.io (#2341)', () => {
    // connect-src refuses cdn.plyr.io, so with the default the player worked and
    // every button in it was blank. The sprite ships with the bundle instead.
    render(<VideoPlayer src="/api/photos/7/original" autoPlay={false} />)

    expect(plyrCtor).toHaveBeenCalledTimes(1)
    const [, options] = plyrCtor.mock.calls[0]
    // A hashed asset URL in the bundle, the raw file (with its query) under vitest.
    expect(String(options.iconUrl)).toMatch(/plyr[^/]*\.svg(\?|$)/)
    expect(String(options.iconUrl)).not.toContain('cdn.plyr.io')
  })

  it('resets the element to an empty source on teardown rather than a clip on the CDN', () => {
    // media-src refuses cdn.plyr.io too; an empty source aborts the stream just the
    // same, and the element is unmounted in the same tick.
    render(<VideoPlayer src="/api/photos/7/original" autoPlay={false} />)

    const [, options] = plyrCtor.mock.calls[0]
    expect(options.blankVideo).toBe('')
  })

  it('mounts the player on the video element it renders', () => {
    const { container } = render(<VideoPlayer src="/api/photos/7/original" poster="/api/photos/7/thumbnail" />)

    const [el] = plyrCtor.mock.calls[0]
    expect(el).toBe(container.querySelector('video'))
    expect(container.querySelector('video')).toHaveAttribute('poster', '/api/photos/7/thumbnail')
  })
})
