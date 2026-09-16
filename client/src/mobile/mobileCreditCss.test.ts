import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// FE-MOB-CREDITCSS-001 to FE-MOB-CREDITCSS-005
//
// Where the credit lands on the phone trip map is written in mobile.css, against the vendor
// control containers the GL engines draw and the Leaflet column. jsdom applies neither
// stylesheet, so these read the real file: the numbers only agree with the vendor CSS and
// with MMapArea's floor by convention, which is exactly what can drift here.
describe('phone map credit css', () => {
  // Vitest runs with the client package as its root, so cwd is stable here.
  const css = readFileSync(resolve(process.cwd(), 'src/mobile/mobile.css'), 'utf8')

  /**
   * Every rule in the sheet as its selector list and its declarations, comments dropped.
   * Parsed rather than found by substring, because the same selector heads more than one
   * rule here (the generic lift and the round (i) both name the GL bottom right corner).
   */
  const rules = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .filter(chunk => chunk.includes('{'))
    .map(chunk => {
      const open = chunk.lastIndexOf('{')
      const head = chunk.slice(0, open)
      return {
        selectors: head.slice(head.lastIndexOf('{') + 1).split(',').map(s => s.trim()),
        body: chunk.slice(open + 1),
      }
    })
  /** The rules whose selector list names this selector. */
  const rulesFor = (selector: string) => rules.filter(rule => rule.selectors.includes(selector))

  it('FE-MOB-CREDITCSS-001: the credit corner derives both numbers from the floor MMapArea defines', () => {
    const corner = rulesFor('.m-root .m-credit-corner')

    expect(corner).toHaveLength(1)
    // The locate button's own margin on the right, a gap above the dock or the stage bar below.
    expect(corner[0].body).toMatch(/--m-credit-right:\s*12px;/)
    expect(corner[0].body).toMatch(/--m-credit-bottom:\s*calc\(var\(--m-map-floor\) \+ 12px\);/)
  })

  it('FE-MOB-CREDITCSS-002: the GL (i) lands on those numbers, net of the compact control\'s own margin', () => {
    const gl = rulesFor('.m-root .m-credit-corner .maplibregl-ctrl-bottom-right')

    expect(gl).toHaveLength(1)
    // One rule for both engines, so MapLibre and Mapbox cannot end up in different corners.
    expect(gl[0].selectors).toContain('.m-root .m-credit-corner .mapboxgl-ctrl-bottom-right')
    // The vendor sheets give the compact attribution a 10px margin on every side.
    expect(gl[0].body).toMatch(/bottom:\s*calc\(var\(--m-credit-bottom\) - 10px\);/)
    expect(gl[0].body).toMatch(/right:\s*calc\(var\(--m-credit-right\) - 10px\);/)

    // The Mapbox wordmark shares the row rather than rising with the band under the compass.
    const wordmark = rulesFor('.m-root .m-credit-corner .mapboxgl-ctrl-bottom-left')
    expect(wordmark).toHaveLength(1)
    expect(wordmark[0].selectors).toContain('.m-root .m-credit-corner .maplibregl-ctrl-bottom-left')
    expect(wordmark[0].body).toMatch(/bottom:\s*calc\(var\(--m-credit-bottom\) - 6px\);/)
  })

  it('FE-MOB-CREDITCSS-003: the open Leaflet credit unfolds in the row, left of the (i), not over the locate button', () => {
    const open = rulesFor('.m-root .m-credit-corner .m-attrib-open .leaflet-control-attribution')

    expect(open).toHaveLength(1)
    expect(open[0].body).toMatch(/right:\s*calc\(var\(--m-credit-right\) \+ 36px\);/)
    expect(open[0].body).toMatch(/bottom:\s*var\(--m-credit-bottom\);/)
  })

  it('FE-MOB-CREDITCSS-004: phone maps without a credit row keep the credit beside their locate button', () => {
    // The collections and journey maps have no `m-credit-corner`, so the unscoped rules are
    // still what places their credit.
    expect(rulesFor('.m-root .maplibregl-ctrl-bottom-right').some(rule => /right:\s*46px;/.test(rule.body))).toBe(true)
    expect(rulesFor('.m-root .m-attrib-open .leaflet-control-attribution').some(
      rule => /bottom:\s*calc\(var\(--bottom-nav-h\) \+ 52px\);/.test(rule.body),
    )).toBe(true)

    // The band's own lift stays in MMapArea's class, where FE-MOB-MAPAREA-003 pins it. A
    // corner rule setting it too would move every round control from a stylesheet.
    const corner = rules.filter(rule => rule.selectors.some(s => s.includes('.m-credit-corner')))
    expect(corner).toHaveLength(5)
    for (const rule of corner) expect(rule.body).not.toContain('--bottom-nav-h')
  })

  it('FE-MOB-CREDITCSS-005: an open GL credit keeps its (i) in the corner rather than under the locate button', () => {
    const button = rulesFor('.m-root .m-credit-corner .maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib-button')

    expect(button).toHaveLength(1)
    expect(button[0].selectors).toContain('.m-root .m-credit-corner .mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-attrib-button')
    // Both vendor sheets put the button at the top of the control, so a credit wrapping to
    // three lines would carry it up into the locate button right above the corner.
    expect(button[0].body).toMatch(/top:\s*auto;/)
    expect(button[0].body).toMatch(/bottom:\s*0;/)
  })
})
