// 그래픽 선로딩. 1단계(첫 화면·첫 전투에 보이는 것)는 끝날 때까지 기다리고,
// 2단계(나머지)는 게임을 막지 않고 뒤에서 받는다. 받은 파일은 브라우저 캐시에서 다시 쓴다.
// 디코딩한 그림을 붙잡아 두지는 않는다: 원본이 커서(1536×1024) 전부 들고 있으면 수백 MB가 된다.
// Exception: card art (768x512, ~70MB decoded in total) is kept decoded and cloned, because
// render() rebuilds every <img>; fresh ones flash blank for a frame while they decode.
import * as ART from '../art/assets.js'

// assets.js 밖, game.js 안에만 적혀 있는 그림들.
const CLASS_PORTRAITS = [
  '/assets/art/survivor-class-v1.webp',
  '/assets/art/survivor-mage-v1.webp',
  '/assets/art/survivor-berserker-v1.webp',
]
const ROUTE_ART = [
  '/assets/art/route-shelter-v1.webp',
  '/assets/art/route-workshop-v1.webp',
  '/assets/art/route-stranger-v1.webp',
  '/assets/art/route-armory-v1.webp',
]

// assets.js 값(문자열 경로 · Image · 그 둘을 담은 객체)을 전부 펼친다.
function collect(value, out = []) {
  if (typeof value === 'string') { if (value.includes('/assets/')) out.push(value) }
  else if (typeof Image !== 'undefined' && value instanceof Image) out.push(value)
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collect(v, out)
  return out
}

const keyOf = asset => (typeof asset === 'string' ? new URL(asset, location.href).href : asset.src)

const decodedCards = new Map()
const heldImages = new WeakSet()

/** Clone of the held, decoded card image, or null if it is not ready. */
export function cardImage(key) {
  const held = decodedCards.get(key)
  if (!held) return null
  const copy = held.cloneNode()
  copy.decoding = 'sync'
  return copy
}

// All card art is critical, so loot/reward cards seen for the first time do not pop in.
function holdCardArt() {
  return Object.entries(ART.CARD_ART).map(([key, src]) => {
    const img = Object.assign(new Image(), { src })
    decodedCards.set(key, img)
    heldImages.add(img)
    img.decode().catch(() => decodedCards.delete(key))
    return img
  })
}

/** [필수, 나머지]. 같은 파일은 한 번만. */
export function artTiers() {
  const first = [
    // The battle renderer has no fallback drawings, so every battle sprite is critical.
    ART.COMBAT_BACKGROUND, ART.SURVIVOR, ART.SURVIVOR_SPRITES, ART.SURVIVOR_INJURED, ART.SURVIVOR_INJURED_BY_CLASS,
    ART.INFECTED, ART.ENEMY_SPRITES, ART.ENEMY_INJURED_SPRITES, ART.EFFECT_SPRITES,
    ART.COIN_HEADS, ART.COIN_TAILS, ART.UPGRADE_EPAULETTE, CLASS_PORTRAITS, holdCardArt(),
  ]
  const seen = new Set()
  const unique = list => collect(list).filter(asset => { const k = keyOf(asset); if (seen.has(k)) return false; seen.add(k); return true })
  const critical = unique(first)
  const rest = unique([Object.values(ART), ROUTE_ART])
  return [critical, rest]
}

function load(asset) {
  // assets.js의 Image는 이미 받는 중이니 끝나기만 기다린다. 경로는 새 Image로 받아 캐시만 채운다.
  const img = typeof asset === 'string' ? Object.assign(new Image(), { src: asset }) : asset
  // Held card art must finish decoding, or the first hand still flashes blank.
  if (heldImages.has(img)) return img.decode().catch(() => {})
  if (img.complete) return Promise.resolve()
  // 실패한 그림은 건너뛴다. 게임은 폴백 그림으로 돈다.
  return new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }) })
}

async function loadAll(list, concurrency, onEach) {
  let next = 0
  const worker = async () => { while (next < list.length) { await load(list[next++]); onEach?.() } }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker))
}

/** 필수 그림을 받는 동안 onProgress(done, total). 끝나면 나머지를 뒤에서 받기 시작한다. */
export async function preloadArt(onProgress = () => {}) {
  const [critical, rest] = artTiers()
  let done = 0
  onProgress(0, critical.length)
  await loadAll(critical, 6, () => onProgress(++done, critical.length))
  loadAll(rest, 2)
}
