const STORAGE_KEY = 'last-shelter:run'
const SAVE_VERSION = 2 // 2: 스테이지·적 패턴 추가

// 런은 매 턴 시작 시점에만 저장한다. 그 사이 상태는 새로고침하면 마지막 턴 시작으로 돌아간다.
export function saveRun(state, uid) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), uid, state }))
  } catch {
    // 저장 실패는 게임 진행을 막지 않는다.
  }
}

export function loadRun() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== SAVE_VERSION || !parsed.state || typeof parsed.uid !== 'number') return null
    if (parsed.state.phase !== 'combat' || !Array.isArray(parsed.state.enemies) || !parsed.state.enemies.length) return null
    return parsed
  } catch {
    return null
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 무시
  }
}
