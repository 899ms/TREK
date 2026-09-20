import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// jsdom lays nothing out, so the rules themselves are the assertion, the way
// releaseNoticeCss.test.ts pins the notice's stacking.
describe('dashboard css', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/dashboard.css'), 'utf8')
  const block = (selector: string): string => {
    const at = css.indexOf(selector)
    expect(at, `${selector} missing from dashboard.css`).toBeGreaterThan(-1)
    return css.slice(at, css.indexOf('}', at) + 1)
  }

  it('FE-DASH-CSS-001: a hero title that is one long word cannot widen the card', () => {
    // Reported from Discord: with a title like "asdaaaa…" the tools row and the
    // boarding pass grew to the width of the word, and edit, clone, archive and
    // delete sat off the card. The grid column may not grow past the hero, and the
    // title breaks inside the card and stops at two lines.
    expect(block('.trek-dash .hero-content {')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(block('.trek-dash .hero-title-block {')).toMatch(/min-width:\s*0/)
    const title = block('.trek-dash .hero-title {')
    expect(title).toMatch(/overflow-wrap:\s*anywhere/)
    expect(title).toMatch(/-webkit-line-clamp:\s*2/)
    expect(title).toMatch(/overflow:\s*hidden/)
  })
})
