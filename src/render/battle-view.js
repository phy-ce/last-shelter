// Battle scene renderer (PixiJS v8 + GSAP).
// game.js owns rules, layout math (geometry / enemyPosition / partPosition) and DOM overlays;
// this module only draws. It reads `state` but never writes to it.
import { Application, Container, Sprite, Texture, Graphics, Text, ColorMatrixFilter } from 'pixi.js'
import { gsap } from 'gsap'
import * as rules from '../core/combat-rules.js'
import { settings, motionOn } from '../core/settings.js'
import {
  COMBAT_BACKGROUND, SURVIVOR, SURVIVOR_SPRITES, SURVIVOR_INJURED, SURVIVOR_INJURED_BY_CLASS, heroSprite,
  INFECTED, ENEMY_SPRITES, ENEMY_INJURED_SPRITES, EFFECT_SPRITES, assetReady,
} from '../art/assets.js'

const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
const rand = (a, b) => a + Math.random() * (b - a)

// Figures are drawn into a 264px box (feet at the origin), keeping the source aspect ratio.
const FIGURE_BOX = 264
const FIGURE_FOOT = 6

// ── Textures ──────────────────────────────────────────────────────────────

const textures = new Map()
function tex(img) {
  if (!img || !assetReady(img)) return null
  let t = textures.get(img)
  if (!t) { t = Texture.from(img); textures.set(img, t) }
  return t
}

function radialTexture(size, stops) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, color] of stops) grad.addColorStop(at, color)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return Texture.from(c)
}

function vignetteTexture(color) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(256, 128, 60, 256, 128, 300)
  grad.addColorStop(0, `${color}00`)
  grad.addColorStop(0.55, `${color}00`)
  grad.addColorStop(1, `${color}ff`)
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 256)
  return Texture.from(c)
}

function fontFamily() {
  const css = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif'
  return css.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''))
}

function hexColor(value) {
  const hex = value.replace('#', '')
  return { color: parseInt(hex.slice(0, 6), 16), alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 }
}

// ── View ──────────────────────────────────────────────────────────────────

/**
 * hooks: { getState, geometry, enemyPosition, partPosition, aimRings, shouldRun }
 * aimRings() -> [{ x, y, radius, active }] for the limb picker.
 */
export function createBattleView(canvas, hooks) {
  const app = new Application()
  let ready = false
  let size = { w: 1, h: 1, dpr: 1 }

  const world = new Container()
  const bgLayer = new Container()
  const stainLayer = new Container()
  const figureLayer = new Container()
  const ghostLayer = new Container()
  const ringLayer = new Graphics()
  const fxLayer = new Container()
  const lightLayer = new Container()
  const dynamic = new Graphics()
  const sparkG = new Graphics()
  const textLayer = new Container()
  const overlay = new Container()
  sparkG.blendMode = 'add'
  lightLayer.blendMode = 'add'
  world.addChild(bgLayer, stainLayer, figureLayer, ghostLayer, ringLayer, fxLayer, lightLayer, dynamic, sparkG, textLayer)

  const background = new Sprite()
  bgLayer.addChild(background)

  let glow, softGlow, dot, redVignette
  let flashRect, dangerVignette
  const motes = []
  const smokeHaze = []

  const hero = makeFigure()
  figureLayer.addChild(hero.root)
  const enemies = new Map() // enemy.id -> figure record
  const summonedIds = new Set()

  let particles = []
  let sparks = []
  let shells = []
  let traces = []
  let slides = [] // shotgun pump line
  let active = 0 // running one-shot effects, for busy()
  const camera = { shake: 0, zoom: 1, kickX: 0, kickY: 0 }
  let frozenUntil = 0
  let time = 0

  const brokenFilter = new ColorMatrixFilter()
  brokenFilter.brightness(0.76, false)
  brokenFilter.saturate(-0.28, true)

  function makeFigure() {
    const root = new Container()
    const shadow = new Graphics().ellipse(0, 5, 40, 7).fill({ color: 0x07040c, alpha: 0.53 })
    const body = new Container()
    const sprite = new Sprite()
    const flash = new Sprite()
    sprite.anchor.set(0.5, 1)
    flash.anchor.set(0.5, 1)
    sprite.y = flash.y = FIGURE_FOOT
    flash.blendMode = 'add'
    flash.alpha = 0
    const tint = new Sprite() // colored hit tint (hero)
    tint.anchor.set(0.5, 1)
    tint.y = FIGURE_FOOT
    tint.alpha = 0
    tint.tint = 0xff3a2a
    tint.blendMode = 'add'
    body.addChild(sprite, flash, tint)
    const burn = new Sprite()
    burn.anchor.set(0.5, 1)
    burn.blendMode = 'screen'
    burn.visible = false
    root.addChild(shadow, body, burn)
    return { root, shadow, body, sprite, flash, tint, burn, recoil: 0, flashAmt: 0, tintAmt: 0, lunge: 0, seed: Math.random() * 10, img: null }
  }

  function setFigureTexture(fig, img) {
    const t = tex(img)
    if (!t) { fig.sprite.visible = fig.flash.visible = fig.tint.visible = false; return }
    fig.sprite.visible = fig.flash.visible = fig.tint.visible = true
    if (fig.img === img) return
    fig.img = img
    const k = FIGURE_BOX / Math.max(t.width, t.height)
    for (const s of [fig.sprite, fig.flash, fig.tint]) {
      s.texture = t
      s.width = t.width * k
      s.height = t.height * k
    }
  }

  function enemyImage(enemy) {
    const broken = new Set(enemy.parts.filter((part) => part.hp === 0).map((part) => part.key))
    const damaged = ENEMY_INJURED_SPRITES[enemy.type]
    const img = broken.has('arm') && damaged?.arm ? damaged.arm : broken.has('leg') && damaged?.leg ? damaged.leg : ENEMY_SPRITES[enemy.type] || INFECTED
    return { img, broken: broken.size > 0 }
  }

  function poseFigure(fig, x, y, scale, isEnemy) {
    const motion = motionOn()
    const breathe = motion ? Math.sin(time * 1.7 + fig.seed) * 0.004 : 0
    fig.root.position.set(x, y)
    fig.shadow.scale.set(scale)
    fig.body.position.set((isEnemy ? fig.recoil * 10 - fig.lunge * 30 : -fig.recoil * 10) * scale, 0)
    fig.body.rotation = (motion ? isEnemy ? fig.recoil * 0.07 - fig.lunge * 0.1 : -fig.recoil * 0.06 : 0) + breathe
    // Idle breathing: a slight chest rise, anchored at the feet.
    const rise = motion ? 1 + Math.sin(time * 1.7 + fig.seed) * 0.008 : 1
    fig.body.scale.set(scale, scale * rise)
    fig.flash.alpha = motion ? fig.flashAmt * 0.5 : 0
    fig.tint.alpha = motion ? fig.tintAmt * 0.45 : 0
  }

  // ── Frame ──

  function update(ticker) {
    const state = hooks.getState()
    const now = performance.now()
    const frozen = now < frozenUntil
    const dt = frozen ? 0 : Math.min(ticker.deltaMS / 1000, 0.04)
    time += dt
    if (!state) { if (!hooks.shouldRun()) app.stop(); return }

    const g = hooks.geometry()
    const motion = motionOn()

    // Background: cover.
    const bgTex = tex(COMBAT_BACKGROUND)
    if (bgTex) {
      if (background.texture !== bgTex) background.texture = bgTex
      const cover = Math.max(size.w / bgTex.width, size.h / bgTex.height)
      background.scale.set(cover)
      background.position.set((size.w - bgTex.width * cover) / 2, (size.h - bgTex.height * cover) / 2)
    }

    // Hero.
    setFigureTexture(hero, heroSprite(rules.heroAppearance(state)))
    hero.recoil = Math.max(0, hero.recoil - dt * 4)
    poseFigure(hero, g.heroX, g.ground, g.scale * 0.9, false)

    // Enemies: create / drop records to match state.
    const alive = new Set()
    for (const enemy of state.enemies) {
      alive.add(enemy.id)
      let fig = enemies.get(enemy.id)
      if (!fig) {
        fig = makeFigure()
        enemies.set(enemy.id, fig)
        figureLayer.addChild(fig.root)
        if (motion) {
          fig.root.alpha = 0
          const entrance = summonedIds.delete(enemy.id)
          gsap.to(fig.root, { alpha: 1, duration: entrance ? 0.6 : 0.35 })
          if (entrance) {
            fig.lunge = -1.2
            gsap.to(fig, { lunge: 0, duration: 0.6, ease: 'power3.out' })
            const p = hooks.enemyPosition(enemy)
            emitSparks(p.x, p.y, { count: 14, color: 0x8a7a68, speed: [40, 120], life: [0.4, 0.8], gravity: -20, size: [2, 4], dir: -Math.PI / 2, spread: Math.PI, stretch: 0.01 })
            view.shake(5)
          }
        }
      }
      const p = hooks.enemyPosition(enemy)
      const { img, broken } = enemyImage(enemy)
      setFigureTexture(fig, img)
      fig.sprite.filters = broken ? [brokenFilter] : null
      fig.recoil = Math.max(0, fig.recoil - dt * 4)
      fig.flashAmt = Math.max(0, fig.flashAmt - dt * 4)
      fig.tintAmt = Math.max(0, fig.tintAmt - dt * 1.5)
      poseFigure(fig, p.x, p.y, p.scale, true)

      const burnTex = tex(EFFECT_SPRITES.burn)
      fig.burn.visible = Boolean(enemy.burn > 0 && motion && burnTex)
      if (fig.burn.visible) {
        const pulse = 1 + Math.sin(time * 7 + enemy.id) * 0.035
        fig.burn.texture = burnTex
        fig.burn.width = 156 * p.scale * pulse
        fig.burn.height = 104 * p.scale * pulse
        fig.burn.position.set(0, 12 * p.scale)
        fig.burn.alpha = 0.84
      }
    }
    for (const [id, fig] of enemies) {
      if (alive.has(id)) continue
      enemies.delete(id)
      if (fig.light) destroyFx(fig.light)
      destroyFx(fig.root)
    }
    // Draw nearer (lower) figures last.
    figureLayer.children.sort((a, b) => a.y - b.y || a.x - b.x)

    // Burning enemies cast a flickering warm light.
    lightLayer.children.forEach((child) => { if (child.__burnLight) child.visible = false })
    for (const enemy of state.enemies) {
      if (!(enemy.burn > 0) || !motion) continue
      const fig = enemies.get(enemy.id)
      if (!fig) continue
      if (!fig.light) {
        fig.light = new Sprite(glow)
        fig.light.anchor.set(0.5)
        fig.light.tint = 0xff7a2a
        fig.light.__burnLight = true
        lightLayer.addChild(fig.light)
      }
      const p = hooks.enemyPosition(enemy)
      const flicker = 0.22 + Math.sin(time * 13 + enemy.id) * 0.05 + Math.sin(time * 29) * 0.03
      fig.light.visible = true
      fig.light.alpha = flicker
      fig.light.position.set(p.x, p.y - 50 * p.scale)
      fig.light.scale.set(p.scale * 1.4)
    }

    // Smoke haze around the survivor while the smoke buff lasts.
    const smokeOn = (state.smoke || 0) > 0
    for (const [i, puff] of smokeHaze.entries()) {
      puff.visible = smokeOn || puff.alpha > 0.01
      const target = smokeOn ? 0.32 + Math.sin(time * 0.9 + i * 1.7) * 0.08 : 0
      puff.alpha += (target - puff.alpha) * Math.min(1, dt * 3)
      puff.position.set(g.heroX + Math.sin(time * 0.35 + i * 2.1) * 34 * g.scale + (i - 2) * 26 * g.scale, g.ground - (40 + (i % 3) * 45) * g.scale)
      puff.scale.set((1.1 + (i % 2) * 0.4) * g.scale)
    }

    // Limb picker rings.
    ringLayer.clear()
    for (const ring of hooks.aimRings()) {
      ringLayer.circle(ring.x, ring.y, ring.radius).stroke(ring.active
        ? { width: 2, color: 0xefd49c, alpha: 1 }
        : { width: 1, color: 0xcba570, alpha: 0.6 })
    }

    // Particles, sparks, shells, tracers.
    dynamic.clear()
    for (const trace of traces) {
      trace.life -= dt
      if (motion) dynamic.moveTo(trace.x1, trace.y1).lineTo(trace.x2, trace.y2).stroke({ width: 1.2, color: 0xe2c598, alpha: Math.max(0, trace.life / trace.max) })
    }
    traces = traces.filter((t) => t.life > 0)

    for (const s of slides) {
      s.t += dt
      if (s.t > 0 && s.t < 0.39) {
        const slide = Math.sin(s.t / 0.39 * Math.PI) * 12 * g.scale
        dynamic.moveTo(g.heroX + 55 * g.scale - slide, g.ground - 116 * g.scale)
          .lineTo(g.heroX + 77 * g.scale - slide, g.ground - 116 * g.scale)
          .stroke({ width: 4 * g.scale, color: 0x97815f, cap: 'round' })
      }
    }
    slides = slides.filter((s) => s.t < 0.39)

    for (const shell of shells) {
      if (shell.delay > 0) { shell.delay -= dt; continue }
      shell.life -= dt
      if (motion) {
        shell.x += shell.vx * dt
        shell.y += shell.vy * dt
        shell.vy += 340 * dt
        shell.rotation += dt * 13
      }
      const w = shell.heavy ? 8 : 5
      const c = Math.cos(shell.rotation)
      const s = Math.sin(shell.rotation)
      const pts = [[-3, -1.5], [w - 3, -1.5], [w - 3, 1.5], [-3, 1.5]].map(([px, py]) => [shell.x + px * c - py * s, shell.y + px * s + py * c])
      dynamic.poly(pts.flat()).fill({ color: shell.heavy ? 0x885646 : 0xaa8c55, alpha: clamp(shell.life * 4, 0, 1) })
    }
    shells = shells.filter((s) => s.life > 0)

    for (const p of particles) {
      p.life -= dt
      const x = p.x
      const y = p.y
      if (motion) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 290 * dt
      }
      dynamic.moveTo(x, y).lineTo(p.x + 0.1, p.y + 0.1).stroke({ width: p.size, color: p.color, alpha: clamp(p.life * 2.5, 0, 1) * p.alpha, cap: 'round' })
    }
    particles = particles.filter((p) => p.life > 0)

    sparkG.clear()
    for (const p of sparks) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.gravity * dt
      p.vx *= 1 - dt * 3
      const len = p.stretch
      sparkG.moveTo(p.x, p.y).lineTo(p.x - p.vx * len, p.y - p.vy * len).stroke({ width: p.size, color: p.color, alpha: clamp(p.life / p.max, 0, 1), cap: 'round' })
    }
    sparks = sparks.filter((p) => p.life > 0)

    // Ambient ash drifting through the street.
    for (const m of motes) {
      m.visible = motion
      if (!motion) continue
      m.x += (m.vx + Math.sin(time * 0.7 + m.seed) * 6) * dt
      m.y += m.vy * dt
      if (m.x > size.w + 10) m.x = -10
      if (m.x < -10) m.x = size.w + 10
      if (m.y < -10) { m.y = size.h + 10; m.x = Math.random() * size.w }
      m.alpha = m.base * (0.6 + Math.sin(time * 1.3 + m.seed) * 0.4)
    }

    // Low health: slow red pulse at the edges.
    const ratio = state.maxHp ? state.hp / state.maxHp : 1
    const danger = state.hp > 0 && ratio <= 0.3 ? 0.001 + (0.3 - ratio) / 0.3 : 0
    dangerVignette.alpha = danger > 0 ? (0.28 + danger * 0.3) * (motion ? 0.75 + Math.sin(time * 3.2) * 0.25 : 1) : 0

    // Camera: shake decays like the old canvas loop; zoom / kick are tweened.
    camera.shake = Math.max(0, camera.shake - dt * 35)
    const sx = motion && camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0
    const sy = motion && camera.shake > 0 ? (Math.random() - 0.5) * camera.shake * 0.55 : 0
    world.pivot.set(size.w / 2, size.h / 2)
    world.position.set(size.w / 2 + sx + camera.kickX, size.h / 2 + sy + camera.kickY)
    world.scale.set(camera.zoom)

    if (!hooks.shouldRun()) app.stop()
  }

  // ── Effect helpers ──

  function destroyFx(target) {
    gsap.killTweensOf(target)
    if (target.scale) gsap.killTweensOf(target.scale)
    if (!target.destroyed) target.destroy?.({ children: true })
  }

  function fxSprite(img, { x, y, w, h, blend = 'normal', alpha = 1, rotation = 0, layer = fxLayer, anchor = 0.5 }) {
    const t = tex(img)
    if (!t) return null
    const s = new Sprite(t)
    s.anchor.set(anchor)
    s.position.set(x, y)
    s.width = w
    s.height = h
    s.blendMode = blend
    s.alpha = alpha
    s.rotation = rotation
    layer.addChild(s)
    return s
  }

  // A tween that owns its target: counts toward busy() and destroys the target when done.
  function oneShot(target, vars) {
    const { onComplete, ...rest } = vars
    active++
    return gsap.to(target, {
      ...rest,
      onComplete() {
        active = Math.max(0, active - 1)
        onComplete?.call(this)
        destroyFx(target)
      },
    })
  }

  function light(x, y, { color = 0xffc27a, scale = 1, alpha = 0.6, duration = 0.25, texture = glow } = {}) {
    if (!motionOn()) return
    const s = new Sprite(texture)
    s.anchor.set(0.5)
    s.position.set(x, y)
    s.tint = color
    s.scale.set(scale)
    s.alpha = alpha
    lightLayer.addChild(s)
    oneShot(s, { alpha: 0, duration, ease: 'power2.out' })
  }

  function screenFlash(color, alpha, duration = 0.3) {
    const a = motionOn() ? alpha : Math.min(alpha, 0.12)
    if (a <= 0) return
    gsap.killTweensOf(flashRect)
    flashRect.tint = color
    flashRect.alpha = a
    gsap.to(flashRect, { alpha: 0, duration, ease: 'power2.out' })
  }

  function punch(amount = 0.03, x = size.w / 2, y = size.h / 2) {
    if (!motionOn()) return
    gsap.killTweensOf(camera, 'zoom,kickX,kickY')
    camera.zoom = 1 + amount
    camera.kickX = (size.w / 2 - x) * amount * 0.6
    camera.kickY = (size.h / 2 - y) * amount * 0.6
    gsap.to(camera, { zoom: 1, kickX: 0, kickY: 0, duration: 0.35, ease: 'power3.out' })
  }

  function hitStop(ms) {
    if (!motionOn()) return
    frozenUntil = Math.max(frozenUntil, performance.now() + ms)
    gsap.globalTimeline.pause()
    setTimeout(() => { if (performance.now() >= frozenUntil - 1) gsap.globalTimeline.resume() }, ms)
  }

  function emitSparks(x, y, { count = 10, color = 0xffd9a0, speed = [120, 360], life = [0.15, 0.35], gravity = 500, size = [1, 2.2], spread = Math.PI * 2, dir = 0, stretch = 0.03 } = {}) {
    if (!motionOn()) return
    for (let i = 0; i < count; i++) {
      const angle = dir + (Math.random() - 0.5) * spread
      const v = rand(...speed)
      const l = rand(...life)
      sparks.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: l, max: l, gravity, size: rand(...size), color, stretch })
    }
  }

  // ── Public API ──

  const view = {
    init: async () => {
      await app.init({
        canvas,
        width: Math.max(1, canvas.clientWidth),
        height: Math.max(1, canvas.clientHeight),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: false,
        autoStart: false,
        preference: 'webgl',
        resolution: Math.min(devicePixelRatio || 1, 2),
      })
      // Native UI uses Pixi's federated events; combat figures remain read-only.
      world.eventMode = 'none'
      overlay.eventMode = 'none'
      canvas.style.removeProperty('touch-action')
      canvas.style.removeProperty('cursor')

      glow = radialTexture(256, [[0, '#ffffffff'], [0.25, '#ffffffaa'], [0.6, '#ffffff22'], [1, '#ffffff00']])
      softGlow = radialTexture(128, [[0, '#ffffffcc'], [1, '#ffffff00']])
      dot = radialTexture(32, [[0, '#ffffffff'], [0.5, '#ffffff88'], [1, '#ffffff00']])
      redVignette = vignetteTexture('#7a0d12')

      flashRect = new Sprite(Texture.WHITE)
      flashRect.alpha = 0
      dangerVignette = new Sprite(redVignette)
      dangerVignette.alpha = 0
      overlay.addChild(dangerVignette, flashRect)

      for (let i = 0; i < 36; i++) {
        const m = new Sprite(dot)
        m.anchor.set(0.5)
        m.tint = i % 3 ? 0xd9c3a0 : 0xffb070
        m.blendMode = 'add'
        m.scale.set(rand(0.08, 0.2))
        m.x = Math.random() * 1600
        m.y = Math.random() * 900
        m.vx = rand(4, 16)
        m.vy = -rand(3, 12)
        m.seed = Math.random() * 10
        m.base = rand(0.12, 0.35)
        motes.push(m)
        world.addChildAt(m, world.getChildIndex(ringLayer))
      }

      for (let i = 0; i < 5; i++) {
        const puff = new Sprite(softGlow)
        puff.anchor.set(0.5)
        puff.tint = 0x9a9ca4
        puff.alpha = 0
        smokeHaze.push(puff)
        world.addChildAt(puff, world.getChildIndex(ringLayer))
      }

      app.stage.addChild(world, overlay)
      app.ticker.add(update)
      ready = true
      view.resize(size.w, size.h, size.dpr)

      // Upload every battle texture now so the first hit of each kind doesn't hitch. One synchronous
      // render does it; Pixi's prepare plugin waits on requestAnimationFrame, which never fires in a
      // background tab, and would stall loading until the tab is shown.
      const all = [COMBAT_BACKGROUND, SURVIVOR, ...Object.values(SURVIVOR_SPRITES), ...Object.values(SURVIVOR_INJURED),
        ...Object.values(SURVIVOR_INJURED_BY_CLASS).flatMap(Object.values), ...Object.values(ENEMY_SPRITES),
        ...Object.values(ENEMY_INJURED_SPRITES).flatMap(Object.values), ...Object.values(EFFECT_SPRITES)]
      const warm = new Container()
      for (const img of all) { const t = tex(img); if (t) warm.addChild(new Sprite(t)) }
      app.renderer.render({ container: warm })
      warm.destroy({ children: true })
      app.renderer.render(app.stage)
      view.resume()
    },

    get application() { return app },

    resize(w, h, dpr) {
      size = { w, h, dpr }
      if (!ready) return
      app.renderer.resize(w, h, dpr)
      // Browser zoom keeps the physical pixel count (1280 CSS px × 1.5 = 1920), and Pixi skips
      // its resize event when that count is unchanged, leaving app.screen at the old CSS size.
      // Nudge the size by one pixel and back so Pixi takes its real resize path.
      if (Math.abs(app.screen.width - w) > 0.5 || Math.abs(app.screen.height - h) > 0.5) {
        app.renderer.resize(w + 1, h, dpr)
        app.renderer.resize(w, h, dpr)
      }
      flashRect.width = w
      flashRect.height = h
      dangerVignette.width = w
      dangerVignette.height = h
      if (!app.ticker.started) app.render()
    },

    resume() {
      if (ready && !app.ticker.started && hooks.shouldRun()) app.start()
    },

    /** Dev/review only: slow every tween and the render clock together. */
    debugTimeScale(f) {
      gsap.globalTimeline.timeScale(f)
      app.ticker.speed = f
    },

    busy() {
      return active > 0 || particles.length > 0 || sparks.length > 0 || traces.length > 0 || textLayer.children.length > 0
    },

    reset() {
      gsap.killTweensOf(camera)
      camera.shake = 0
      camera.zoom = 1
      camera.kickX = camera.kickY = 0
      frozenUntil = 0
      gsap.globalTimeline.resume()
      particles = []
      sparks = []
      shells = []
      traces = []
      slides = []
      hero.recoil = hero.tintAmt = 0
      for (const layer of [fxLayer, ghostLayer, textLayer, stainLayer, lightLayer]) {
        for (const child of [...layer.children]) destroyFx(child)
      }
      for (const fig of enemies.values()) destroyFx(fig.root)
      enemies.clear()
      active = 0
    },

    clearStains() {
      for (const child of [...stainLayer.children]) destroyFx(child)
    },

    clearBlood() {
      particles = particles.filter((p) => !p.blood)
      view.clearStains()
    },

    stopMotion() {
      camera.shake = 0
      hero.recoil = 0
    },

    shake(amount) {
      if (motionOn()) camera.shake = Math.max(camera.shake, amount)
    },

    heroRecoil(amount) {
      hero.recoil = motionOn() ? amount : 0
    },

    heroHurt(strength = 1) {
      if (!motionOn()) return
      hero.tintAmt = strength
      gsap.to(hero, { tintAmt: 0, duration: 0.45, ease: 'power2.out' })
    },

    floatText(x, y, text, color = '#e6c995', { big = /^[−+]\d+$/.test(text) } = {}) {
      const { color: fill } = hexColor(color)
      const t = new Text({
        text,
        style: { fontFamily: fontFamily(), fontSize: big ? 28 : 19, fontWeight: 'bold', fill, stroke: { color: 0x17101b, width: big ? 5 : 3.5 } },
      })
      t.anchor.set(0.5, 0.8)
      t.position.set(x, y)
      textLayer.addChild(t)
      const motion = motionOn()
      if (motion) {
        t.scale.set(big ? 1.6 : 1.3)
        gsap.to(t.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(3)' })
      }
      oneShot(t, {
        y: motion ? y - 28 : y, duration: 1.2, ease: 'none',
        onUpdate() { t.alpha = clamp((1 - this.progress()) * 2.4, 0, 1) },
      })
    },

    burst(x, y, count = 20, color = '#9d424e', blood = true) {
      if (blood && !settings.blood) return
      const amount = motionOn() ? count : Math.min(5, count)
      const { color: c } = hexColor(color)
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 35 + Math.random() * 150
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, size: 1 + Math.random() * 2.6, life: 0.35 + Math.random() * 0.6, color: c, alpha: 1, blood })
      }
      if (!blood) return
      // Pool on the ground, drying out over ~12s.
      const g = hooks.geometry()
      const stain = new Graphics().ellipse(0, 0, 12 + count * 0.55, 4).fill({ color: 0x66233b })
      stain.position.set(x, g.ground + 5)
      stain.alpha = 0.5
      stainLayer.addChild(stain)
      while (stainLayer.children.length > 25) destroyFx(stainLayer.children[0])
      if (motionOn()) {
        stain.scale.set(0.2, 0.4)
        gsap.to(stain.scale, { x: 1, y: 1, duration: 0.5, ease: 'power2.out' })
      }
      gsap.to(stain, { alpha: 0, duration: 3, delay: 9, ease: 'none', onComplete: () => destroyFx(stain) })
    },

    /** An attack landing on an enemy at `point`. */
    impact(enemy, point, damage, style) {
      const fig = enemies.get(enemy.id)
      const motion = motionOn()
      if (fig) {
        fig.flashAmt = 1
        fig.recoil = motion ? style === 'shotgun' ? 1.3 : 0.65 : 0
      }
      if (damage <= 0) return
      const g = hooks.geometry()
      const fire = ['fire', 'burn'].includes(style)
      const scale = style === 'shotgun' ? 1.25 : style === 'knife' ? 0.72 : 1
      const life = style === 'shotgun' ? 0.34 : 0.26
      const s = fxSprite(EFFECT_SPRITES.impact, { x: point.x, y: point.y, w: 48 * scale * g.scale, h: 48 * scale * g.scale, blend: fire ? 'screen' : 'normal', alpha: fire ? 0.65 : 0.9, rotation: motion ? rand(-0.4, 0.4) : 0 })
      if (s) {
        const grow = (48 + 54) / 48
        gsap.to(s.scale, { x: s.scale.x * grow, y: s.scale.y * grow, duration: life, ease: 'power2.out' })
        oneShot(s, { alpha: 0, duration: life, ease: 'power1.in' })
      }
      if (fire) {
        emitSparks(point.x, point.y, { count: 14, color: 0xff9a40, speed: [40, 160], life: [0.4, 0.9], gravity: -120, size: [1.2, 2.6], stretch: 0.02 })
        light(point.x, point.y, { color: 0xff7a2a, scale: 0.9 * g.scale, alpha: 0.5, duration: 0.5 })
      } else {
        const heavy = ['shotgun', 'axe'].includes(style)
        emitSparks(point.x, point.y, { count: heavy ? 14 : 7, color: 0xffe2b0, speed: heavy ? [160, 420] : [100, 280], dir: Math.PI, spread: Math.PI * 1.4 })
        light(point.x, point.y, { color: 0xffd6a0, scale: (heavy ? 0.7 : 0.45) * g.scale, alpha: 0.35, duration: 0.18 })
      }
      if (style === 'axe') { view.shake(8); punch(0.025, point.x, point.y); hitStop(55) }
      if (style === 'shotgun') { punch(0.03, point.x, point.y); hitStop(45) }
    },

    enemyBuff(enemy) {
      const fig = enemies.get(enemy.id)
      if (!fig || !motionOn()) return
      fig.tint.tint = 0xff5a2a
      fig.tintAmt = 1.2
      const p = hooks.enemyPosition(enemy)
      light(p.x, p.y - 100 * p.scale, { color: 0xff5a2a, scale: 1.3 * p.scale, alpha: 0.45, duration: 0.7 })
      emitSparks(p.x, p.y - 20 * p.scale, { count: 16, color: 0xff7a4a, speed: [30, 90], life: [0.5, 0.9], gravity: -140, size: [1.2, 2.4], dir: -Math.PI / 2, spread: 1.2, stretch: 0.02 })
    },

    summoned(enemy) {
      summonedIds.add(enemy.id)
    },

    smokeEvade() {
      const g = hooks.geometry()
      emitSparks(g.heroX + 20 * g.scale, g.ground - 110 * g.scale, { count: 10, color: 0xb8bac2, speed: [20, 70], life: [0.5, 0.9], gravity: -40, size: [3, 6], stretch: 0.005 })
      if (motionOn()) gsap.fromTo(hero.body, { x: -14 * g.scale }, { x: 0, duration: 0.3, ease: 'power2.out' })
    },

    limbBroken(point) {
      emitSparks(point.x, point.y, { count: 18, color: 0xffd0a0, speed: [150, 380], life: [0.2, 0.45] })
      light(point.x, point.y, { color: 0xffb080, scale: 0.8, alpha: 0.45, duration: 0.3 })
      punch(0.04, point.x, point.y)
      hitStop(70)
    },

    /** Enemy steps into its attack; eases back afterwards. */
    lunge(enemy, hold = 0.11) {
      const fig = enemies.get(enemy.id)
      if (!fig || !motionOn()) return
      gsap.killTweensOf(fig, 'lunge')
      gsap.timeline()
        .to(fig, { lunge: 1, duration: hold, ease: 'power2.in' })
        .to(fig, { lunge: 0, duration: 0.3, ease: 'power2.out' })
    },

    /** Death: the figure tips over, sinks and fades. */
    kill(enemy) {
      const fig = enemies.get(enemy.id)
      if (!fig) return
      enemies.delete(enemy.id)
      if (fig.light) destroyFx(fig.light)
      ghostLayer.addChild(fig.root)
      fig.burn.visible = false
      const motion = motionOn()
      fig.sprite.tint = 0xb09090
      if (motion) {
        const g = hooks.geometry()
        emitSparks(fig.root.x, fig.root.y, { count: 10, color: 0x8a7a68, speed: [30, 90], life: [0.4, 0.8], gravity: -30, size: [2, 4], dir: -Math.PI / 2, spread: Math.PI, stretch: 0.01 })
        gsap.to(fig.body, { rotation: 0.65, duration: 0.6, ease: 'power2.in' })
        gsap.to(fig.body, { y: 18 * g.scale, duration: 0.6, ease: 'power2.in' })
      }
      oneShot(fig.root, { alpha: 0, duration: 0.6, ease: 'power1.in' })
    },

    playerHit(point, damage) {
      if (!damage) return
      view.heroHurt(1)
      screenFlash(0x8a1010, 0.16, 0.35)
      emitSparks(point.x, point.y, { count: 6, color: 0xffc8a0, speed: [80, 220], dir: Math.PI, spread: Math.PI })
    },

    injury(point) {
      view.heroHurt(1.4)
      screenFlash(0xa01010, 0.24, 0.6)
      punch(0.045, point.x, point.y)
      hitStop(90)
    },

    spellBurst(points) {
      for (const p of points) light(p.x, p.y, { color: 0xb9c8ff, scale: 1.1, alpha: 0.5, duration: 0.45 })
      screenFlash(0x9fb0ff, 0.12, 0.35)
    },

    /** Card action visuals, keyed like game.js visualKeys. `points` are the target points. */
    action(key, points) {
      const g = hooks.geometry()
      const s = g.scale
      const motion = motionOn()
      const muzzleX = g.heroX + 101 * s
      const muzzleY = g.ground - 126 * s

      if (key === 'pistol' || key === 'shotgun') {
        const heavy = key === 'shotgun'
        view.heroRecoil(heavy ? 1 : 0.4)
        view.shake(heavy ? 9 : 4)
        if (motion) {
          const m = fxSprite(EFFECT_SPRITES.muzzle, { x: muzzleX - 18 * s, y: muzzleY - 24 * s, w: 82 * s * (heavy ? 1.25 : 1), h: 48 * s * (heavy ? 1.25 : 1), blend: 'screen', anchor: 0 })
          if (m) oneShot(m, { alpha: 0, duration: heavy ? 0.12 : 0.08, ease: 'power2.in' })
          light(muzzleX + 20 * s, muzzleY, { color: 0xffc070, scale: (heavy ? 1.6 : 1.1) * s, alpha: heavy ? 0.75 : 0.55, duration: heavy ? 0.16 : 0.1 })
          emitSparks(muzzleX + 30 * s, muzzleY, { count: heavy ? 12 : 5, color: 0xffd080, speed: [200, 480], life: [0.08, 0.2], dir: 0, spread: 0.5, gravity: 200 })
          if (heavy) screenFlash(0xffc080, 0.08, 0.15)
          for (const point of points) {
            const count = heavy ? 5 : 1
            for (let i = 0; i < count; i++) traces.push({ x1: muzzleX, y1: muzzleY, x2: point.x + (Math.random() - 0.5) * 10, y2: point.y + (i - (count - 1) / 2) * 7, life: 0.07, max: 0.07 })
          }
        }
        shells.push({ x: g.heroX + 60 * s, y: g.ground - 125 * s, vx: -35, vy: -65, rotation: 0, life: 0.55, delay: heavy ? 0.59 : 0.055, heavy })
        if (heavy) slides.push({ t: -0.55 })
        return
      }

      if (key === 'knife' || key === 'axe') {
        const hitAt = key === 'knife' ? 0.105 : 0.17
        const px = (key === 'knife' ? 72 : 104) * s
        for (const p of points) {
          const sl = fxSprite(EFFECT_SPRITES.slash, { x: p.x, y: p.y, w: px, h: px, blend: 'screen', alpha: 0, rotation: motion ? rand(-0.35, 0.35) : 0 })
          if (!sl) continue
          const base = sl.scale.x
          if (motion) sl.scale.set(base * 0.6, base)
          gsap.set(sl, { alpha: 1, delay: hitAt })
          if (motion) gsap.to(sl.scale, { x: base * 1.15, y: base * 1.05, duration: 0.14, delay: hitAt, ease: 'power3.out' })
          oneShot(sl, { alpha: 0, duration: 0.14, delay: hitAt + 0.02, ease: 'power1.in' })
        }
        return
      }

      if (key === 'guard') {
        const w = 118 * s
        const h = 168 * s
        const gd = fxSprite(EFFECT_SPRITES.guard, { x: g.heroX + 30 * s, y: g.ground - h - 2 * s, w, h, anchor: 0 })
        if (!gd) return
        if (motion) {
          gd.y += 18 * s
          gd.rotation = -0.025
          gsap.to(gd, { y: g.ground - h - 2 * s, rotation: 0, duration: 0.14, ease: 'back.out(1.7)' })
          emitSparks(g.heroX + 80 * s, g.ground - 10 * s, { count: 9, color: 0xa68b68, speed: [28, 85], life: [0.24, 0.48], gravity: 180, dir: -Math.PI / 2, spread: 2.3, size: [1.2, 2.4], stretch: 0 })
        }
        oneShot(gd, { alpha: 0, duration: 0.25, delay: 0.4, ease: 'none' })
        return
      }

      if (key === 'heal') {
        const size = 92 * s
        const hl = fxSprite(EFFECT_SPRITES.heal, { x: g.heroX, y: g.ground - 120 * s, w: size, h: size, blend: 'screen' })
        if (!hl) return
        const base = hl.scale.x
        if (motion) gsap.to(hl.scale, { x: base * 1.06, y: base * 1.06, duration: 0.2, yoyo: true, repeat: 4, ease: 'sine.inOut' })
        light(g.heroX, g.ground - 110 * s, { color: 0x9fe0a0, scale: 1.2 * s, alpha: 0.35, duration: 1.0 })
        if (motion) emitSparks(g.heroX, g.ground - 60 * s, { count: 14, color: 0xc8f0b0, speed: [20, 60], life: [0.6, 1.0], gravity: -90, dir: -Math.PI / 2, spread: 1.6, size: [1.5, 2.8], stretch: 0.02 })
        oneShot(hl, { alpha: 0, duration: 0.2, delay: 0.9, ease: 'none' })
        return
      }

      if (key === 'quiet') {
        const w = 150 * s
        const h = 120 * s
        const q = fxSprite(EFFECT_SPRITES.quiet, { x: g.heroX - w / 2, y: g.ground - h, w, h, alpha: 0.62, anchor: 0 })
        if (!q) return
        if (motion) gsap.to(q, { x: q.x - 12 * s, duration: 0.65, ease: 'sine.out' })
        oneShot(q, { alpha: 0, duration: 0.4, delay: 0.25, ease: 'none' })
        return
      }

      if (key === 'fire' && points.length) {
        const target = points[Math.floor(points.length / 2)]
        const sx = g.heroX
        const sy = g.ground - 125 * s
        const bottle = fxSprite(EFFECT_SPRITES.molotov, { x: sx, y: sy, w: 70 * s, h: 47 * s, rotation: Math.atan2(target.y - sy, target.x - sx) })
        if (!bottle) return
        const arc = { p: 0 }
        oneShot(bottle, {
          duration: 0.34, ease: 'none',
          onUpdate() {
            arc.p = this.progress()
            bottle.x = sx + (target.x - sx) * arc.p
            bottle.y = sy + (target.y - sy) * arc.p - (motion ? Math.sin(arc.p * Math.PI) * 60 : 0)
            if (motion) bottle.rotation += 0.25
          },
          onComplete() {
            light(target.x, target.y, { color: 0xff7a2a, scale: 1.8 * s, alpha: 0.8, duration: 0.6 })
            emitSparks(target.x, target.y, { count: 22, color: 0xffa040, speed: [60, 260], life: [0.3, 0.8], gravity: -60, size: [1.5, 3], stretch: 0.02 })
            screenFlash(0xff8030, 0.1, 0.3)
          },
        })
        return
      }

      if (key === 'flare' && points.length) {
        const target = points[Math.floor(points.length / 2)]
        const sx = g.heroX + 75 * s
        const sy = g.ground - 126 * s
        const fl = fxSprite(EFFECT_SPRITES.flare, { x: sx, y: sy, w: 96, h: 48, blend: 'screen', rotation: Math.atan2(target.y - sy, target.x - sx) })
        if (!fl) return
        const trail = new Sprite(glow)
        trail.anchor.set(0.5)
        trail.tint = 0xff8a50
        trail.scale.set(0.5)
        trail.alpha = motion ? 0.7 : 0
        lightLayer.addChild(trail)
        oneShot(fl, {
          duration: 0.46, ease: 'none',
          onUpdate() {
            const p = this.progress()
            fl.x = sx + (target.x - sx) * p
            fl.y = sy + (target.y - sy) * p - Math.sin(p * Math.PI) * 34
            trail.position.copyFrom(fl.position)
            if (motion && Math.random() < 0.6) emitSparks(fl.x, fl.y, { count: 1, color: 0xffb070, speed: [10, 40], life: [0.2, 0.4], gravity: 60, size: [1, 2] })
          },
          onComplete() {
            destroyFx(trail)
            light(target.x, target.y, { color: 0xff6a40, scale: 1.4 * s, alpha: 0.7, duration: 0.45 })
          },
        })
        return
      }

      if (key === 'grenade') {
        for (const point of points) {
          const bl = fxSprite(EFFECT_SPRITES.grenade, { x: point.x, y: point.y, w: 80 * s, h: 80 * s, blend: 'screen', alpha: 0 })
          if (!bl) continue
          const base = bl.scale.x
          gsap.set(bl, { alpha: 1, delay: 0.18 })
          gsap.to(bl.scale, { x: base * 215 / 80, y: base * 215 / 80, duration: 0.28, delay: 0.18, ease: 'power3.out' })
          oneShot(bl, { alpha: 0, duration: 0.28, delay: 0.62, ease: 'none' })
        }
        const center = points.length ? points.reduce((a, p) => ({ x: a.x + p.x / points.length, y: a.y + p.y / points.length }), { x: 0, y: 0 }) : null
        gsap.delayedCall(0.18, () => {
          if (center) {
            light(center.x, center.y, { color: 0xffa050, scale: 2.6 * s, alpha: 0.9, duration: 0.7 })
            emitSparks(center.x, center.y, { count: 30, color: 0xffc070, speed: [200, 600], life: [0.2, 0.6], gravity: 400 })
            punch(0.05, center.x, center.y)
          }
          screenFlash(0xffd0a0, 0.3, 0.4)
          view.shake(14)
          hitStop(70)
        })
        return
      }

      if (key === 'focus') {
        const w = 92 * s
        const h = 58 * s
        const fc = fxSprite(EFFECT_SPRITES.focus, { x: g.heroX - w / 2, y: g.ground - 222 * s, w, h, blend: 'screen', alpha: 0.8, anchor: 0 })
        if (fc) oneShot(fc, { alpha: 0, duration: 0.5, delay: 0.1, ease: 'none' })
        const cx = g.heroX
        const cy = g.ground - 120 * s
        const im = fxSprite(EFFECT_SPRITES.flareImpact, { x: cx, y: cy, w: 70 * s, h: 70 * s, blend: 'screen', alpha: 0 })
        if (im) {
          const base = im.scale.x
          gsap.set(im, { alpha: 1, delay: 0.34 })
          gsap.to(im.scale, { x: base * 260 / 70, y: base * 260 / 70, duration: 0.22, delay: 0.34, ease: 'power2.out' })
          oneShot(im, { alpha: 0, duration: 0.34, delay: 0.61, ease: 'none' })
        }
        gsap.delayedCall(0.34, () => light(cx, cy, { color: 0xffe0a0, scale: 1.4 * s, alpha: 0.5, duration: 0.5 }))
        return
      }

      if (key === 'flashbang' && points.length) {
        const center = points.reduce((a, p) => ({ x: a.x + p.x / points.length, y: a.y + p.y / points.length }), { x: 0, y: 0 })
        const fb = fxSprite(EFFECT_SPRITES.flashbang, { x: center.x, y: center.y, w: 110 * s, h: 110 * s, blend: 'screen' })
        if (!fb) return
        const base = fb.scale.x
        if (motion) gsap.to(fb.scale, { x: base * 420 / 110, y: base * 420 / 110, duration: 0.16, ease: 'power3.out' })
        else fb.scale.set(base * 420 / 110)
        oneShot(fb, { alpha: 0, duration: 0.42, delay: 0.36, ease: 'none' })
        screenFlash(0xffffff, 0.6, 0.7)
        light(center.x, center.y, { color: 0xffffff, scale: 3 * s, alpha: 0.9, duration: 0.6 })
      }
    },
  }

  return view
}
