// 배경 음악. 효과음 엔진(engine.js)과 따로 HTMLAudio로 스트리밍한다(곡 전체를 디코딩해 두지 않는다).
// 곡 출처·라이선스는 public/assets/audio/music/CREDITS.md.
import { settings } from '../core/settings.js'

const TRACKS = {
  explore: '/assets/audio/music/explore.mp3', // 메뉴 · 경로 · 정비
  combat: '/assets/audio/music/combat.mp3',
  boss: '/assets/audio/music/boss.mp3',
}
const LEVEL = 0.3 // 효과음보다 한참 아래에 깐다.
const FADE_MS = 1200

let key = null
let current = null
let waitingForGesture = false

const level = () => (settings.muted || !settings.music ? 0 : settings.volume / 100 * LEVEL)

function fade(audio, to, ms, done) {
  clearInterval(audio._fade)
  const from = audio.volume
  const start = performance.now()
  audio._fade = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / ms)
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * t))
    if (t === 1) { clearInterval(audio._fade); done?.() }
  }, 40)
}

// 브라우저는 첫 클릭·키 입력 전에는 재생을 막는다. 막히면 첫 입력 때 다시 튼다.
function start(audio) {
  audio.play().then(() => fade(audio, level(), FADE_MS)).catch(() => {
    if (waitingForGesture) return
    waitingForGesture = true
    const retry = () => {
      waitingForGesture = false
      removeEventListener('pointerdown', retry)
      removeEventListener('keydown', retry)
      if (current && current.paused && !document.hidden) start(current)
    }
    addEventListener('pointerdown', retry)
    addEventListener('keydown', retry)
  })
}

function play(next) {
  if (next === key && current) return
  const old = current
  if (old) fade(old, 0, FADE_MS, () => old.pause())
  key = next
  current = null
  if (!TRACKS[next]) return
  const audio = new Audio(TRACKS[next])
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 0
  current = audio
  if (level() > 0 && !document.hidden) start(audio)
}

function stop() { play(null) }

/** 볼륨·음소거·음악 켜기 설정이 바뀌면 부른다. */
function updateVolume() {
  if (!current) return
  if (level() > 0 && current.paused && !document.hidden) start(current)
  else fade(current, level(), 200, () => { if (level() === 0) current?.pause() })
}

document.addEventListener('visibilitychange', () => {
  if (!current) return
  if (document.hidden) current.pause()
  else if (level() > 0) start(current)
})

export const Music = { play, stop, updateVolume }
