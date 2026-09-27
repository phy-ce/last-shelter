// 전투·준비 단계의 규칙. 화면, 소리, 애니메이션을 전혀 모른다.
//
// 모든 함수는 `state`를 직접 바꾸고, 무슨 일이 있었는지를 이벤트 배열로 돌려준다.
// 이벤트는 `{ type, text?, ...data }` 형태이며 `text`가 있으면 이미 state.logs에 기록된 상태다.
// 화면 쪽(game.js)은 이벤트를 받아 파티클·효과음·플로팅 텍스트로 바꾸기만 한다.
// 시뮬레이터나 테스트는 이 파일만 import해서 브라우저 없이 전투를 돌릴 수 있다.

import { CARDS, ENEMY_TYPES, ENEMY_PATTERNS, STAGES, LIMBS, SKILL_POOL, skillEffects } from '../content/combat.js'
import { LOOT_TABLE, ARMORY_TABLE, BAG, itemDef, itemShape } from '../content/items.js'
import { classDef, classTrait } from '../content/classes.js'

// ── 난수 / 식별자 ──────────────────────────────────────────────

let random = Math.random
let uid = 0

/** 시뮬레이션 재현용. `fn`은 [0, 1) 실수를 돌려줘야 한다. */
export function setRandom(fn) { random = fn }
export function getUid() { return uid }
export function setUid(value) { uid = Math.max(uid, value) }

export function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function log(state, events, text, extra = {}) {
  state.logs.unshift(text)
  state.logs = state.logs.slice(0, 100)
  events.push({ type: 'log', text, ...extra })
  return events
}

function emit(state, events, type, data = {}, text = null) {
  if (text) {
    state.logs.unshift(text)
    state.logs = state.logs.slice(0, 100)
  }
  events.push({ type, text, ...data })
  return events
}

// ── 카드 / 아이템 / 덱 ───────────────────────────────────────────

export function makeCard(key, sourceItem = null, upgraded = false) {
  return { id: ++uid, key, upgraded, sourceItem }
}

export function makeItem(key) {
  const data = itemDef(key)
  // pos: 가방 안 위치 { x, y, rot } — 손에 들었으면 null. rot 1이면 90° 회전(가로세로 바뀜).
  return { uid: ++uid, key, uses: data.uses ?? null, upgraded: false, pos: null }
}
// 화면·로그용 이름. 탄약은 개수를 붙인다: '탄약 ×8'.
export function itemLabel(item) {
  const data = itemDef(item.key)
  return data.kind === 'resource' ? `${data.name} ×${item.uses}` : data.name
}

export const HAND_LIMIT = 10
export const BASE_DRAW = 5
export const BASE_ENERGY = 3
export const NOISE_THRESHOLD = 6
export const MAX_ENEMIES = 5
// 감염: 턴 시작마다 감염/INFECTION_DIVISOR 만큼 방어 무시 피해. FEVER 이상이면 행동력 −1.
export const INFECTION_DIVISOR = 2
export const FEVER_THRESHOLD = 8

export function infectionTick(state) { return Math.floor(state.infection / INFECTION_DIVISOR) }
export function hasFever(state) { return state.infection >= FEVER_THRESHOLD }

export function createState(classId = 'survivor') {
  const cls = classDef(classId)
  const inventory = cls.inventory.map(key => {
    const item = makeItem(key)
    if (cls.startUses?.[key] != null) item.uses = cls.startUses[key]
    return item
  })
  const equipItem = cls.equip ? inventory.find(item => item.key === cls.equip) : null
  const state = {
    classId,
    bag: { cols: BAG.cols, rows: BAG.rows },
    hp: cls.hp,
    maxHp: cls.hp,
    energy: BASE_ENERGY,
    block: 0,
    noise: 0,
    infection: 0,
    strength: 0,
    stage: 0,
    turn: 0,
    drawPenalty: 0,
    grabbed: 0,
    numb: false, // 진통제: 이번 턴 사지 부상 무시
    pending: [], // 예약 주문: 다음 턴 시작에 발동 { key, upgraded, targetId, partKey }
    phase: 'combat',
    target: null,
    selected: null,
    // 술사는 두 팔이 없다: 영구 부상으로 표현하고, 치료 대상에서 제외한다.
    limbs: { leftArm: Boolean(cls.traits.noArms), rightArm: Boolean(cls.traits.noArms), leftLeg: false, rightLeg: false },
    permanentLimbs: cls.traits.noArms ? ['leftArm', 'rightArm'] : [],
    skills: cls.skills.flatMap(([key, count]) => Array.from({ length: count }, () => makeCard(key))),
    inventory,
    equipment: equipItem
      ? (itemDef(equipItem.key).hands === 2 ? { left: equipItem.uid, right: equipItem.uid } : { left: equipItem.uid, right: null })
      : { left: null, right: null },
    deck: [],
    draw: [],
    hand: [],
    discard: [],
    exhausted: [],
    enemies: [],
    logs: [],
  }
  for (const item of inventory) if (item !== equipItem) placeAuto(state, item)
  state.deck = buildDeck(state)
  return state
}

// ── 가방 ────────────────────────────────────────────────────────
// 가방은 격자다. 아이템은 pos가 있으면 가방 안, 없으면 손에 든 것(equipment)이다.
// 손에 든 무기만 카드를 준다. 소모품·탄약은 가방에 있으면 쓸 수 있다.

/** 회전을 반영한 실제 크기. rot을 주면 그 회전 기준. */
export function itemSize(item, rot = item.pos?.rot || 0) {
  const { w, h } = itemShape(itemDef(item.key))
  return rot % 2 ? { w: h, h: w } : { w, h }
}

export function bagCells(item, pos = item.pos) {
  if (!pos) return []
  const { w, h } = itemSize(item, pos.rot)
  const cells = []
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push(`${pos.x + dx},${pos.y + dy}`)
  return cells
}

export function inBag(item) { return Boolean(item.pos) }
export function isEquipped(state, uid) { return state.equipment.left === uid || state.equipment.right === uid }

/** (x, y, rot)에 놓을 수 있는가. 자기 자신은 겹침에서 제외. */
export function canPlace(state, item, x, y, rot = 0) {
  const { w, h } = itemSize(item, rot)
  if (x < 0 || y < 0 || x + w > state.bag.cols || y + h > state.bag.rows) return false
  const taken = new Set(state.inventory.filter(other => other.uid !== item.uid && other.pos).flatMap(other => bagCells(other)))
  return bagCells(item, { x, y, rot }).every(cell => !taken.has(cell))
}

/** 들어갈 자리를 찾는다. 위→아래, 왼→오른, 회전 없이 먼저. */
export function findSpot(state, item) {
  for (const rot of [0, 1]) {
    const { w, h } = itemSize(item, rot)
    if (rot === 1 && w === h) break
    for (let y = 0; y < state.bag.rows; y++) for (let x = 0; x < state.bag.cols; x++) if (canPlace(state, item, x, y, rot)) return { x, y, rot }
  }
  return null
}

export function bagHasRoom(state, item) { return Boolean(findSpot(state, item)) }

function placeAuto(state, item) {
  const spot = findSpot(state, item)
  if (!spot) return false
  item.pos = spot
  return true
}

/** 가방 안 (x, y)로 옮긴다. 손에 든 것이었으면 손에서 내려온다. 못 놓으면 false. */
export function placeItem(state, uid, x, y, rot = 0, events = []) {
  const item = state.inventory.find(entry => entry.uid === uid)
  if (!item || !canPlace(state, item, x, y, rot)) return false
  const wasEquipped = isEquipped(state, uid)
  if (state.equipment.left === uid) state.equipment.left = null
  if (state.equipment.right === uid) state.equipment.right = null
  item.pos = { x, y, rot }
  if (wasEquipped) { syncDeck(state); log(state, events, `${itemDef(item.key).name} 가방에 넣음.`) }
  return true
}

/** 가방이나 손에서 아이템을 버린다. */
export function discardItem(state, uid, events = []) {
  const item = state.inventory.find(entry => entry.uid === uid)
  if (!item) return events
  if (state.equipment.left === uid) state.equipment.left = null
  if (state.equipment.right === uid) state.equipment.right = null
  state.inventory = state.inventory.filter(entry => entry.uid !== uid)
  syncDeck(state)
  return log(state, events, `${itemLabel(item)} 버림.`)
}

/** 세이브 복원용: pos 없는 옛 아이템을 가방에 채워 넣고, 못 넣는 것은 버린다. */
export function normalizeBag(state, events = []) {
  state.bag = state.bag || { cols: BAG.cols, rows: BAG.rows }
  for (const item of [...state.inventory]) {
    if (item.pos || isEquipped(state, item.uid)) continue
    if (item.pos === undefined) item.pos = null
    if (!placeAuto(state, item)) {
      state.inventory = state.inventory.filter(entry => entry.uid !== item.uid)
      log(state, events, `${itemLabel(item)} · 가방에 자리가 없어 두고 왔다.`)
    }
  }
  syncDeck(state)
  return events
}

export function buildDeck(state) {
  const cards = state.skills.map(card => makeCard(card.key, null, card.upgraded))
  const equipped = [...new Set(Object.values(state.equipment).filter(Boolean))]
  for (const item of state.inventory) {
    const data = itemDef(item.key)
    const active = data.kind === 'consumable' ? item.uses > 0 : equipped.includes(item.uid)
    if (!active) continue
    for (const key of data.cards) cards.push(makeCard(key, item.uid, item.upgraded))
  }
  return cards
}

export function syncDeck(state) {
  state.deck = buildDeck(state)
}

export function sourceItem(state, card) {
  return card.sourceItem == null ? null : state.inventory.find(item => item.uid === card.sourceItem) || null
}

export function rarityOf(state, card) {
  const item = sourceItem(state, card)
  return item ? itemDef(item.key).rarity : CARDS[card.key].rarity || 'common'
}

export function disabledByInjury(state, card) {
  if (state.numb) return null
  if (classTrait(state, 'noArms') && CARDS[card.key].magic) return null
  const item = sourceItem(state, card)
  if (!item) return null
  const data = itemDef(item.key)
  if (data.kind === 'consumable') {
    return state.limbs.leftArm && state.limbs.rightArm ? '두 팔 부상 · 소모품을 쓸 손이 없음' : null
  }
  if (data.kind !== 'hand') return null
  const onLeft = state.equipment.left === item.uid
  const onRight = state.equipment.right === item.uid
  if (data.hands === 2 && (state.limbs.leftArm || state.limbs.rightArm)) return '양손 장비 · 다친 팔로는 사용할 수 없음'
  if (onLeft && state.limbs.leftArm) return '왼팔 부상 · 왼손 장비 사용 불가'
  if (onRight && state.limbs.rightArm) return '오른팔 부상 · 오른손 장비 사용 불가'
  return null
}

export function ammoCount(state) {
  return state.inventory.filter(item => item.key === 'magazine').reduce((sum, item) => sum + item.uses, 0)
}

export function cardLockReason(state, card) {
  const injury = disabledByInjury(state, card)
  if (injury) return injury
  const needed = CARDS[card.key].ammo || 0
  if (needed && ammoCount(state) < needed) return `탄약 부족 · ${needed}발 필요`
  return null
}

export function consumeAmmo(state, amount, events = []) {
  let remaining = amount
  for (const item of state.inventory.filter(entry => entry.key === 'magazine')) {
    const spent = Math.min(item.uses, remaining)
    item.uses -= spent
    remaining -= spent
    if (!remaining) break
  }
  state.inventory = state.inventory.filter(item => item.key !== 'magazine' || item.uses > 0)
  return log(state, events, `탄약 ${amount}발 사용 · ${ammoCount(state)}발 남음.`)
}

// ── 적 ───────────────────────────────────────────────────────

function part(key, name, hp, effect) {
  return { key, name, hp, maxHp: hp, effect }
}

export function makeEnemy(state, type) {
  const base = ENEMY_TYPES[type]
  const hp = base.hp + (type === 'boss' ? 0 : state.stage * 2)
  const parts = []
  if (type === 'runner') parts.push(part('leg', '다리', 10, '연타 횟수 2 → 1.'))
  if (type === 'spitter') parts.push(part('arm', '팔', 12, '공격의 감염 효과 제거.'))
  if (type === 'brute') parts.push(part('arm', '팔', 15, '사지 강타 제거. 매 턴 약한 일반 공격.'))
  if (type === 'boss') {
    parts.push(part('arm', '팔', 23, '사지 강타를 일반 공격 10으로 변경.'))
    parts.push(part('leg', '다리', 18, '타격당 공격 피해 3 감소.'))
  }
  const pattern = ENEMY_PATTERNS[type]
  if (pattern?.part) parts.push(part(pattern.part.key, pattern.part.name, pattern.part.hp, pattern.part.effect))
  return {
    ...base,
    id: ++uid,
    type,
    hp,
    maxHp: hp,
    parts,
    burn: 0,
    recoil: 0,
    flash: 0,
    lunge: 0,
    block: 0,
    staggered: false,
    staggerResist: 0,
    primed: false, // 힘 모으기에 성공해 다음 특수 행동을 쓸 수 있는 상태
    strength: 0, // 힘 올리기로 쌓인 공격 피해 보너스
    intent: null,
  }
}

export function limbName(key) {
  return LIMBS.find(l => l.key === key)?.name || '몸'
}

export function partBroken(enemy, key) {
  return enemy.parts.some(p => p.key === key && p.hp === 0)
}

export function injuredCount(state, type) {
  return LIMBS.filter(l => (!type || l.type === type) && state.limbs[l.key]).length
}

function availableLimb(state, enemy) {
  const healthy = LIMBS.filter(l => !state.limbs[l.key])
  if (!healthy.length) return null
  return healthy[(state.turn + (enemy.type === 'boss' ? 1 : 0)) % healthy.length].key
}

const STAGGER_INTENT = () => ({ type: 'stagger', damage: 0, hits: 0, infection: 0, coin: false, limb: null })

// 패턴 한 단계를 의도로 만든다.
function patternIntent(state, enemy, step) {
  const bonus = Math.floor(state.stage / 2)
  const base = { damage: 0, hits: 0, infection: 0, coin: false, limb: null }
  if (step.type === 'attack') return { ...base, type: 'attack', damage: step.damage + bonus + (enemy.strength || 0), hits: step.hits || 1, infection: step.infection || 0, grab: Boolean(step.grab) }
  if (step.type === 'guard') return { ...base, type: 'guard', block: step.block + bonus }
  return { ...base, type: step.type, noise: step.noise || 0, heal: step.heal || 0 }
}

export function setIntent(state, enemy) {
  const bonus = Math.floor(state.stage / 2)
  const attack = (damage, hits = 1, infection = 0, coin = false) => ({
    type: 'attack', damage: damage + (enemy.strength || 0), hits, infection, coin,
    limb: coin ? availableLimb(state, enemy) : null,
  })
  const charge = () => ({ type: 'charge', damage: 0, hits: 0, infection: 0, coin: false, limb: null })
  const guard = block => ({ type: 'guard', block, damage: 0, hits: 0, infection: 0, coin: false, limb: null })

  // 경직 중이면 의도는 '경직'으로 고정된다. 적 행동 단계에서 해제된다.
  if (enemy.staggered) { enemy.intent = STAGGER_INTENT(); return }

  const pattern = ENEMY_PATTERNS[enemy.type]
  if (pattern) {
    const broken = pattern.part && partBroken(enemy, pattern.part.key)
    const cycle = broken && pattern.broken ? pattern.broken : pattern.cycle
    let step = cycle[(state.turn - 1) % cycle.length]
    // 다친 데가 없으면 재생 대신 공격한다.
    if (step.type === 'regen' && enemy.hp >= enemy.maxHp) step = cycle.find(s => s.type === 'attack') || step
    enemy.intent = patternIntent(state, enemy, step)
    return
  }

  // 일반 적: 공격 사이에 힘 올리기를 섞는다. 같은 종류끼리 박자가 겹치지 않게 id로 어긋낸다.
  const beat = (state.turn - 1 + enemy.id) % 3
  // 오르는 힘은 min~max 사이에서 굴리고 구역이 깊을수록 커진다. 의도를 정할 때 정해져 화면에 보인다.
  const buff = (min, max) => ({ type: 'buff', strength: min + Math.floor(random() * (max - min + 1)) + bonus, damage: 0, hits: 0, infection: 0, coin: false, limb: null })
  if (enemy.type === 'walker') enemy.intent = beat === 2 ? buff(1, 3) : attack(5 + bonus)
  if (enemy.type === 'runner') enemy.intent = beat === 2 ? buff(1, 2) : attack(3 + bonus, partBroken(enemy, 'leg') ? 1 : 2)
  if (enemy.type === 'spitter') enemy.intent = beat === 1 ? buff(1, 3) : attack(5 + bonus, 1, partBroken(enemy, 'arm') ? 0 : 2)
  if (enemy.type === 'brute') {
    // 동전 강타는 힘 모으기에 성공해 준비 상태일 때만. 아니면 일반 공격.
    enemy.intent = partBroken(enemy, 'arm') ? attack(6 + bonus)
      : [guard(9 + bonus), charge(), enemy.primed ? attack(17 + bonus, 1, 0, true) : attack(9 + bonus)][(state.turn - 1) % 3]
  }
  if (enemy.type === 'boss') {
    const armBroken = partBroken(enemy, 'arm')
    enemy.intent = [
      attack(7, 2),
      attack(10, 1, 3),
      // 복합 의도: 방어하면서 힘을 모은다.
      armBroken ? guard(12) : { ...guard(12), charge: true },
      !armBroken && enemy.primed ? attack(23, 1, 0, true) : attack(10),
    ][(state.turn - 1) % 4]
    if (partBroken(enemy, 'leg')) enemy.intent.damage = Math.max(0, enemy.intent.damage - 3)
  }
}

/**
 * 부위가 파괴된 순간, 이번 의도에서 그 부위가 하던 것만 뺀다.
 * 의도를 새로 뽑지 않는다: 순환 위치·굴린 수치는 그대로 두고 다음 턴부터 파괴 패턴을 따른다.
 */
function breakPartIntent(state, enemy, key) {
  const i = enemy.intent
  if (!i || enemy.staggered) return
  const bonus = Math.floor(state.stage / 2)
  const toPlainAttack = damage => Object.assign(i, { type: 'attack', damage: damage + (enemy.strength || 0), hits: 1, coin: false, limb: null })
  const pattern = ENEMY_PATTERNS[enemy.type]
  if (pattern?.part?.key === key && pattern.broken) {
    // 파괴 패턴에 같은 종류의 행동이 있으면 그 수치로, 없으면(재생 등) 파괴 패턴 첫 행동으로.
    const step = pattern.broken.find(s => s.type === i.type) || pattern.broken[0]
    enemy.intent = patternIntent(state, enemy, step)
    return
  }
  if (enemy.type === 'runner' && key === 'leg' && i.type === 'attack') i.hits = 1
  if (enemy.type === 'spitter' && key === 'arm') i.infection = 0
  if (enemy.type === 'brute' && key === 'arm') {
    enemy.primed = false
    if (i.coin) toPlainAttack(6 + bonus)
  }
  if (enemy.type === 'boss' && key === 'arm') {
    enemy.primed = false
    i.charge = false
    if (i.coin) toPlainAttack(partBroken(enemy, 'leg') ? 7 : 10)
  }
  if (enemy.type === 'boss' && key === 'leg' && i.damage > 0) i.damage = Math.max(0, i.damage - 3)
}

export function intentLabel(enemy, compact = false) {
  const i = enemy.intent
  if (!i) return '합류 · 대기'
  const base = intentLabelBase(i, compact)
  return i.type !== 'stagger' && enemy.staggerResist > 0 ? `${base} · 경직 저항 중` : base
}

function intentLabelBase(i, compact = false) {
  if (i.type === 'guard') return `방어도 ${i.block}${i.charge ? ' · 힘 모으기' : ''}`
  if (i.type === 'charge') return '힘 모으기'
  if (i.type === 'buff') return `힘 올리기 · 공격 +${i.strength}`
  if (i.type === 'stagger') return '경직 · 행동 없음'
  if (i.type === 'scream') return `울부짖기 · 소음 +${i.noise}`
  if (i.type === 'regen') return `재생 · 체력 +${i.heal}`
  if (i.grab) return `${compact ? '' : '공격 '}${i.damage} · 붙잡기(다음 턴 드로우 −1)`
  if (i.coin) return `동전 ${i.damage}${i.limb ? ` / ${limbName(i.limb)}` : ''}`
  return `${compact ? '' : '공격 '}${i.damage}${i.hits > 1 ? `×${i.hits}` : ''}${i.infection ? ` · 감염 ${i.infection}` : ''}`
}

// ── 플레이어 수치 ──────────────────────────────────────────────

export function attackBonus(state) {
  const armPenalty = state.numb || classTrait(state, 'noArms') ? 0 : injuredCount(state, 'arm') * 2
  return state.strength + (classTrait(state, 'attackBonus') || 0) - armPenalty
}

export function blockBonus(state) {
  return classTrait(state, 'blockBonus') || 0
}

export function attackDamage(state, card, partKey = null) {
  const data = CARDS[card.key]
  if (!data.damage) return 0
  const limbBonus = partKey && data.limbBonus ? data.limbBonus(card.upgraded) : 0
  return Math.max(0, data.damage(card.upgraded) + limbBonus + attackBonus(state))
}

export function hitCount(card) {
  const data = CARDS[card.key]
  return data.hits ? data.hits(card.upgraded) : 1
}

// ── 전투 진행 ──────────────────────────────────────────────────

/** 스테이지의 적을 배치하고 덱을 섞는다. 턴 시작은 별도로 `startTurn`을 부른다. */
export function startBattle(state, events = []) {
  state.phase = 'combat'
  state.noise = 0
  state.block = 0
  state.strength = 0
  state.turn = 0
  state.selected = null
  state.deck = buildDeck(state)
  state.draw = shuffle(state.deck)
  // 첫 전투는 구급상자 카드를 첫 손패에 넣어 준다. 드로우는 더미 끝에서 뽑는다.
  if (state.stage === 0) state.draw.sort((a, b) => (a.key === 'heal') - (b.key === 'heal'))
  state.hand = []
  state.discard = []
  state.exhausted = []
  state.pending = []
  state.enemies = STAGES[state.stage].enemies.map(type => makeEnemy(state, type))
  state.target = state.enemies[0].id
  return log(state, events, STAGES[state.stage].name, { stage: state.stage })
}

export function drawCards(state, count, events = []) {
  const drawn = []
  for (let i = 0; i < count && state.hand.length < HAND_LIMIT; i++) {
    if (!state.draw.length) {
      state.draw = shuffle(state.discard)
      state.discard = []
    }
    if (!state.draw.length) break
    const card = state.draw.pop()
    state.hand.push(card)
    drawn.push(card.id)
  }
  if (drawn.length) emit(state, events, 'draw', { cards: drawn })
  return drawn.length
}

/**
 * 턴 시작: 감염 피해 → (사망이면 여기서 멈춤) → 드로우 → 적 의도.
 * 호출한 쪽은 `outcome(state)`로 사망 여부를 확인해야 한다.
 */
export function startTurn(state, events = []) {
  beginTurn(state, events)
  if (state.hp <= 0) return events
  resolvePending(state, events)
  return finishTurnStart(state, events)
}

/** 턴 시작 1/3: 턴 수·행동력·방어 초기화, 감염 틱, 고열. 사망하면 여기서 끝. */
export function beginTurn(state, events = []) {
  state.turn++
  state.phase = 'combat'
  state.energy = BASE_ENERGY
  state.block = 0
  state.selected = null
  state.numb = false
  const damage = infectionTick(state)
  if (damage) {
    state.hp = Math.max(0, state.hp - damage)
    emit(state, events, 'infection-tick', { damage }, `감염 피해 ${damage}.`)
  }
  if (state.hp <= 0) return events
  if (hasFever(state)) {
    state.energy = BASE_ENERGY - 1
    emit(state, events, 'fever', { energy: state.energy }, `고열 · 감염 ${state.infection} · 행동력 ${state.energy}.`)
  }
  for (const enemy of state.enemies) if (enemy.staggerResist > 0) enemy.staggerResist--
  return events
}

/** 턴 시작 3/3: 붙잡힘 페널티, 드로우, 적 의도. */
export function finishTurnStart(state, events = []) {
  const penalty = state.drawPenalty || 0
  if (penalty) log(state, events, `붙잡힌 여파 · 드로우 −${penalty}.`)
  state.drawPenalty = 0
  state.grabbed = penalty
  drawCards(state, Math.max(1, BASE_DRAW - injuredCount(state, 'leg') - penalty), events)
  state.enemies.forEach(enemy => setIntent(state, enemy))
  return events
}

/** 'dead' | 'extracted' | 'victory' | null. 상태의 phase는 바꾸지 않는다. */
export function outcome(state) {
  if (state.hp <= 0) return 'dead'
  if (!state.enemies.length) return state.stage === STAGES.length - 1 ? 'extracted' : 'victory'
  return null
}

export function hurtEnemy(state, enemy, damage, partKey = null, style = 'knife', events = []) {
  const absorbed = Math.min(enemy.block || 0, damage)
  enemy.block = Math.max(0, (enemy.block || 0) - absorbed)
  damage = Math.max(0, damage - absorbed)
  if (absorbed) emit(state, events, 'enemy-block', { enemy, absorbed }, `${enemy.name} 방어도 ${absorbed} 소모.`)
  if (!damage) return events
  const limb = partKey ? enemy.parts.find(p => p.key === partKey && p.hp > 0) : null
  if (partKey && !limb) return events

  if (limb) {
    limb.hp = Math.max(0, limb.hp - damage)
    emit(state, events, 'hit', { enemy, damage, part: partKey, style }, `${enemy.name} ${limb.name} 피해 ${damage} · 내구도 ${limb.hp}/${limb.maxHp}.`)
    if (limb.hp === 0) {
      breakPartIntent(state, enemy, partKey)
      emit(state, events, 'limb-broken', { enemy, part: limb }, `${enemy.name} ${limb.name} 파괴 · ${limb.effect}`)
    }
  } else {
    enemy.hp = Math.max(0, enemy.hp - damage)
    emit(state, events, 'hit', { enemy, damage, part: null, style }, `${enemy.name} ${style === 'burn' ? '화상 ' : ''}피해 ${damage}.`)
    if (enemy.hp === 0) emit(state, events, 'kill', { enemy }, `${enemy.name} 처치.`)
  }
  return events
}

/** 경직: 다음 적 행동을 건너뛴다. 저항 중이면 걸리지 않는다. */
export function staggerEnemy(state, enemy, events = []) {
  if (enemy.hp <= 0 || enemy.staggered) return events
  if (enemy.staggerResist > 0) return emit(state, events, 'stagger-resist', { enemy }, `${enemy.name}는 경직에 저항했다.`)
  enemy.staggered = true
  enemy.primed = false // 경직되면 모아 둔 힘이 흩어진다.
  enemy.intent = STAGGER_INTENT()
  return emit(state, events, 'stagger', { enemy }, `${enemy.name} 경직 · 다음 행동을 건너뜀.`)
}

/** 죽은 적을 제거하고 그 목록을 돌려준다. 대상 포인터도 정리한다. */
export function cleanEnemies(state) {
  const dead = state.enemies.filter(e => e.hp <= 0)
  state.enemies = state.enemies.filter(e => e.hp > 0)
  if (!state.enemies.some(e => e.id === state.target)) state.target = state.enemies[0]?.id ?? null
  return dead
}

// ── 카드 사용 ──────────────────────────────────────────────────

/** 이 카드를 이 대상에 쓸 수 있는가. `{ ok, reason, enemy, targets }`. */
export function canPlay(state, card, kind, enemyId = null, partKey = null) {
  const lock = cardLockReason(state, card)
  if (lock) return { ok: false, reason: lock }
  const data = CARDS[card.key]
  if (state.energy < data.cost) return { ok: false, reason: `행동력 부족 · 필요 ${data.cost}` }
  const enemy = state.enemies.find(e => e.id === enemyId) || null
  if (data.target === 'single') {
    if (kind !== 'enemy' || !enemy) return { ok: false, reason: null }
    if (partKey && !enemy.parts.some(p => p.key === partKey && p.hp > 0)) return { ok: false, reason: null }
  }
  if (data.target === 'all' && !['enemy', 'all'].includes(kind)) return { ok: false, reason: null }
  if (data.target === 'self' && kind !== 'self') return { ok: false, reason: null }
  const targets = data.target === 'single' ? [enemy] : data.target === 'all' ? [...state.enemies] : []
  return { ok: true, reason: null, enemy, targets }
}

/** 예약 주문 등록. 발동은 다음 턴 시작(`resolvePending`). */
export function queueSpell(state, card, enemy = null, partKey = null, events = []) {
  const data = CARDS[card.key]
  state.pending = state.pending || []
  state.pending.push({ key: card.key, upgraded: card.upgraded, targetId: enemy?.id ?? null, partKey: data.target === 'single' ? partKey : null })
  state.noise += data.noise || 0
  return emit(state, events, 'spell-queued', { card, enemy, partKey }, `${data.name}${card.upgraded ? '+' : ''} 예약 · 다음 턴 시작에 발동.`)
}

/** 예약 주문 큐를 꺼내고 비운다. 화면 쪽이 하나씩 `resolveSpell`로 터뜨릴 때 쓴다. */
export function takePending(state) {
  const queue = state.pending || []
  state.pending = []
  return queue
}

/** 예약된 주문을 전부 발동한다(시뮬레이터용). 대상이 죽었으면 살아 있는 첫 적으로 옮긴다. */
export function resolvePending(state, events = []) {
  for (const entry of takePending(state)) resolveSpell(state, entry, events)
  cleanEnemies(state)
  return events
}

/** 예약 주문 하나 발동. */
export function resolveSpell(state, entry, events = []) {
  {
    const data = CARDS[entry.key]
    const card = { id: 0, key: entry.key, upgraded: entry.upgraded, sourceItem: null }
    if (data.type === 'attack') {
      let targets
      if (data.target === 'all') targets = state.enemies.filter(e => e.hp > 0)
      else {
        const original = state.enemies.find(e => e.id === entry.targetId && e.hp > 0)
        const target = original || state.enemies.find(e => e.hp > 0)
        targets = target ? [target] : []
      }
      if (!targets.length) { log(state, events, `${data.name} · 대상 없음, 흩어짐.`); return events }
      const partKey = targets[0].id === entry.targetId ? entry.partKey : null
      emit(state, events, 'spell-resolve', { card, targets }, `${data.name}${entry.upgraded ? '+' : ''} 발동.`)
      for (let hit = 0; hit < hitCount(card); hit++) applyAttackHit(state, card, targets, partKey, events)
      finishAttackEffects(state, card, targets, targets[0], events)
    } else {
      emit(state, events, 'spell-resolve', { card, targets: [] }, `${data.name}${entry.upgraded ? '+' : ''} 발동.`)
      applySkill(state, card, events)
    }
  }
  return events
}

/** 카드를 손에서 빼고 비용·탄약을 지불한다. 효과 적용 전에 부른다. */
export function beginCard(state, card, events = []) {
  const data = CARDS[card.key]
  if (data.ammo) consumeAmmo(state, data.ammo, events)
  const index = state.hand.findIndex(c => c.id === card.id)
  if (index >= 0) state.hand.splice(index, 1)
  state.energy -= data.cost
  state.selected = null
  return log(state, events, `${data.name}${card.upgraded ? '+' : ''} 사용.`)
}

/** 공격 카드의 한 타격을 대상 하나에 적용한다. 화면 쪽은 대상마다 이걸 불러 템포를 둔다. */
export function applyAttackHitTo(state, card, target, partKey = null, events = []) {
  const data = CARDS[card.key]
  const single = data.target === 'single'
  if (target.hp <= 0) return events
  const damage = data.damage ? attackDamage(state, card, single ? partKey : null) : 0
  hurtEnemy(state, target, damage, single ? partKey : null, card.key, events)
  if (data.burn && target.hp > 0) target.burn += data.burn(card.upgraded)
  return events
}

/** 공격 카드의 한 타격을 모든 대상에 적용한다(시뮬레이터용). 연타 카드는 타격마다 부른다. */
export function applyAttackHit(state, card, targets, partKey = null, events = []) {
  for (const target of targets) applyAttackHitTo(state, card, target, partKey, events)
  return events
}

/** 타격이 끝난 뒤의 부수 효과: 경직, 방어도, 대상 고정, 도끼 환급, 소음. */
export function finishAttack(state, card, targets, enemy = null, events = []) {
  finishAttackEffects(state, card, targets, enemy, events)
  state.noise += CARDS[card.key].noise || 0
  return events
}

function finishAttackEffects(state, card, targets, enemy = null, events = []) {
  const data = CARDS[card.key]
  if (data.stagger) for (const target of targets) staggerEnemy(state, target, events)
  if (data.block) {
    const gained = data.block(card.upgraded) + blockBonus(state)
    state.block += gained
    log(state, events, `방어도 ${gained} 획득.`)
  }
  if (data.heal) {
    const healed = Math.min(state.maxHp - state.hp, data.heal(card.upgraded))
    state.hp += healed
    if (healed) log(state, events, `체력 ${healed} 회복.`)
  }
  if (data.target === 'single' && enemy) state.target = enemy.id
  if (card.key === 'axe' && enemy && enemy.hp <= 0) {
    state.energy++
    log(state, events, '처치 · 행동력 1 회복.')
  }
  return events
}

/** 도박 카드의 동전 프롬프트 문구. 함수형 필드는 강화 여부로 평가한다. */
export function gamblePrompt(card) {
  const g = CARDS[card.key].gamble
  if (!g) return null
  const text = v => (typeof v === 'function' ? v(card.upgraded) : v)
  return { title: g.title, description: g.description, success: text(g.success), failure: text(g.failure) }
}

/**
 * 동전 결과에 따라 gamble.win / gamble.lose 효과를 적용한다.
 * 효과 키: damage(주 대상) · damageAll · selfDamage · injureLimb · energy · draw · discardHand ·
 *          strength · infection · noise · block · staggerAll
 */
export function resolveGamble(state, card, won, targets = [], events = []) {
  const g = CARDS[card.key].gamble
  if (!g) return events
  const raw = won ? g.win : g.lose
  const fx = typeof raw === 'function' ? raw(card.upgraded) : raw || {}
  const name = CARDS[card.key].name
  emit(state, events, won ? 'gamble-win' : 'gamble-lose', { card }, `${name} · 동전 ${won ? '성공' : '실패'}.`)
  const primary = targets.find(t => t.hp > 0) || null
  if (fx.damage && primary) hurtEnemy(state, primary, Math.max(0, fx.damage + attackBonus(state)), null, card.key, events)
  if (fx.damageAll) for (const t of targets) if (t.hp > 0) hurtEnemy(state, t, Math.max(0, fx.damageAll + attackBonus(state)), null, card.key, events)
  if (fx.selfDamage) {
    // 자해도 적 공격처럼 방어도를 먼저 깎는다.
    const blocked = Math.min(state.block, fx.selfDamage)
    const damage = fx.selfDamage - blocked
    state.block -= blocked
    state.hp = Math.max(0, state.hp - damage)
    emit(state, events, 'backfire', { damage, blocked }, `${name} · 체력 ${damage} 피해${blocked ? ` / 방어 ${blocked}` : ''}.`)
  }
  if (fx.injureLimb) {
    const healthy = LIMBS.filter(l => !state.limbs[l.key])
    if (healthy.length) {
      const limb = healthy[Math.floor(random() * healthy.length)].key
      state.limbs[limb] = true
      emit(state, events, 'limb-injured', { limb }, `${limbName(limb)} 훼손 · ${limb.includes('Arm') ? '공격 피해 −2' : '턴 시작 드로우 −1'}.`)
    }
  }
  if (fx.energy) { state.energy += fx.energy; log(state, events, `행동력 +${fx.energy}.`) }
  if (fx.draw) log(state, events, `카드 ${drawCards(state, fx.draw, events)}장 뽑기.`)
  if (fx.discardHand) {
    const count = state.hand.length
    discardHand(state)
    emit(state, events, 'discard-hand', { count }, `손패 ${count}장 버림.`)
  }
  if (fx.strength) { state.strength += fx.strength; log(state, events, `이번 전투 공격 +${fx.strength}.`) }
  if (fx.infection) { state.infection += fx.infection; log(state, events, `감염 ${fx.infection} 증가.`) }
  if (fx.noise) { state.noise += fx.noise; log(state, events, `소음 ${fx.noise} 증가.`) }
  if (fx.block) { state.block += fx.block; log(state, events, `방어도 ${fx.block} 획득.`) }
  if (fx.staggerAll) for (const t of state.enemies) staggerEnemy(state, t, events)
  return events
}

/** 스킬·파워 카드의 효과를 카드 정의(effects)대로 적용한다. 표시용 요약을 함께 돌려준다. */
export function applySkill(state, card, events = []) {
  const data = CARDS[card.key]
  const fx = skillEffects(card.key, card.upgraded)
  const parts = []
  if (fx.gambleOnly) return ''
  if (fx.block) { const gained = fx.block + blockBonus(state); state.block += gained; parts.push(`방어 +${gained}`) }
  if (fx.heal) { const healed = Math.min(state.maxHp - state.hp, fx.heal); state.hp += healed; parts.push(`회복 +${healed}`) }
  if (fx.cure) { const cured = Math.min(state.infection, fx.cure); state.infection -= cured; parts.push(`감염 −${cured}`) }
  if (fx.noiseDown) { const quieted = Math.min(state.noise, fx.noiseDown); state.noise -= quieted; parts.push(`소음 −${quieted}`) }
  if (fx.strength) { state.strength += fx.strength; parts.push(`공격 +${fx.strength}`) }
  if (fx.energy) { state.energy += fx.energy; parts.push(`행동력 +${fx.energy}`) }
  if (fx.draw) parts.push(`${drawCards(state, fx.draw, events)}장 뽑기`)
  if (fx.numb) { state.numb = true; parts.push('이번 턴 부상 무시') }
  if (data.noise) { state.noise += data.noise; parts.push(`소음 +${data.noise}`) }
  const feedback = parts.join(' · ')
  emit(state, events, 'skill', { card, feedback, sound: fx.sound || null }, feedback ? `${data.name}${card.upgraded ? '+' : ''} · ${feedback}.` : null)
  return feedback
}

/** 카드 사용 마무리: 소모품 횟수 차감, 소진 시 카드 회수, 버림/소멸 더미로 이동. */
export function finishCard(state, card, events = []) {
  const data = CARDS[card.key]
  let consumed = false
  const item = sourceItem(state, card)
  if (item && itemDef(item.key).kind === 'consumable') {
    const itemData = itemDef(item.key)
    item.uses = Math.max(0, item.uses - 1)
    log(state, events, `${itemData.name} 사용 · ${item.uses}/${itemData.uses}회 남음.`)
    if (item.uses === 0) {
      state.inventory = state.inventory.filter(entry => entry.uid !== item.uid)
      for (const pile of [state.draw, state.discard, state.hand, state.exhausted, state.deck]) {
        for (let i = pile.length - 1; i >= 0; i--) if (pile[i].sourceItem === item.uid) pile.splice(i, 1)
      }
      emit(state, events, 'item-depleted', { item }, `${itemData.name} 소진.`)
      consumed = true
    }
  }
  if (!consumed) (data.exhaust ? state.exhausted : state.discard).push(card)
  return events
}

// ── 적 턴 ────────────────────────────────────────────────────

export function discardHand(state) {
  state.discard.push(...state.hand)
  state.hand = []
}

export function burnTick(state, enemy, events = []) {
  if (enemy.burn <= 0) return events
  hurtEnemy(state, enemy, enemy.burn, null, 'burn', events)
  enemy.burn--
  return events
}

/** 소음 증원. 합류했으면 새 적을 돌려준다. */
export function reinforce(state, events = []) {
  if (state.noise < NOISE_THRESHOLD || state.enemies.length >= MAX_ENEMIES) return null
  state.noise -= NOISE_THRESHOLD
  const enemy = makeEnemy(state, 'walker')
  state.enemies.push(enemy)
  emit(state, events, 'reinforce', { enemy }, '소음으로 배회자 합류.')
  return enemy
}

/**
 * 공격이 아닌 의도(방어·대기·경직·울부짖기·재생)를 처리한다.
 * 처리했으면 true. 공격 의도면 false를 돌려주고 아무것도 하지 않는다.
 */
export function resolveNonAttack(state, enemy, intent, events = []) {
  enemy.block = 0
  if (intent.coin) enemy.primed = false // 특수 행동이 나가면 준비 상태를 쓴다.
  if (intent.type === 'guard') {
    enemy.block = intent.block
    emit(state, events, 'enemy-guard', { enemy, block: intent.block }, `${enemy.name} 방어도 ${intent.block} 획득.`)
    if (intent.charge) chargeUp(state, enemy, events)
    return true
  }
  if (intent.type === 'charge') {
    chargeUp(state, enemy, events)
    return true
  }
  if (intent.type === 'buff') {
    enemy.strength = (enemy.strength || 0) + intent.strength
    emit(state, events, 'enemy-buff', { enemy, strength: intent.strength }, `${enemy.name} 힘 올리기 · 공격 피해 +${intent.strength}.`)
    return true
  }
  if (intent.type === 'stagger') {
    enemy.staggered = false
    enemy.staggerResist = 2 // 다음 내 턴 동안은 다시 경직되지 않는다.
    emit(state, events, 'enemy-skip', { enemy }, `${enemy.name}는 경직되어 움직이지 못한다.`)
    return true
  }
  if (intent.type === 'scream') {
    state.noise += intent.noise
    emit(state, events, 'enemy-scream', { enemy, noise: intent.noise }, `${enemy.name}가 울부짖는다 · 소음 ${intent.noise} 증가.`)
    return true
  }
  if (intent.type === 'regen') {
    const healed = Math.min(intent.heal, enemy.maxHp - enemy.hp)
    enemy.hp += healed
    emit(state, events, 'enemy-regen', { enemy, healed }, `${enemy.name} 재생 · 체력 ${healed} 회복.`)
    return true
  }
  return false
}

function chargeUp(state, enemy, events) {
  enemy.primed = true
  log(state, events, `${enemy.name}가 다음 공격을 준비한다.`)
}

export function evade(state, enemy, events = []) {
  return emit(state, events, 'evade', { enemy }, `${enemy.name}의 공격 회피.`)
}

/** 적 공격 한 타. `{ damage, blocked }`. */
export function enemyHit(state, enemy, intent, hitIndex = 0, events = []) {
  const blocked = Math.min(state.block, intent.damage)
  const damage = intent.damage - blocked
  state.block -= blocked
  state.hp = Math.max(0, state.hp - damage)
  emit(state, events, 'player-hit', { enemy, damage, blocked, hit: hitIndex, coin: Boolean(intent.coin) },
    `${enemy.name} · 체력 피해 ${damage}${blocked ? ` / 방어 ${blocked}` : ''}.`)
  return { damage, blocked }
}

/** 타격이 끝난 뒤: 감염, 붙잡기, 사지 부상. 부상당한 사지 키를 돌려준다(없으면 null). */
export function enemyAfterAttack(state, enemy, intent, penetrated, events = []) {
  if (!penetrated) return null
  if (intent.infection) {
    state.infection += intent.infection
    log(state, events, `감염 ${intent.infection} 증가.`)
  }
  if (intent.grab) {
    state.drawPenalty = Math.min(2, (state.drawPenalty || 0) + 1)
    emit(state, events, 'grab', { enemy }, `${enemy.name}에게 붙잡힘 · 다음 턴 드로우 −1.`)
  }
  if (intent.coin && intent.limb && !state.limbs[intent.limb]) {
    state.limbs[intent.limb] = true
    emit(state, events, 'limb-injured', { limb: intent.limb },
      `${limbName(intent.limb)} 훼손 · ${intent.limb.includes('Arm') ? '공격 피해 −2' : '턴 시작 드로우 −1'}.`)
    return intent.limb
  }
  return null
}

export function endEnemyPhase(state) {
  state.noise = Math.max(0, state.noise - 1)
}

// ── 준비 단계 ──────────────────────────────────────────────────

export function canEquip(state) {
  return !classTrait(state, 'noArms')
}

/** 장착이 막히는 이유. 없으면 null. 밀려나는 무기가 가방에 못 들어가면 막힌다. */
export function equipBlockReason(state, itemUid, slot) {
  if (!canEquip(state)) return '팔이 없음'
  const item = state.inventory.find(entry => entry.uid === itemUid)
  if (!item || itemDef(item.key).kind !== 'hand') return '손에 들 수 없는 것'
  const displaced = displacedByEquip(state, item, slot)
  if (!displaced.length) return null
  // 밀려나는 것들이 (이 무기가 비운 칸까지 포함해) 가방에 들어가는지 가상으로 확인
  const saved = state.inventory.map(entry => [entry, entry.pos])
  item.pos = null
  let ok = true
  for (const other of displaced) { other.pos = null; if (!placeAuto(state, other)) { ok = false; break } }
  for (const [entry, pos] of saved) entry.pos = pos
  return ok ? null : `${displaced.map(other => itemDef(other.key).name).join(' · ')} 넣을 자리가 없음`
}

function displacedByEquip(state, item, slot) {
  const slots = itemDef(item.key).hands === 2 ? ['left', 'right'] : [slot]
  const uids = new Set()
  for (const side of slots) {
    const uid = state.equipment[side]
    if (uid && uid !== item.uid) uids.add(uid)
  }
  // 한손 무기를 끼우는데 그 자리에 양손 무기가 있으면 양손 무기 전체가 밀려난다
  return state.inventory.filter(entry => uids.has(entry.uid))
}

export function equip(state, itemUid, slot, events = []) {
  if (equipBlockReason(state, itemUid, slot)) return events
  const item = state.inventory.find(entry => entry.uid === itemUid)
  const displaced = displacedByEquip(state, item, slot)
  for (const side of ['left', 'right']) if (state.equipment[side] === itemUid) state.equipment[side] = null
  for (const other of displaced) {
    for (const side of ['left', 'right']) if (state.equipment[side] === other.uid) state.equipment[side] = null
  }
  item.pos = null
  for (const other of displaced) { other.pos = null; placeAuto(state, other) }
  if (itemDef(item.key).hands === 2) state.equipment = { left: itemUid, right: itemUid }
  else state.equipment[slot] = itemUid
  syncDeck(state)
  return log(state, events, `${itemDef(item.key).name} ${itemDef(item.key).hands === 2 ? '양손' : slot === 'left' ? '왼손' : '오른손'} 장착.`)
}

/**
 * 전투 중 장비를 바꾼 뒤 덱을 맞춘다.
 * 손에서 내려놓은 장비의 카드는 모든 더미에서 사라지고, 새로 든 장비의 카드는 뽑기 더미에 섞여 들어간다.
 * 이미 더미 어딘가에 카드가 남아 있는 장비는 그대로 둔다(다시 들었을 때 중복 생성 방지).
 */
export function refitDeck(state, events = []) {
  const equipped = new Set(Object.values(state.equipment).filter(Boolean))
  const piles = [state.hand, state.draw, state.discard, state.exhausted]
  const stays = card => {
    const item = sourceItem(state, card)
    if (!item) return true
    return itemDef(item.key).kind !== 'hand' || equipped.has(item.uid)
  }
  let removed = 0
  for (const pile of piles) {
    for (let i = pile.length - 1; i >= 0; i--) if (!stays(pile[i])) { pile.splice(i, 1); removed++ }
  }
  const present = new Set(piles.flat().map(card => card.sourceItem).filter(uid => uid != null))
  const added = []
  for (const uid of equipped) {
    if (present.has(uid)) continue
    const item = state.inventory.find(entry => entry.uid === uid)
    if (!item) continue
    for (const key of itemDef(item.key).cards) added.push(makeCard(key, item.uid, item.upgraded))
  }
  if (added.length) state.draw = shuffle([...state.draw, ...added])
  state.deck = buildDeck(state)
  if (removed || added.length) log(state, events, `장비 교체 · 카드 ${removed}장 회수, ${added.length}장 합류.`)
  return events
}

/** 손에서 내려 가방에 넣는다. 자리가 없으면 false. */
export function unequip(state, slot) {
  const itemUid = state.equipment[slot]
  if (!itemUid) return false
  const item = state.inventory.find(entry => entry.uid === itemUid)
  const spot = item ? findSpot(state, item) : null
  if (!spot) return false
  if (state.equipment.left === itemUid) state.equipment.left = null
  if (state.equipment.right === itemUid) state.equipment.right = null
  item.pos = spot
  syncDeck(state)
  return true
}

/** 준비 화면에서 구급상자 1회 사용. 쓸 수 없으면 null. */
export function hasWorkingArm(state) {
  return !(state.limbs.leftArm && state.limbs.rightArm)
}

export function useMedkit(state, item, events = []) {
  if (!item || item.uses <= 0 || (state.hp >= state.maxHp && state.infection <= 0)) return null
  if (!hasWorkingArm(state)) return null
  const fx = skillEffects('heal', item.upgraded)
  const healed = Math.min(fx.heal, state.maxHp - state.hp)
  const cured = Math.min(fx.cure, state.infection)
  state.hp += healed
  state.infection -= cured
  item.uses--
  if (item.uses === 0) state.inventory = state.inventory.filter(entry => entry.uid !== item.uid)
  syncDeck(state)
  log(state, events, `구급상자 사용 · 체력 ${healed} 회복 · 감염 ${cured} 감소 · ${item.uses}회 남음.`)
  return { healed, cured }
}

export function firearmBonusRounds(data) {
  if (!data.cards.some(key => Boolean(CARDS[key]?.ammo))) return 0
  return data.rarity === 'legendary' || data.rarity === 'unique' ? 8 : data.rarity === 'rare' ? 6 : 4
}

/** 탄약은 한 묶음으로 쌓인다. 묶음이 없고 자리도 없으면 버려진다. */
function addRounds(state, rounds, events, why) {
  const stack = state.inventory.find(entry => entry.key === 'magazine' && entry.pos)
  if (stack) { stack.uses += rounds; return log(state, events, `${why}탄약 ×${rounds} 확보.`) }
  const magazine = makeItem('magazine')
  magazine.uses = rounds
  if (!placeAuto(state, magazine)) return log(state, events, `${why}탄약 ×${rounds} · 가방에 자리가 없어 두고 왔다.`)
  state.inventory.push(magazine)
  return log(state, events, `${why}탄약 ×${rounds} 확보.`)
}

/** 전리품을 가방에 넣을 수 있는가(탄약은 묶음이 있으면 항상). */
export function canAddLoot(state, item) {
  if (item.key === 'magazine' && state.inventory.some(entry => entry.key === 'magazine' && entry.pos)) return true
  return bagHasRoom(state, item)
}

/**
 * 전리품 획득. 가방의 빈 자리에 자동으로 넣고, 총기면 탄약을 같이 준다.
 * 자리가 없으면 넣지 않고 false — 화면 쪽이 가방 정리(놓기/버리기)를 맡는다. pos를 미리 주면 그 자리에 넣는다.
 */
export function addLoot(state, item, events = [], pos = null) {
  const data = itemDef(item.key)
  if (item.key === 'magazine') { addRounds(state, item.uses, events, ''); syncDeck(state); return events }
  if (pos) {
    if (!canPlace(state, item, pos.x, pos.y, pos.rot || 0)) return false
    item.pos = { x: pos.x, y: pos.y, rot: pos.rot || 0 }
  } else if (!placeAuto(state, item)) return false
  state.inventory.push(item)
  log(state, events, `${itemLabel(item)} 획득.`)
  const rounds = firearmBonusRounds(data)
  if (rounds) addRounds(state, rounds, events, '총기와 함께 ')
  syncDeck(state)
  return events
}

/** 전리품을 가방을 거치지 않고 바로 손에 든다. 밀려나는 무기가 가방에 못 들어가면 false. */
export function takeLootToHand(state, item, slot, events = []) {
  item.pos = null
  state.inventory.push(item)
  if (equipBlockReason(state, item.uid, slot)) {
    state.inventory = state.inventory.filter(entry => entry !== item)
    return false
  }
  log(state, events, `${itemLabel(item)} 획득.`)
  equip(state, item.uid, slot, events)
  const rounds = firearmBonusRounds(itemDef(item.key))
  if (rounds) addRounds(state, rounds, events, '총기와 함께 ')
  syncDeck(state)
  return events
}

/** 전리품을 두고 간다(가방에 자리를 안 만들었을 때). */
export function dropLoot(state, item, events = []) {
  return log(state, events, `${itemLabel(item)} 두고 감.`)
}

export function addSkill(state, key, events = []) {
  const card = makeCard(key)
  state.skills.push(card)
  syncDeck(state)
  log(state, events, `${CARDS[key].name} 스킬 획득.`)
  return card
}

/** 정비소: 카드 1장 영구 강화. 장비 카드면 그 장비의 모든 카드가 함께 강화된다. */
export function upgradeCard(state, card, events = []) {
  const item = sourceItem(state, card)
  if (item) {
    item.upgraded = true
    state.deck.filter(entry => entry.sourceItem === item.uid).forEach(entry => { entry.upgraded = true })
  } else {
    card.upgraded = true
    const skill = state.skills.find(entry => entry.key === card.key && !entry.upgraded)
    if (skill) skill.upgraded = true
  }
  return log(state, events, `${CARDS[card.key].name}+ 강화.`)
}

// 정비소 강화: 장비 하나(소속 카드 전체) 또는 장비에 속하지 않은 스킬 2장. 둘 중 하나만.
export const SKILL_UPGRADE_COUNT = 2

/** 정비소 후보: 아직 강화 안 됐고, 소모품 카드가 아닌 것. */
export function isUpgradable(state, card) {
  if (card.upgraded) return false
  const item = sourceItem(state, card)
  return !item || itemDef(item.key).kind !== 'consumable'
}

/** 이번 정비소에서 고를 스킬 장수. 강화 안 된 독립 스킬이 2장보다 적으면 그만큼. */
export function skillUpgradeCount(state) {
  return Math.min(SKILL_UPGRADE_COUNT, state.deck.filter(c => !c.upgraded && c.sourceItem == null).length)
}

/** 선택이 확정 가능한가: 장비 카드 1장, 또는 독립 스킬 정확히 skillUpgradeCount장. */
export function canConfirmUpgrade(state, cards) {
  if (!cards.length || cards.some(c => !isUpgradable(state, c))) return false
  if (cards.some(c => c.sourceItem != null)) return cards.length === 1
  return cards.length === skillUpgradeCount(state)
}

/** 정비소 확정. 조건이 안 맞으면 아무것도 하지 않는다. */
export function upgradeSelection(state, cards, events = []) {
  if (!canConfirmUpgrade(state, cards)) return events
  for (const card of cards) upgradeCard(state, card, events)
  return events
}

export const SHELTER_HEAL = 15
export const SHELTER_CURE = 2
export const WAREHOUSE_PENALTY = 6

export function isPermanentLimb(state, key) {
  return (state.permanentLimbs || []).includes(key)
}

export function shelter(state) {
  state.hp = Math.min(state.maxHp, state.hp + SHELTER_HEAL)
  state.infection = Math.max(0, state.infection - SHELTER_CURE)
  return LIMBS.filter(l => state.limbs[l.key] && !isPermanentLimb(state, l.key))
}

export function healLimb(state, key, events = []) {
  if (isPermanentLimb(state, key)) return events
  state.limbs[key] = false
  return log(state, events, `${limbName(key)} 치료.`)
}

export function warehouseFail(state, events = []) {
  state.hp -= WAREHOUSE_PENALTY
  return log(state, events, `군수 창고 · 체력 ${WAREHOUSE_PENALTY} 손실.`)
}

/**
 * 전리품 3개. 아이템 풀에 직업의 rewardCards(주문 등)를 섞는다.
 * 결과 항목은 아이템(`uid` 있음) 또는 카드(`id` 있음)이다. 술사는 못 쓰는 무기와 주문을 같은 줄에서 본다.
 */
function rollRewards(state, table) {
  const cards = classDef(state?.classId).rewardCards || []
  const pool = [...table.map(key => ({ item: key })), ...cards.map(key => ({ card: key }))]
  return shuffle(pool).slice(0, 3).map(entry => (entry.item ? makeItem(entry.item) : makeCard(entry.card)))
}
export function isRewardCard(entry) { return entry && 'id' in entry && !('uid' in entry) }
export function rollLoot(state) { return rollRewards(state, LOOT_TABLE) }
export function rollArmory(state) { return rollRewards(state, ARMORY_TABLE) }
export function rollSkills(state) {
  const pool = classDef(state?.classId).skillPool || SKILL_POOL
  return shuffle(pool).slice(0, 3).map(key => makeCard(key))
}
export function intentsHidden(state) { return Boolean(classTrait(state, 'hideIntents')) }

/**
 * 생존자 표시 키. 렌더러는 state.limbs / state.classId를 직접 읽지 말고 이것을 쓴다.
 *   classId: 'survivor' | 'mage' | 'berserker' (classes.js의 키)
 *   injury : null | 'arm' | 'leg' — 영구 사지(술사의 두 팔)는 부상으로 치지 않는다. 팔이 다리보다 우선.
 * 폴백 정책: 건강하면 직업 기본 스프라이트 → 부상이면 직업별 부상 스프라이트 → 없으면 공용 부상 스프라이트.
 */
export function heroAppearance(state) {
  const hurt = key => state.limbs[key] && !isPermanentLimb(state, key)
  const injury = hurt('leftArm') || hurt('rightArm') ? 'arm' : hurt('leftLeg') || hurt('rightLeg') ? 'leg' : null
  return { classId: state.classId || 'survivor', injury }
}

export function canUpgradeAny(state) { return state.deck.some(c => isUpgradable(state, c)) }
export function canSearchWarehouse(state) { return state.hp > WAREHOUSE_PENALTY }

export function nextStage(state) { state.stage++ }
