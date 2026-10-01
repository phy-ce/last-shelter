import '@pixi/layout'
import { LayoutContainer } from '@pixi/layout/components'
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { Button, CheckBox, ScrollBox, Slider } from '@pixi/ui'
import { gsap } from 'gsap'
import { motionOn } from '../core/settings.js'
import { uiIcon } from './icons.js'

const C = { paper: 0xe3d5c1, muted: 0xad9985, gold: 0xdfbd83, panel: 0x221b20, line: 0x655247 }
const font = 'Malgun Gothic, sans-serif'
const rarity = { common: 0x8c867c, uncommon: 0x859b80, rare: 0x8b9dc4, epic: 0xba92c0, legendary: 0xdfbd83 }
const has = (node, names) => names.split(' ').some(name => node?.classList?.contains(name))
const clean = node => [...node.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim()
const box = (w, h, fill = C.panel, stroke = C.line, radius = 6) => {
  const view = new Container()
  const corner = Math.min(radius, 5)
  const shape = [corner, 0, w - corner, 0, w, corner, w, h - corner, w - corner, h, corner, h, 0, h - corner, 0, corner]
  view.addChild(
    new Graphics().poly(shape).fill(fill).stroke({ color: stroke, alpha: .9, width: 1.5 }),
    new Graphics().poly([corner + 4, 5, w - corner - 4, 5, w - 5, corner + 4, w - 5, h - corner - 4, w - corner - 4, h - 5, corner + 4, h - 5, 5, h - corner - 4, 5, corner + 4])
      .stroke({ color: stroke, alpha: .25, width: 1 }),
    new Graphics()
      .moveTo(10, 0).lineTo(Math.min(w - 10, 64), 0)
      .moveTo(w - Math.min(w - 10, 64), h).lineTo(w - 10, h)
      .stroke({ color: C.gold, alpha: .2, width: 2 })
  )
  return view
}
const label = (value, w, size = 14, color = C.paper, bold = false) => new Text({ text: String(value || ''), style: { fontFamily: font, fontSize: size, fill: color, fontWeight: bold ? 'bold' : 'normal', wordWrap: true, wordWrapWidth: Math.max(20, w), breakWords: true, lineHeight: size * 1.5 } })

/** Native Pixi presentation. The semantic DOM supplies labels and existing controller
 * callbacks only: no DOM bounds, CSS layout, screenshots or HTML textures are used.
 * It remains an accessibility/automation mirror while the controller is migrated. */
export async function createEngineUI(app, hooks) {
  const root = new Container({ label: 'engine-ui' })
  const hud = new Container(), hand = new Container(), combatDialogue = new Container(), dialogs = new Container(), tips = new Container()
  hand.sortableChildren = true
  const dropHint = new Graphics()
  root.addChild(hud, hand, combatDialogue, dialogs, tips, dropHint)
  app.stage.addChild(root)
  const textures = new Map(), controls = [], regions = []
  let dirty = true, tipDirty = true, pointer = { x: 0, y: 0 }, drag = null, coinTween = null, menuTip = null, coinView = null, editingSlider = false
  let lastModal = null, scrollY = 0, scrollbox = null
  let keyboardSelection = false, hoveredHandIndex = null
  const semantic = id => document.getElementById(id)
  const usesDomModal = modal => Boolean(modal && (modal.subtitle === 'CHOOSE SURVIVOR' || ['loot', 'inventory', 'coin', 'route'].includes(modal.type)))
  const dispatch = (node, type) => node.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', bubbles: false }))

  function art(node, w, h) {
    const view = new Container()
    let vector = node.tagName === 'svg' ? new XMLSerializer().serializeToString(node).replaceAll('currentColor', '#dfbd83') : null
    if (vector && has(node.parentElement, 'body-diagram')) vector = vector.replace('</svg>', '<style>.body-core,.body-segment{fill:#655247;stroke:#dfbd83;stroke-width:2}.body-segment.is-injured{fill:#8f4640;stroke:#d58d7c}.body-guide,.body-orbit{stroke:#655247;stroke-width:1}</style></svg>')
    const src = vector ? `data:image/svg+xml,${encodeURIComponent(vector)}` : node.currentSrc || node.src
    if (!src) return view
    const apply = texture => {
      if (view.destroyed) return
      const sprite = new Sprite(texture)
      const scale = Math.min(w / texture.width, h / texture.height)
      sprite.scale.set(scale)
      sprite.position.set((w - sprite.width) / 2, (h - sprite.height) / 2)
      view.addChild(sprite)
    }
    if (textures.has(src)) apply(textures.get(src))
    else if (node instanceof HTMLImageElement && node.complete && node.naturalWidth) {
      const texture = Texture.from(node); textures.set(src, texture); apply(texture)
    } else Assets.load(src).then(texture => { textures.set(src, texture); apply(texture) }).catch(error => console.warn('UI asset:', error.message))
    return view
  }

  function interactive(view, source, w, h, action = () => source.click()) {
    view.hitArea = new Rectangle(0, 0, w, h)
    const button = new Button(view)
    // Keep this display object alive through pointerup/pointertap. Redrawing on
    // pointerdown destroys @pixi/ui's Button before it can emit onPress.
    view.on('pointerdown', () => { keyboardSelection = false })
    button.enabled = !source.disabled
    button.onPress.connect((_, event) => { event?.stopPropagation(); source.focus?.({ preventScroll: true }); action() })
    button.onHover.connect(() => {
      dispatch(source, 'pointerenter'); view.alpha = source.disabled ? .45 : 1
      const tip = source.querySelector('.menu-tip')
      if (tip) { menuTip = tip.querySelector('strong')?.textContent || source.getAttribute('aria-label'); tipDirty = true }
      if (!has(source, 'card')) gsap.to(view.scale, { x: 1.025, y: 1.025, duration: motionOn() ? .12 : 0, overwrite: true })
    })
    button.onOut.connect(() => {
      dispatch(source, 'pointerleave'); view.alpha = source.disabled ? .45 : 1; menuTip = null; tipDirty = true
      if (!has(source, 'card')) gsap.to(view.scale, { x: 1, y: 1, duration: .12, overwrite: true })
    })
    button.onDown.connect(() => { if (!has(source, 'card')) gsap.to(view.scale, { x: .97, y: .97, duration: .08, overwrite: true }) })
    button.onUp.connect(() => { if (!has(source, 'card')) gsap.to(view.scale, { x: 1, y: 1, duration: .08, overwrite: true }) })
    view.alpha = source.disabled ? .45 : 1
    view.on('rightclick', event => {
      event.stopPropagation()
      source.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    controls.push({ view, source, w, h })
    return view
  }

  function textButton(source, w = 180, h = 44, text = source.textContent.trim()) {
    const view = new Container()
    const primary = has(source, 'primary class-confirm')
    view.addChild(box(w, h, primary ? 0x432b2d : C.panel, primary || has(source, 'selected upgrade-selected') ? 0xb88978 : C.line))
    const copy = label(text, w - 24, 14, primary ? C.gold : C.paper, true)
    copy.position.set(12, Math.max(8, (h - copy.height) / 2)); view.addChild(copy)
    interactive(view, source, w, h)
    return { view, w, h }
  }

  function iconCount(glyph, value) {
    const view = new Container()
    view.addChild(art(glyph, 28, 28))
    if (value) { const count = label(value, 54, 12, C.paper, true); count.position.set(22, 17); view.addChild(count) }
    return { view, w: Math.max(38, view.width), h: 36 }
  }

  /** One shared card template, used by the hand, deck, rewards and details. */
  function card(source, w = 190, h = 288) {
    const view = new Container()
    const tone = Object.keys(rarity).find(key => has(source, `rarity-${key}`)) || 'common'
    const lockReason = source.querySelector('.injury-lock')?.textContent?.trim()
      || (has(source, 'unavailable') ? `행동력 부족 · 필요 ${source.querySelector('.cost')?.textContent || '?'}` : '')
    view.addChild(box(w, h, lockReason ? 0x2b181c : 0x251e24, has(source, 'selected upgrade-selected') ? C.gold : lockReason ? 0xb76262 : rarity[tone], 9))
    view.addChild(new Graphics().roundRect(5, 5, w - 10, h - 10, 6).stroke({ color: rarity[tone], alpha: .35, width: 1 }))
    if (has(source, 'flipped')) {
      const heading = label('LAST SHELTER', w - 32, 15, C.gold, true); heading.position.set(16, 28); view.addChild(heading)
      const flavor = label(source.querySelector('.card-flavor')?.textContent, w - 32, 14, C.muted); flavor.position.set(16, 80); view.addChild(flavor)
      interactive(view, source, w, h)
      return { view, w, h }
    }
    const img = source.querySelector('img:not(.upgrade-mark)')
    if (img) { const image = art(img, w - 16, 94); image.position.set(8, 8); view.addChild(image) }
    const provenance = source.querySelector('.item-source')?.textContent?.trim().replace(/^출처\s*[·:]\s*/, '')
    const pile = source.querySelector('.pile-label')?.textContent?.trim()
    if (provenance) {
      const uses = source.querySelector('.uses-badge')
      const origin = provenance === '스킬' ? '스킬' : `${uses ? '소모품' : '장비'} / ${provenance}`
      const ribbon = new Container()
      ribbon.position.set(8, 102)
      ribbon.addChild(new Graphics()
        .rect(0, 0, w - 16, 22)
        .fill({ color: 0x111314, alpha: .96 })
        .stroke({ color: rarity[tone], alpha: .72, width: 1 }))
      const originText = label([origin, pile].filter(Boolean).join(' · '), w - 30, 10, rarity[tone], true)
      originText.position.set(7, 4)
      ribbon.addChild(originText)
      view.addChild(ribbon)
    }
    const title = (source.querySelector('.card-title') || source.querySelector('.content > strong') || source.querySelector('strong'))?.textContent || ''
    const titleCost = title.match(/\s*·\s*(\d+) AP$/)
    const titleText = label(title.replace(/\s*·\s*\d+ AP$/, ''), w - 24, 15, C.gold, true); titleText.position.set(12, 132); view.addChild(titleText)
    const metricsY = 156
    const metrics = source.querySelector('.card-metrics')
    if (metrics) {
      let x = 12
      for (const metric of metrics.children) {
        const glyph = metric.querySelector('svg'); if (glyph) { const image = art(glyph, 18, 18); image.position.set(x, metricsY); view.addChild(image); x += 22 }
        const value = label(clean(metric), 55, 14, C.gold, true); value.position.set(x, metricsY - 1); view.addChild(value); x += value.width + 12
      }
    }
    const detail = source.querySelector('.card-detail, .card-rules, .card-summary')?.textContent || ''
    const divider = new Graphics()
      .moveTo(0, 0).lineTo(w - 24, 0).stroke({ color: rarity[tone], alpha: .62, width: 1 })
      .moveTo(0, 2).lineTo(Math.min(54, w - 24), 2).stroke({ color: rarity[tone], alpha: .28, width: 1 })
    divider.position.set(12, 184); view.addChild(divider)
    const detailZone = new Container()
    detailZone.position.set(12, 194)
    const copy = label(detail, w - 24, 13)
    const detailMask = new Graphics().rect(0, 0, w - 24, 58).fill(0xffffff)
    detailZone.addChild(copy, detailMask)
    detailZone.mask = detailMask
    view.addChild(detailZone)
    const cost = source.querySelector('.cost')
    if (cost || titleCost) { const token = iconCount(uiIcon('energy'), cost?.textContent || titleCost[1]); token.view.position.set(w - 48, 10); view.addChild(token.view) }
    const uses = source.querySelector('.uses-badge')
    if (uses) { const token = label(uses.textContent, w - 24, 11); token.position.set(12, h - 26); view.addChild(token) }
    const shortcut = source.querySelector('.shortcut')
    if (shortcut) { const token = label(shortcut.textContent, 30, 14, C.gold); token.position.set(12, 12); view.addChild(token) }
    const upgrade = source.querySelector('img.upgrade-mark'); if (upgrade) { const mark = art(upgrade, 32, 32); mark.position.set(w - 44, 66); view.addChild(mark) }
    const count = source.querySelector('.card-count')
    if (count) { const quantity = label(count.textContent, 40, 14, C.gold, true); quantity.position.set(12, 12); view.addChild(quantity) }
    if (lockReason) {
      const warning = new Container(), bandH = 34
      // Resting hand cards extend below the viewport. Keep the lock reason in
      // the portion that is always visible instead of burying it at the foot.
      warning.position.set(6, 66)
      warning.addChild(new Graphics().rect(0, 0, w - 12, bandH).fill({ color: 0x541f27, alpha: .94 }))
      const reason = label(lockReason, w - 28, 11, 0xf4b8b0, true); reason.position.set(8, 7); warning.addChild(reason)
      view.addChild(warning)
    }
    if (source.tagName === 'BUTTON' || source.querySelector('.card-back')) interactive(view, source, w, h)
    return { view, w, h }
  }

  function layoutNode(node, width) {
    if (node.hidden || has(node, 'sr-only menu-tip card-back hp-loss enemy-hp-loss eyebrow instruction class-select-cta class-info-hint upgrade-guide-label upgrade-mode-guide upgrade-selection-mark')) return { view: new Container(), w: 0, h: 0 }
    if (node.nodeType === 3) { const text = label(node.textContent.trim(), width); return { view: text, w: width, h: text.text ? text.height : 0 } }
    if (has(node, 'intent-token')) return iconCount(node.querySelector('svg'), node.querySelector('.intent-value')?.textContent)
    if (has(node, 'enemy-intent')) {
      const view = new Container(); let x = 0
      for (const token of node.children) { const item = layoutNode(token, 50); item.view.x = x; view.addChild(item.view); x += item.w + 12 }
      return { view, w: Math.max(0, x - 12), h: 36 }
    }
    if (has(node, 'status-token')) {
      const view = new Container(), glyph = node.querySelector('svg')
      if (glyph) { const icon = art(glyph, 28, 28); icon.position.set(4, 2); view.addChild(icon) }
      const valueText = node.querySelector('.status-value')?.textContent?.trim()
      if (valueText) {
        const value = label(valueText, 24, 13, C.paper, true)
        value.position.set(24, 22); view.addChild(value)
      }
      if (node.tagName === 'BUTTON') interactive(view, node, 40, 40)
      return { view, w: 40, h: 40 }
    }
    if (node.tagName === 'IMG' || node.tagName === 'svg') {
      const body = has(node.parentElement, 'body-diagram'), icon = node.tagName === 'svg' && !body, h = body ? 300 : icon ? 24 : has(node.parentElement, 'class-portrait') ? 170 : 110
      return { view: art(node, icon ? 24 : width, h), w: icon ? 24 : width, h }
    }
    if (has(node, 'coin')) {
      const image = node.querySelector(has(node, 'show-tails') ? 'img.coin-tails' : 'img.coin-heads')
      coinView = art(image, 180, 180)
      return { view: coinView, w: 180, h: 180 }
    }
    if (has(node, 'art-card') && !has(node, 'upgrade-skill-card')) return card(node, Math.min(width, 220), 310)
    if (has(node, 'health-track limb-hp-bar enemy-hp-bar')) return { view: new Container(), w: 0, h: 0 }
    if (has(node, 'vital')) {
      const view = new Container(), glyph = node.querySelector('svg')
      view.addChild(box(width, 48))
      if (glyph) { const icon = art(glyph, 24, 24); icon.position.set(10, 9); view.addChild(icon) }
      const text = label(`${node.querySelector('strong')?.textContent || ''} ${node.querySelector('small')?.textContent || ''}`, width - 48, 20, C.paper, true); text.position.set(42, 6); view.addChild(text)
      const value = parseFloat(node.querySelector('.health-track')?.style.getPropertyValue('--health') || '0') / 100
      view.addChild(new Graphics().rect(8, 40, Math.max(0, width - 16) * value, 3).fill(has(node, 'energy') ? C.gold : 0xb26e61))
      if (node.tagName === 'BUTTON') interactive(view, node, width, 48)
      return { view, w: width, h: 48 }
    }
    if (node.tagName === 'INPUT' && node.type === 'range') {
      const slider = new Slider({ bg: box(width, 10), fill: box(width, 10, C.gold), slider: box(18, 26, C.gold), min: Number(node.min), max: Number(node.max), step: Number(node.step) || 1, value: Number(node.value), showValue: true, valueTextStyle: { fontFamily: font, fontSize: 14, fill: C.paper } })
      slider.onUpdate.connect(value => { editingSlider = true; node.value = value; if (slider.readout) slider.readout.text = `${value}%`; node.dispatchEvent(new Event('input', { bubbles: true })) })
      slider.onChange.connect(() => { editingSlider = false; dirty = true })
      controls.push({ view: slider, source: node, w: width, h: 34 })
      return { view: slider, w: width, h: 34 }
    }
    if (node.tagName === 'INPUT' && node.type === 'checkbox') {
      const checked = box(30, 30, C.gold, C.gold), unchecked = box(30, 30)
      const tick = label('✓', 26, 22, 0x221b20, true); tick.position.set(4, -2); checked.addChild(tick)
      const toggle = new CheckBox({ style: { checked, unchecked }, checked: node.checked })
      toggle.eventMode = node.disabled ? 'none' : 'static'; toggle.alpha = node.disabled ? .4 : 1
      toggle.onCheck.connect(value => { node.checked = value; node.dispatchEvent(new Event('change', { bubbles: true })) })
      controls.push({ view: toggle, source: node, w: 30, h: 30 })
      return { view: toggle, w: 30, h: 30 }
    }
    if (has(node, 'bag-layout')) return bag(node, width)
    if (has(node, 'upgrade-workspace')) {
      const view = new Container()
      const railWidth = Math.floor(width * .68), railSource = node.querySelector('.upgrade-candidate-scroll')
      const railContent = layoutNode(railSource, railWidth - 24), railHeight = Math.max(260, app.screen.height - 410)
      const rail = new ScrollBox({ width: railWidth, height: railHeight, type: 'vertical', globalScroll: false, disableDynamicRendering: true, padding: 8 })
      rail.addItem(railContent.view); view.addChild(rail)
      const selection = layoutNode(node.querySelector('.upgrade-selection-panel'), width - railWidth - 22)
      selection.view.position.set(railWidth + 22, rail.y); view.addChild(selection.view)
      return { view, w: width, h: rail.y + Math.max(railHeight, selection.h) }
    }
    if (has(node, 'body-screen')) {
      const view = new Container(), diagram = layoutNode(node.firstElementChild, 240)
      view.addChild(diagram.view)
      const colWidth = (width - 290) / 2
      const items = [...node.children].slice(1).map(child => layoutNode(child, colWidth - 28))
      const rowHeight = Math.max(150, ...items.map(item => item.h + 28))
      items.forEach((item, index) => {
        const panel = new Container(); panel.addChild(box(colWidth, rowHeight, 0x211b20)); item.view.position.set(14, 14); panel.addChild(item.view)
        panel.position.set(270 + index % 2 * (colWidth + 20), Math.floor(index / 2) * (rowHeight + 20)); view.addChild(panel)
      })
      return { view, w: width, h: Math.max(300, rowHeight * 2 + 20) }
    }
    if (has(node, 'setting')) {
      const view = new Container(), input = node.querySelector('input'), button = node.querySelector('button')
      const title = label(clean(node.querySelector('label') || node.firstElementChild), width - 180, 15, C.paper, true)
      title.y = 10; view.addChild(title)
      let height = 60
      if (input?.type === 'range') {
        const control = layoutNode(input, width - 170); control.view.position.set(4, 44); view.addChild(control.view); height = 104
        const value = label(`${input.value}%`, 70, 15, C.gold); value.position.set(width - 250, 10); view.addChild(value); control.view.readout = value
      } else if (input) {
        const control = layoutNode(input, 30); control.view.position.set(width - 42, 8); view.addChild(control.view)
      }
      if (button) { const control = textButton(button, 148, 38); control.view.position.set(width - 148, input ? 28 : 2); view.addChild(control.view) }
      view.addChild(new Graphics().moveTo(0, height - 6).lineTo(width, height - 6).stroke({ color: C.line, alpha: .6, width: 1 }))
      return { view, w: width, h: height }
    }
    if (has(node, 'codex-entry') && has(node, 'flipped')) {
      const view = new Container(), copy = label(node.querySelector('.card-flavor')?.textContent, width - 28, 14, C.muted)
      view.addChild(box(width, 220)); copy.position.set(14, 30); view.addChild(copy)
      interactive(view, node, width, 220)
      return { view, w: width, h: 220 }
    }
    const children = [...node.childNodes].filter(child => child.nodeType === 1 || child.textContent.trim())
    if (!children.some(child => child.nodeType === 1)) {
      if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') return textButton(node, width)
      const cost = node.textContent.trim().match(/^(.*?)\s*(?:·\s*)?(\d+) AP$/)
      if (cost) { const view = new Container(), copy = label(cost[1].trim(), width - 52, 14, C.gold, true), token = iconCount(uiIcon('energy'), cost[2]); view.addChild(copy, token.view); token.view.x = width - 48; return { view, w: width, h: Math.max(copy.height, token.h) } }
      const size = node.tagName === 'H2' ? 28 : node.tagName === 'H3' ? 20 : has(node, 'eyebrow') ? 11 : node.tagName === 'SMALL' ? 12 : 14
      const text = label(node.textContent.trim(), width, size, has(node, 'eyebrow item-source owned-label') ? C.muted : C.paper, /H[23]|STRONG|B/.test(node.tagName))
      return { view: text, w: width, h: text.text ? text.height : 0 }
    }
    const view = new Container()
    const grid = has(node, 'deck-grid codex-grid modal-grid route-grid class-grid upgrade-candidate-grid help-grid body-screen')
    const row = has(node, 'row modal-footer card-metric card-metrics metric-strip player-vitals player-effects player-effect hud-ammo pile-summary loot-hud status-stack intermission-stats coin-layout coin-controls bag-detail-heading intent-token enemy-intent')
    const panel = has(node, 'choice codex-entry upgrade-bundle route-card class-card upgrade-selection-panel intermission-overview setting')
    const padding = panel ? 14 : 0, gap = grid ? 18 : 10
    const cols = grid ? Math.max(1, Math.floor(width / (has(node, 'class-options') ? 375 : has(node, 'class-grid route-grid help-grid body-screen') ? 275 : 235))) : row ? children.length : 1
    const childWidth = (width - padding * 2 - gap * (cols - 1)) / cols
    let x = padding, y = padding, rowH = 0
    for (const child of children) {
      const item = layoutNode(child, childWidth)
      if (!item.h) continue
      if ((grid || row) && x > padding && x + item.w > width - padding + 1) { x = padding; y += rowH + gap; rowH = 0 }
      item.view.position.set(x, y); view.addChild(item.view)
      if (grid || row) { x += childWidth + gap; rowH = Math.max(rowH, item.h) }
      else y += item.h + gap
    }
    const height = (grid || row ? y + rowH : y - gap) + padding
    if (panel || node.tagName === 'BUTTON') view.addChildAt(box(width, height, has(node, 'primary') ? 0x493a29 : C.panel, has(node, 'selected upgrade-selected class-selected') ? C.gold : C.line), 0)
    if (node.tagName === 'BUTTON' || has(node, 'codex-entry') && node.querySelector('.card-back')) interactive(view, node, width, height)
    return { view, w: width, h: height }
  }

  function bag(source, width) {
    const view = new Container(), cell = Math.min(112, width / 9), step = cell + 6
    const grid = source.querySelector('.bag-grid'), cols = Number(grid.style.getPropertyValue('--cols')), rows = Number(grid.style.getPropertyValue('--rows'))
    const gridX = 230
    for (const node of grid.querySelectorAll('.bag-cell')) {
      const tile = box(cell, cell, 0x171419); tile.position.set(gridX + Number(node.dataset.x) * step, Number(node.dataset.y) * step)
      interactive(tile, node, cell, cell); view.addChild(tile)
      regions.push({ view: tile, w: cell, h: cell, kind: 'cell', x: Number(node.dataset.x), y: Number(node.dataset.y) })
    }
    function item(node, x, y, w, h) {
      const tile = new Container(); tile.position.set(x, y)
      tile.addChild(box(w, h, 0x30262a, has(node, 'selected') ? C.gold : C.line))
      const image = node.querySelector('img'); if (image) tile.addChild(art(image, w, h - 32))
      const copy = label(node.querySelector('.bag-name')?.textContent, w - 12, 12); copy.position.set(6, h - 30); tile.addChild(copy)
      const uses = node.querySelector('.bag-uses')
      if (uses) { const value = label(uses.textContent, 50, 12, C.gold, true); value.position.set(w - value.width - 8, 6); tile.addChild(value) }
      const ref = node.dataset.engineRef
      tile.eventMode = 'static'; tile.hitArea = new Rectangle(0, 0, w, h)
      tile.on('pointerenter', () => dispatch(node, 'pointerenter'))
      tile.on('pointerleave', () => dispatch(node, 'pointerleave'))
      if (!has(node, 'readonly')) {
        tile.eventMode = 'static'; tile.cursor = 'grab'; tile.hitArea = new Rectangle(0, 0, w, h)
        tile.on('pointerdown', event => { event.stopPropagation(); drag = { ref: ref === 'incoming' ? ref : Number(ref), start: event.global.clone(), view: tile, original: tile.position.clone(), moved: false, rot: hooks.bagRotation(ref) }; tile.alpha = .65 })
        controls.push({ view: tile, source: node, w, h })
      }
      view.addChild(tile)
    }
    for (const node of grid.querySelectorAll('.bag-item')) item(node, gridX + Number(node.style.getPropertyValue('--x')) * step, Number(node.style.getPropertyValue('--y')) * step, Number(node.style.getPropertyValue('--w')) * step - 6, Number(node.style.getPropertyValue('--h')) * step - 6)
    let y = 0
    for (const slot of source.querySelectorAll('.bag-hand')) {
      const background = box(204, 130); background.y = y; view.addChild(background)
      const title = label(slot.querySelector('small')?.textContent, 180); title.position.set(10, y + 6); view.addChild(title)
      const node = slot.querySelector('.bag-item')
      if (node) item(node, 8, y + 30, 188, 88)
      else { const empty = textButton(slot, 188, 70, slot.textContent.trim()); empty.view.position.set(8, y + 36); view.addChild(empty.view) }
      regions.push({ view: background, w: 204, h: 130, kind: 'hand', slot: slot.dataset.slot })
      y += 146
    }
    const sideX = gridX + cols * step + 28, sideW = Math.max(220, width - sideX)
    const incoming = source.querySelector('.bag-incoming .bag-item')
    let sideY = 0
    if (incoming) { item(incoming, sideX, 0, Math.min(sideW, 220), 150); sideY = 166 }
    for (const node of source.querySelector('.bag-side-col').children) {
      const itemView = layoutNode(node, sideW); itemView.view.position.set(sideX, sideY); view.addChild(itemView.view)
      if (has(node, 'bag-trash')) { interactive(itemView.view, node, sideW, itemView.h); regions.push({ view: itemView.view, w: sideW, h: itemView.h, kind: 'trash' }) }
      sideY += itemView.h + 14
    }
    return { view, w: width, h: Math.max(rows * step, y, sideY) }
  }

  function place(parent, source, x, y, width) {
    if (!source || source.hidden) return
    const item = layoutNode(source, width); item.view.position.set(x, y); parent.addChild(item.view); return item
  }

  function drawHud(w, h) {
    const state = hooks.getState()
    if (!state) return
    hud.addChild(new Graphics().rect(0, 0, w, 68).fill({ color: 0x100e13, alpha: .94 }))
    let vitalX = 24
    for (const source of semantic('stats').querySelectorAll('.vital')) {
      const view = new Container(), width = 176
      view.addChild(box(width, 44))
      const glyph = source.querySelector('svg'); if (glyph) { const image = art(glyph, 24, 24); image.position.set(10, 8); view.addChild(image) }
      const text = label(`${source.querySelector('strong').textContent} ${source.querySelector('small').textContent}`, 120, 20, C.paper, true); text.position.set(42, 4); view.addChild(text)
      const health = parseFloat(source.querySelector('.health-track').style.getPropertyValue('--health')) / 100
      view.addChild(new Graphics().rect(8, 37, 160 * health, 3).fill(has(source, 'energy') ? C.gold : 0xb26e61))
      view.position.set(vitalX, 10); interactive(view, source, width, 44); hud.addChild(view); vitalX += width + 12
    }
    const toolbar = new LayoutContainer({ layout: { width: 420, height: 52, flexDirection: 'row', gap: 8, alignItems: 'center' } })
    toolbar.position.set(w - 440, 8)
    for (const node of document.querySelectorAll('.utility-nav > button')) {
      const view = new Container(); view.addChild(box(50, 50, 0x19171b, C.line))
      const glyph = art(node.querySelector('svg'), 26, 26); glyph.position.set(12, 7); view.addChild(glyph)
      const key = label(node.querySelector('kbd').textContent, 30, 10, C.muted, true); key.position.set(21, 33); view.addChild(key)
      interactive(view, node, 50, 50); view.layout = { width: 50, height: 50 }; toolbar.addChild(view)
    }
    hud.addChild(toolbar)
    const turn = label(String(state.turn), 50, 20, C.muted, true); turn.position.set(w - 80, 92); hud.addChild(turn)
    const g = hooks.geometry()
    for (const group of semantic('targets').children) {
      const x = parseFloat(group.style.left), y = parseFloat(group.style.top)
      const target = group.querySelector('.target'), view = new Container()
      view.position.set(x - 70, y + 66)
      const health = Number(target.querySelector('.enemy-hp-fill').style.width.replace('%', '')) / 100
      view.addChild(box(140, 8, 0x191419, C.line, 2), new Graphics().rect(1, 1, Math.max(0, 138 * health), 6).fill(0xb26e61))
      const hp = label(target.querySelector('.enemy-hp-readout').textContent, 140, 11); hp.position.set(0, -22); view.addChild(hp)
      const name = label(target.querySelector('.enemy-name').textContent, 140, 13, C.paper, true); name.position.set((140 - name.width) / 2, 14); view.addChild(name)
      const intent = layoutNode(target.querySelector('.enemy-intent'), 100); intent.view.position.set((140 - intent.w) / 2, -62); view.addChild(intent.view)
      interactive(view, target, 140, 42); hud.addChild(view)
      for (const part of group.querySelectorAll('.part-button')) {
        const px = Number(part.style.left.match(/[-\d.]+(?=px)/)?.[0] || 0), py = parseFloat(part.style.top)
        const limb = textButton(part, 88, 36, part.getAttribute('aria-label').split('.')[0]); limb.view.position.set(x + px - 44, y + py); hud.addChild(limb.view)
      }
      const stack = group.querySelector('.status-stack'); if (stack) place(hud, stack, x - 70, y + parseFloat(group.style.getPropertyValue('--enemy-status-top')), 140)
    }
    place(hud, semantic('statuses'), g.heroX - 90, g.ground + 32, 180)
    for (const [id, x] of [['drawPile', 24], ['discardPile', w - 230], ['exhaustPile', w - 124]]) {
      const pile = new Container(); pile.addChild(box(76, 66, 0x171419))
      const glyph = art(semantic(id).querySelector('svg'), 26, 26); glyph.position.set(25, 9); pile.addChild(glyph)
      const number = label(semantic(id).querySelector('strong')?.textContent || 0, 60, 16, C.paper, true); number.position.set((76 - number.width) / 2, 38); pile.addChild(number)
      interactive(pile, semantic(id), 76, 66)
      pile.position.set(x, h - 114); hud.addChild(pile)
    }
    const end = textButton(semantic('endTurn'), 160, 48); end.view.position.set(w - 184, h - 178); hud.addChild(end.view)
    place(hud, semantic('piles'), w - 300, h - 168, 100)
    const injuryBanner = semantic('injuryBanner')
    if (injuryBanner.classList.contains('active')) place(hud, injuryBanner, w / 2 - 250, 160, 500)
    const cards = [...semantic('hand').querySelectorAll('.card')], cw = 184
    const gap = Math.min(142, Math.max(30, (w - 520 - cw) / Math.max(1, cards.length - 1)))
    const middle = (cards.length - 1) / 2
    cards.forEach((source, index) => {
      const spread = middle > 0 ? (index - middle) / middle : 0
      const rest = { x: w / 2 + (index - middle) * gap, y: h + 112 + 28 * spread * spread, rotation: spread * Math.min(.14, middle * .045) }
      const keyboardActive = keyboardSelection && (has(source, 'selected') || source === document.activeElement)
      const active = hoveredHandIndex === null ? keyboardActive : hoveredHandIndex === index
      const native = card(source, cw, 288)
      native.view.pivot.set(cw / 2, 288)
      native.view.position.set(rest.x, active ? h - 24 : rest.y)
      native.view.rotation = active ? 0 : rest.rotation
      native.view.scale.set(active ? 1.06 : 1)
      native.view.zIndex = active ? cards.length + 1 : index
      const control = controls[controls.length - 1]
      control.handRest = rest; control.handIndex = index
      hand.addChild(native.view)
    })
  }

  function drawCombatDialogue(w, h) {
    const cue = hooks.getEnemyDialogue?.()
    if (!cue || hooks.getModal()) return
    const dw = Math.min(940, w - 120), dh = 126
    const x = (w - dw) / 2, y = h - 188
    const shell = new Container()
    shell.position.set(x, y)
    shell.addChild(
      new Graphics().rect(-70, -22, dw + 140, dh + 44).fill({ color: 0x050506, alpha: .32 }),
      box(dw, dh, 0x151114, 0x725449, 4),
      new Graphics().rect(14, 16, 3, dh - 32).fill({ color: 0xa76b5f, alpha: .9 })
    )
    const eyebrow = label('ENEMY ACTION', dw - 64, 10, 0xa88978, true)
    const speaker = label(cue.speaker, dw - 64, 15, 0xd9b7a1, true)
    const line = label(cue.text, dw - 76, 22, 0xeee3d4, true)
    eyebrow.position.set(30, 17)
    speaker.position.set(30, 36)
    line.position.set(30, 66)
    shell.addChild(eyebrow, speaker, line)
    combatDialogue.addChild(shell)
    if (motionOn()) gsap.fromTo(shell, { y: y + 22, alpha: 0 }, { y, alpha: 1, duration: .2, ease: 'power2.out' })
  }

  function drawCoinDialog(w, h) {
    const source = semantic('modal')
    const mw = Math.min(580, w - 48), mh = Math.min(640, h - 56)
    const shell = new Container()
    shell.position.set((w - mw) / 2, (h - mh) / 2)
    shell.addChild(box(mw, mh, 0x100d12, 0x6d574a, 8))

    const title = label(source.querySelector('.coin-title')?.textContent, mw - 64, 25, 0xf0e3d2, true)
    title.position.set((mw - title.width) / 2, 24)
    shell.addChild(title)
    shell.addChild(new Graphics()
      .moveTo(40, 68).lineTo(mw / 2 - 28, 68)
      .moveTo(mw / 2 + 28, 68).lineTo(mw - 40, 68)
      .stroke({ color: 0x806650, alpha: .58, width: 1 })
      .circle(mw / 2, 68, 3).fill({ color: C.gold, alpha: .55 }))

    const coinNode = source.querySelector('.coin')
    const stage = new Container()
    stage.position.set(0, 78)
    stage.addChild(
      new Graphics().ellipse(mw / 2, 132, 196, 112).fill({ color: 0x6e5332, alpha: .035 }),
      new Graphics().ellipse(mw / 2, 132, 148, 84).stroke({ color: 0x9a7548, alpha: .09, width: 1 }),
      new Graphics().ellipse(mw / 2, 226, 72, 12).fill({ color: 0x000000, alpha: .62 })
    )
    const image = coinNode?.querySelector(has(coinNode, 'show-tails') ? 'img.coin-tails' : 'img.coin-heads')
    coinView = art(image, 180, 180)
    coinView.position.set((mw - 180) / 2, 34)
    stage.addChild(coinView)
    shell.addChild(stage)

    const resultSource = source.querySelector('.coin-result')
    const resultText = resultSource?.textContent.trim() || ''
    const resultColor = has(resultSource, 'coin-success') ? 0xe8d397 : has(resultSource, 'coin-failure') ? 0xdf8981 : C.gold
    const result = label(resultText, mw - 80, 24, resultColor, true)
    result.position.set((mw - result.width) / 2, 320)
    shell.addChild(result)

    const stakes = [...source.querySelectorAll('.coin-stake-line')]
    let stakeY = 372
    for (const [index, line] of stakes.entries()) {
      const name = line.querySelector('strong')?.textContent || ''
      const value = line.querySelector('span')?.textContent || ''
      const tone = index ? 0xdf8981 : 0xe8d397
      const nameText = label(name, 72, 14, tone, true)
      const valueText = label(value, mw - 168, 15, C.paper)
      nameText.position.set(72, stakeY)
      valueText.position.set(146, stakeY - 1)
      shell.addChild(nameText, valueText)
      stakeY += Math.max(32, valueText.height + 8)
    }
    if (!stakes.length) {
      const outcome = label(source.querySelector('.coin-stakes')?.textContent, mw - 144, 16, C.paper)
      outcome.position.set(72, stakeY)
      shell.addChild(outcome)
      stakeY += outcome.height + 10
    }

    const controls = [...source.querySelectorAll('.coin-details .row > button')]
    const buttonW = controls.length > 1 ? 156 : 210
    const gap = 16, total = controls.length * buttonW + Math.max(0, controls.length - 1) * gap
    let buttonX = (mw - total) / 2
    const buttonY = Math.min(mh - 70, Math.max(500, stakeY + 18))
    for (const source of controls) {
      const control = textButton(source, buttonW, 48)
      const copy = control.view.children.find(child => child instanceof Text)
      if (copy) copy.x = (buttonW - copy.width) / 2
      control.view.position.set(buttonX, buttonY)
      shell.addChild(control.view)
      buttonX += buttonW + gap
    }

    dialogs.addChild(shell)
    lastModal = hooks.getModal()
    scrollbox = null
  }

  function drawClassDialog(w, h) {
    const source = semantic('modal')
    const choices = [...source.querySelectorAll('.class-choice')]
    const mw = Math.min(1240, w - 64), mh = Math.min(820, h - 48)
    const shell = new Container()
    shell.position.set((w - mw) / 2, (h - mh) / 2)
    shell.addChild(box(mw, mh, 0x100e12, 0x66574d, 8))

    const heading = label('생존자 선택', mw - 64, 28, 0xf0e3d2, true)
    const description = label(source.querySelector(':scope > .description')?.textContent, mw - 64, 13, C.muted)
    heading.position.set(28, 20); description.position.set(28, 59)
    shell.addChild(heading, description)

    const accents = { survivor: 0xc4ad76, mage: 0xaaa1d4, berserker: 0xd4836e }
    const gap = 18, cardX = 28, cardY = 92, cardH = 264
    const cardW = (mw - cardX * 2 - gap * Math.max(0, choices.length - 1)) / Math.max(1, choices.length)
    for (const [index, choice] of choices.entries()) {
      const key = choice.dataset.class || 'survivor', accent = accents[key] || C.gold
      const selected = has(choice, 'class-selected')
      const cardView = new Container()
      cardView.addChild(box(cardW, cardH, selected ? 0x201b1a : 0x171619, selected ? accent : 0x574d47, 5))
      const image = choice.querySelector('.class-portrait img')
      const portrait = art(image, cardW - 24, 154); portrait.position.set(12, 10); cardView.addChild(portrait)
      const number = label(String(index + 1).padStart(2, '0'), 40, 11, accent, true)
      const role = label(choice.querySelector('.class-role')?.textContent, cardW - 100, 11, C.muted, true)
      number.position.set(16, 14); role.position.set(cardW - role.width - 16, 14)
      const name = label(choice.querySelector('.class-name')?.textContent, cardW - 110, 22, C.paper, true)
      const hp = label(`♥ ${choice.querySelector('.class-vitality b')?.textContent || ''}`, 74, 16, 0xdf8f7a, true)
      name.position.set(16, 176); hp.position.set(cardW - hp.width - 16, 179)
      const trait = label(choice.querySelector('.class-info-row .class-info-copy')?.textContent, cardW - 32, 12, C.muted)
      trait.position.set(16, 214)
      cardView.addChild(number, role, name, hp, trait)
      interactive(cardView, choice, cardW, cardH)
      cardView.position.set(cardX + index * (cardW + gap), cardY)
      shell.addChild(cardView)
    }

    const selected = source.querySelector('.class-choice.class-selected')
    const detailY = 378, detailH = 330
    const detail = new Container(); detail.position.set(28, detailY)
    detail.addChild(box(mw - 56, detailH, 0x141216, 0x51463f, 5))
    if (!selected) {
      const prompt = label('위에서 생존자를 선택하면 시작 기술과 소지품을 확인할 수 있습니다.', mw - 120, 18, C.muted)
      prompt.position.set((mw - 56 - prompt.width) / 2, 142); detail.addChild(prompt)
    } else {
      const key = selected.dataset.class || 'survivor', accent = accents[key] || C.gold
      const rows = [...selected.querySelectorAll('.class-info-row')]
      const title = label(`${selected.querySelector('.class-name')?.textContent}의 시작 조건`, 300, 20, accent, true)
      title.position.set(22, 18); detail.addChild(title)
      const sideW = 310
      let sideY = 62
      for (const row of [rows[0], rows[2]].filter(Boolean)) {
        const rowTitle = label(row.querySelector('.class-info-label')?.textContent, sideW - 36, 11, accent, true)
        const copy = label(row.querySelector('.class-info-copy')?.textContent, sideW - 36, 13, C.paper)
        rowTitle.position.set(22, sideY); copy.position.set(22, sideY + 20)
        detail.addChild(rowTitle, copy); sideY += Math.max(72, copy.height + 34)
      }
      detail.addChild(new Graphics().moveTo(sideW, 18).lineTo(sideW, detailH - 18).stroke({ color: 0x51463f, alpha: .8, width: 1 }))
      const skillTitle = label('시작 기술', 180, 13, accent, true); skillTitle.position.set(sideW + 22, 18); detail.addChild(skillTitle)
      const skills = [...selected.querySelectorAll('.class-start-card')]
      const skillGap = 10, cols = 3, skillW = (mw - 56 - sideW - 44 - skillGap * (cols - 1)) / cols
      for (const [index, skill] of skills.entries()) {
        const tile = new Container(), tileH = 112
        tile.addChild(box(skillW, tileH, 0x1b181c, 0x544943, 4))
        const cost = label(skill.querySelector('.class-start-cost')?.textContent, 54, 11, C.gold, true)
        const name = label(skill.querySelector('strong')?.textContent, skillW - 76, 14, C.paper, true)
        const copy = label(skill.querySelector('p')?.textContent, skillW - 24, 12, C.muted)
        cost.position.set(12, 10); name.position.set(64, 9); copy.position.set(12, 38)
        tile.addChild(cost, name, copy)
        tile.position.set(sideW + 22 + index % cols * (skillW + skillGap), 48 + Math.floor(index / cols) * (tileH + skillGap))
        detail.addChild(tile)
      }
    }
    shell.addChild(detail)

    const footerSource = source.querySelector(':scope > .modal-footer')
    const confirmSource = footerSource?.querySelector('button')
    if (confirmSource) {
      const confirm = textButton(confirmSource, 230, 46)
      confirm.view.position.set(mw - 28 - 230, mh - 66); shell.addChild(confirm.view)
      const chosen = label(footerSource.querySelector('.class-confirm-copy strong')?.textContent, mw - 330, 16, selected ? C.paper : C.muted, true)
      chosen.position.set(28, mh - 56); shell.addChild(chosen)
    }

    dialogs.addChild(shell)
    lastModal = hooks.getModal()
    scrollbox = null
  }

  function drawDialog(w, h) {
    const modal = hooks.getModal()
    if (!modal) return
    menuTip = null
    dialogs.eventMode = 'static'; dialogs.hitArea = new Rectangle(0, 0, w, h)
    dialogs.addChild(new Graphics().rect(0, 0, w, h).fill({ color: 0x08060a, alpha: .85 }))
    if (modal.type === 'coin') { drawCoinDialog(w, h); return }
    if (modal.subtitle === 'CHOOSE SURVIVOR') { drawClassDialog(w, h); return }
    const mw = Math.min(w - 80, modal.type === 'options' && modal.subtitle !== 'CHOOSE SURVIVOR' ? 900 : modal.type === 'settings' ? 800 : 1280)
    const source = semantic('modal'), shell = new Container(), body = new Container()
    const footerSource = source.querySelector(':scope > .modal-footer')
    const footerButtons = footerSource ? [...footerSource.children].filter(child => child.tagName === 'BUTTON') : []
    const footer = footerButtons.length ? { view: new Container(), h: 44 } : null
    if (footer) {
      let x = mw - 48
      for (const source of footerButtons.reverse()) { const control = textButton(source, Math.min(240, (mw - 60) / footerButtons.length), 44); x -= control.w; control.view.x = x; footer.view.addChild(control.view); x -= 12 }
    }
    let top = 24, bodyY = 0
    const head = source.firstElementChild
    let headNative
    if (has(head, 'row') && head.querySelector('button')) {
      const view = new Container(), titles = layoutNode(head.firstElementChild, mw - 220), close = textButton(head.querySelector('button'), 132, 38)
      view.addChild(titles.view, close.view); close.view.x = mw - 180
      headNative = { view, h: Math.max(titles.h, 38) }
    } else headNative = layoutNode(head, mw - 48)
    const shortTitle = { body: '신체', inventory: '인벤토리', deck: '덱', settings: '설정', codex: '도감', log: '기록', help: '규칙', route: '경로', upgrade: '강화' }[modal.type]
      || (modal.subtitle === 'CHOOSE SURVIVOR' ? '생존자 선택' : modal.subtitle === 'SIGNAL FOUND' ? '이어하기' : null)
    if (shortTitle) { const titles = headNative.view.children?.find(child => child instanceof Text && child.style.fontSize === 28) || headNative.view.children?.flatMap(child => child.children || []).find(child => child instanceof Text && child.style.fontSize === 28); if (titles) titles.text = shortTitle }
    headNative.view.position.set(24, top); shell.addChild(headNative.view); top += headNative.h + 20
    for (const child of [...source.children].slice(1)) {
      if (child === footerSource) continue
      const item = layoutNode(child, mw - 48); item.view.y = bodyY; body.addChild(item.view); bodyY += item.h + 16
    }
    const mh = Math.min(h - 100, Math.max(300, top + bodyY + (footer ? footer.h + 24 : 0) + 24))
    shell.position.set((w - mw) / 2, (h - mh) / 2); shell.addChildAt(box(mw, mh, 0x161218), 0)
    const available = mh - top - (footer ? footer.h + 36 : 24)
    scrollbox = new ScrollBox({ width: mw - 32, height: Math.max(100, available), type: 'vertical', globalScroll: false, disableDynamicRendering: true, padding: 8 })
    scrollbox.position.set(16, top); scrollbox.addItem(body); shell.addChild(scrollbox)
    if (footer) { footer.view.position.set(24, mh - footer.h - 18); shell.addChild(footer.view) }
    dialogs.addChild(shell)
    if (lastModal === modal) scrollbox.scrollY = scrollY
    else { lastModal = modal; scrollY = 0 }
    const aside = document.querySelector('.modal-aside'); if (aside) place(dialogs, aside, (w - mw) / 2, h - 48, mw)
  }

  function redraw() {
    if (!dirty || drag || coinTween || editingSlider) { if (tipDirty) drawTip(); return }
    dirty = false
    if (scrollbox && !scrollbox.destroyed) scrollY = scrollbox.scrollY
    controls.length = 0; regions.length = 0
    for (const layer of [hud, hand, combatDialogue, dialogs, tips]) {
      for (const child of layer.removeChildren()) { gsap.killTweensOf(child); child.destroy({ children: true }) }
    }
    scrollbox = null; coinView = null
    const w = app.screen.width, h = app.screen.height
    const domModal = usesDomModal(hooks.getModal())
    document.body.classList.toggle('engine-dom-modal', domModal)
    drawHud(w, h); drawCombatDialogue(w, h); if (!domModal) drawDialog(w, h)
    hud.eventMode = hooks.getModal() ? 'none' : 'passive'; hand.eventMode = hooks.getModal() ? 'none' : 'passive'
    dialogs.eventMode = hooks.getModal() && !domModal ? 'static' : 'none'
    drawTip()
  }

  function drawTip() {
    tipDirty = false
    for (const child of tips.removeChildren()) child.destroy({ children: true })
    const w = app.screen.width, h = app.screen.height, tip = semantic('tooltip')
    if (!tip.hidden || menuTip) {
      const native = !tip.hidden ? layoutNode(tip, 350) : { view: label(menuTip, 350), h: 44 }, shell = new Container()
      shell.addChild(box(374, native.h + 24), native.view); native.view.position.set(12, 12)
      shell.position.set(Math.min(pointer.x + 20, w - 390), Math.max(76, Math.min(pointer.y - native.h - 40, h - native.h - 40))); tips.addChild(shell)
    }
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => record.target.closest?.('#tooltip'))) tipDirty = true
    if (records.some(record => record.target.closest?.('#app, #overlay') && !(record.type === 'attributes' && record.target.classList?.contains('part-button') && record.attributeName === 'class'))) dirty = true
  })
  for (const id of ['app', 'overlay', 'tooltip']) observer.observe(semantic(id), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'disabled', 'aria-pressed'] })
  app.ticker.add(redraw)
  app.renderer.on('resize', () => { dirty = true })
  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.on('pointerdown', () => { keyboardSelection = false })
  app.stage.on('globalpointermove', event => {
    pointer = event.global.clone()
    const handControls = controls.filter(control => !control.view.destroyed && control.source.closest('#hand'))
    // Keep the lifted card while the pointer is on it or its original footprint.
    // Resolve overlaps front-to-back, matching Pixi's native pointer dispatch.
    const current = handControls.find(control => control.handIndex === hoveredHandIndex)
    const onRest = control => {
      const rest = control.handRest, dx = pointer.x - rest.x, dy = pointer.y - rest.y
      const x = dx * Math.cos(rest.rotation) + dy * Math.sin(rest.rotation) + control.w / 2
      const y = -dx * Math.sin(rest.rotation) + dy * Math.cos(rest.rotation) + 288
      return x >= 0 && x <= control.w && y >= 0 && y <= control.h
    }
    const hovered = hooks.getModal() ? null : current && (inside(current, pointer) || onRest(current)) ? current
      : [...handControls].sort((a, b) => b.view.zIndex - a.view.zIndex).find(control => inside(control, pointer))
    const nextHovered = hovered?.handIndex ?? null
    if (hoveredHandIndex !== nextHovered) {
      hoveredHandIndex = nextHovered
      handControls.forEach((control, index) => {
        const active = nextHovered === null ? keyboardSelection && (has(control.source, 'selected') || control.source === document.activeElement) : index === nextHovered
        control.view.zIndex = active ? handControls.length + 1 : index
        gsap.to(control.view, { y: active ? app.screen.height - 24 : control.handRest.y, rotation: active ? 0 : control.handRest.rotation, duration: motionOn() ? .18 : 0, overwrite: true })
        gsap.to(control.view.scale, { x: active ? 1.06 : 1, y: active ? 1.06 : 1, duration: motionOn() ? .18 : 0, overwrite: true })
      })
    }
    if (!drag) return
    const dx = pointer.x - drag.start.x, dy = pointer.y - drag.start.y
    drag.moved ||= Math.hypot(dx, dy) > 5
    drag.view.position.set(drag.original.x + dx, drag.original.y + dy)
    dropHint.clear()
    const target = regions.find(region => region.kind === 'cell' && inside(region, pointer))
    if (drag.moved && target) {
      const point = target.view.getGlobalPosition(), size = hooks.bagSize(drag.ref, drag.rot)
      const legal = hooks.bagCanPlace(drag.ref, target.x, target.y, drag.rot)
      const color = legal ? 0x93aa83 : 0xb86f62
      dropHint.rect(point.x, point.y, (target.w + 6) * size.w - 6, (target.h + 6) * size.h - 6).fill({ color, alpha: .25 }).stroke({ color, width: 2 })
    }
  })
  const inside = (record, point) => { const local = record.view.toLocal(point); return local.x >= 0 && local.y >= 0 && local.x <= record.w && local.y <= record.h }
  app.stage.on('pointerup', event => {
    if (!drag) return
    const current = drag; drag = null
    dropHint.clear()
    if (!current.moved) hooks.bagSelect(current.ref)
    else {
      const target = regions.find(region => inside(region, event.global))
      if (target?.kind === 'cell') hooks.bagDrop(current.ref, target.x, target.y, current.rot)
      else if (target?.kind === 'hand') hooks.bagEquip(current.ref, target.slot)
      else if (target?.kind === 'trash') hooks.bagDiscard(current.ref)
    }
    dirty = true
  })
  const cancelDrag = () => { drag = null; dropHint.clear(); dirty = true }
  window.addEventListener('blur', cancelDrag)
  document.addEventListener('change', () => { dirty = true })
  app.stage.on('pointerupoutside', cancelDrag)
  document.addEventListener('keydown', event => {
    if (/^(Digit[0-9]|Numpad[0-9]|Tab|Enter|Space)$/.test(event.code)) { keyboardSelection = true; hoveredHandIndex = null; dirty = true }
    if (drag && event.code === 'KeyR') { event.preventDefault(); event.stopImmediatePropagation(); drag.rot = drag.rot ? 0 : 1; const w = drag.view.hitArea.width; drag.view.hitArea.width = drag.view.hitArea.height; drag.view.hitArea.height = w; drag.view.rotation += Math.PI / 2 }
    if (drag && event.code === 'Escape') { event.stopImmediatePropagation(); cancelDrag() }
    if (event.code === 'Tab') {
      const available = controls.filter(control => !control.source.disabled && (hooks.getModal() ? control.source.closest('#overlay') : !control.source.closest('#overlay')))
      const index = available.findIndex(control => control.source === document.activeElement)
      const next = available[(index + (event.shiftKey ? -1 : 1) + available.length) % available.length]
      if (next) { event.preventDefault(); event.stopPropagation(); next.source.focus({ preventScroll: true }); dispatch(next.source, 'pointerenter'); dirty = true }
    }
    if (scrollbox && !event.target.matches?.('input') && ['ArrowDown', 'ArrowUp'].includes(event.code)) { scrollbox.scrollY += event.code === 'ArrowDown' ? 220 : -220; event.preventDefault() }
  }, { capture: true })
  document.body.classList.add('engine-ui')
  dirty = true
  return {
    root,
    refresh() { dirty = true },
    dismissHand() {
      hoveredHandIndex = null
      if (!hand.children.length || !motionOn()) return Promise.resolve()
      hand.eventMode = 'none'
      return new Promise(resolve => {
        // Animate the persistent hand layer rather than individual cards. A
        // keyboard event can request a redraw while this animation is running,
        // which replaces the card display objects and used to strand the turn
        // in the resolving phase with a GSAP target error.
        gsap.killTweensOf(hand)
        gsap.to(hand, {
          y: 420,
          duration: .3,
          ease: 'power2.in',
          overwrite: true,
          onComplete: () => {
            hand.y = 0
            resolve()
          },
        })
      })
    },
    contains(x, y) { return (!usesDomModal(hooks.getModal()) && Boolean(hooks.getModal())) || controls.some(control => !control.view.destroyed && inside(control, { x, y })) },
    snapshot() { return controls.filter(control => !control.view.destroyed).map(control => { const p = control.view.toGlobal({ x: control.w / 2, y: control.h / 2 }); return { text: control.source.getAttribute('aria-label') || control.source.textContent.trim(), id: control.source.id, x: p.x, y: p.y, disabled: Boolean(control.source.disabled) } }) },
    async tossCoin(result, motion) {
      const domCoin = semantic('modal').querySelector('.coin')
      if (usesDomModal(hooks.getModal()) && domCoin) {
        const angle = result === 'heads' ? 1800 : 1980
        const frames = motion ? [
          { transform: 'translateY(0) rotateX(0deg) scale(1)', offset: 0 },
          { transform: 'translateY(12px) rotateX(-25deg) scale(.94)', offset: .07 },
          { transform: 'translateY(-80px) rotateX(720deg) scale(.83)', offset: .32 },
          { transform: 'translateY(-96px) rotateX(1080deg) scale(.78)', offset: .48 },
          { transform: 'translateY(-66px) rotateX(1440deg) scale(.87)', offset: .64 },
          { transform: `translateY(0) rotateX(${angle}deg) scale(1)`, offset: .84 },
          { transform: `translateY(-12px) rotateX(${angle + 18}deg) scale(1.04)`, offset: .9 },
          { transform: `translateY(0) rotateX(${angle}deg) scale(1)`, offset: 1 },
        ] : [
          { transform: `rotateX(${angle}deg)`, opacity: .5 },
          { transform: `rotateX(${angle}deg)`, opacity: 1 },
        ]
        const animation = domCoin.animate(frames, { duration: motion ? 1900 : 120, easing: 'linear', fill: 'forwards' })
        await animation.finished.catch(() => {})
        domCoin.style.transform = `rotateX(${result === 'heads' ? 0 : 180}deg)`
        animation.cancel()
        return
      }
      // Native fallback for contexts where the DOM coin is not visible.
      const native = coinView
      if (!native) return new Promise(resolve => setTimeout(resolve, motion ? 1900 : 120))
      coinTween = gsap.timeline({ onComplete: () => { coinTween = null; dirty = true } })
      coinTween.to(native, { y: native.y - (motion ? 96 : 0), duration: motion ? .9 : .06, yoyo: true, repeat: 1, ease: 'power2.out' })
      if (motion) coinTween.to(native.scale, { x: .08, duration: .09, repeat: 19, yoyo: true }, 0)
      await coinTween
      semantic('modal').querySelector('.coin')?.classList.toggle('show-tails', result === 'tails')
    },
  }
}
