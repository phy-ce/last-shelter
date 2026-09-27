import { settings } from '../core/settings.js'

// 효과음은 전부 Sonniss GDC Game Audio Bundle에서 잘라 왔다(출처: public/assets/audio/sonniss/CREDITS.md).
const S = name => `/assets/audio/sonniss/${name}.ogg`

const files = {
  coin: [S('coin')],
  pistol: [S('pistol'), S('gun-handle')],
  shotgun: [S('shotgun'), S('gun-handle')],
  knife: [S('knife-swing'), S('knife-flesh')],
  axe: [S('axe-chop'), S('axe-bone')],
  guard: [S('guard')],
  grenade: [S('grenade')],
  flare: [S('flare')],
  hit: [S('hit')],
  blockHit: [S('block-hit')],
  cardDrop: [S('card')],
  flashbang: [S('flashbang')],
  glass: [S('glass')],
  heal: [S('heal')],
  reward: [S('reward')],
  focus: [S('focus')],
  quiet: [S('quiet')],
  search: [S('search')],
  playerInjury: [],
  playerDeath: [S('death-body')],
  zombieDeath: [],
}

const screamVariants = {
  playerInjury: [S('injury-1'), S('injury-2'), S('injury-3')],
  playerDeath: [S('death-scream')],
  zombieDeath: [S('zombie-1'), S('zombie-2'), S('zombie-3')],
}

// 브라우저(특히 모바일 Chrome)는 동시에 살아 있는 미디어 엘리먼트 수를 제한한다.
// 파일당 1개만 미리 만들고, 겹쳐 재생될 때만 상한까지 늘린다.
const POOL_LIMIT = 3
const pools = new Map()
const lastVariant = new Map()

function voice(src) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

function acquire(src) {
  const pool = pools.get(src) ?? []
  pools.set(src, pool)
  const idle = pool.find(a => a.paused || a.ended)
  if (idle) return idle
  if (pool.length < POOL_LIMIT) {
    const audio = voice(src)
    pool.push(audio)
    return audio
  }
  return pool[0]
}

function pickVariant(key) {
  const variants = screamVariants[key]
  if (!variants?.length) return null
  const previous = lastVariant.get(key)
  const choices = variants.length > 1 ? variants.filter(src => src !== previous) : variants
  const selected = choices[Math.floor(Math.random() * choices.length)]
  lastVariant.set(key, selected)
  return selected
}

function fadeVoice(audio, peak) {
  const fadeIn = .065
  const fadeOut = .22
  const started = performance.now()
  let frame = 0
  const update = () => {
    if (audio.paused || audio.ended) return
    const elapsed = (performance.now() - started) / 1000
    const remaining = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - audio.currentTime) : Infinity
    const envelope = Math.min(1, elapsed / fadeIn, remaining / fadeOut)
    audio.volume = peak * Math.max(0, envelope)
    frame = requestAnimationFrame(update)
  }
  audio.addEventListener('ended', () => cancelAnimationFrame(frame), { once: true })
  audio.volume = 0
  frame = requestAnimationFrame(update)
}

export const Samples = {
  /** 이 소리에 녹음 샘플이 있으면 true. 있으면 엔진의 합성음은 얹지 않는다. */
  has(key) { return Boolean(files[key]?.length || screamVariants[key]?.length) },
  preload() {
    for (const src of new Set([...Object.values(files).flat(), ...Object.values(screamVariants).flat()])) {
      if (!pools.has(src)) pools.set(src, [voice(src)])
    }
  },
  play(key) {
    if (settings.muted || document.hidden) return
    const variant = pickVariant(key)
    const sources = variant ? [variant, ...(files[key] ?? [])] : files[key]
    if (!sources) return
    for (const [index, src] of (Array.isArray(sources) ? sources : [sources]).entries()) {
      const audio = acquire(src)
      audio.pause()
      audio.currentTime = 0
      const darkVoice = ['playerInjury', 'playerDeath', 'zombieDeath'].includes(key)
      const peak = Math.min(1, settings.volume / 100 * (darkVoice ? (index ? .13 : key === 'zombieDeath' ? .4 : .48) : key === 'shotgun' ? .42 : index ? .19 : .3))
      audio.volume = peak
      audio.playbackRate = key === 'zombieDeath' ? .96 + Math.random() * .06 : darkVoice ? .82 + Math.random() * .08 : key === 'knife' ? .96 + Math.random() * .05 : .88 + Math.random() * .07
      if (darkVoice && index === 0) fadeVoice(audio, peak)
      void audio.play().catch(() => {})
    }
  },
}

Samples.preload()
