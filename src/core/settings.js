const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
const STORAGE_KEY = 'last-shelter:settings'

const defaults = {
  volume: 72,
  muted: false,
  ambience: true,
  music: true,
  motion: !motionPreference.matches,
  blood: true,
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result = {}
    if (typeof parsed.volume === 'number') result.volume = Math.max(0, Math.min(100, parsed.volume))
    for (const key of ['muted', 'ambience', 'music', 'motion', 'blood']) {
      if (typeof parsed[key] === 'boolean') result[key] = parsed[key]
    }
    return result
  } catch {
    return {}
  }
}

export const settings = { ...defaults, ...loadSettings() }

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 저장 공간이 없거나 사생활 보호 모드면 조용히 건너뜁니다.
  }
}

export const motionOn = () => settings.motion && !motionPreference.matches
