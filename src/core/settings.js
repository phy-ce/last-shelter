const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
const STORAGE_KEY = 'last-shelter:settings'
const SETTINGS_VERSION = 2

const defaults = {
  volume: 72,
  muted: false,
  ambience: false, // 폐허 환경음: 배경 음악으로 대체되어 꺼 둔다(설정에서도 뺐다).
  music: false,
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
    for (const key of ['muted', 'motion', 'blood']) {
      if (typeof parsed[key] === 'boolean') result[key] = parsed[key]
    }
    // v1에서는 음악이 기본 ON이어서 다른 설정만 저장해도 music:true가 남았다.
    // v2부터는 명시적으로 다시 켠 경우에만 저장값을 복원한다.
    if (parsed.version >= SETTINGS_VERSION && typeof parsed.music === 'boolean') result.music = parsed.music
    return result
  } catch {
    return {}
  }
}

export const settings = { ...defaults, ...loadSettings() }

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, version: SETTINGS_VERSION }))
  } catch {
    // 저장 공간이 없거나 사생활 보호 모드면 조용히 건너뜁니다.
  }
}

export const motionOn = () => settings.motion && !motionPreference.matches
