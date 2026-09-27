// 브라우저 없이 런을 돌리는 밸런스 시뮬레이터.
//   node tools/simulate.mjs [runs=200] [seed=1]
// 단순한 탐욕 봇이 플레이한다: 공격 카드는 체력이 가장 낮은 적 몸통에, 나머지는 자신에게.
// 목적은 "이 규칙이 대략 어느 스테이지에서 얼마나 죽는가"를 숫자로 보는 것이지 최적 플레이가 아니다.

import * as rules from '../src/core/combat-rules.js'
import { CARDS, STAGES } from '../src/content/combat.js'
import { itemDef } from '../src/content/items.js'
import { CLASSES } from '../src/content/classes.js'

const runs = Number(process.argv[2] ?? 200)
const classArg = process.argv[4] || 'all'
let seed = Number(process.argv[3] ?? 1) >>> 0

// xorshift32: 재현 가능한 난수
function rng() {
  seed ^= seed << 13; seed >>>= 0
  seed ^= seed >>> 17
  seed ^= seed << 5; seed >>>= 0
  return seed / 0x100000000
}
rules.setRandom(rng)
const coin = () => rng() < 0.5

const stats = {
  deaths: Array(STAGES.length).fill(0),
  extracted: 0,
  turns: [],
  cardPlays: new Map(),
  cardWins: new Map(),
  staggers: 0,
  staggerResists: 0,
  limbInjuries: 0,
}

function count(map, key) { map.set(key, (map.get(key) || 0) + 1) }

function playCard(state, card, target, partKey = null) {
  const data = CARDS[card.key]
  const kind = data.target === 'self' ? 'self' : 'enemy'
  const check = rules.canPlay(state, card, kind, target?.id ?? null, partKey)
  if (!check.ok) return false
  const events = rules.beginCard(state, card)
  let coinFirst = null
  if (data.gamble?.before) {
    coinFirst = coin()
    rules.resolveGamble(state, card, coinFirst, check.targets, events)
  }
  if (coinFirst === false) {
    // 불발
  } else if (data.type === 'attack') {
    for (let hit = 0; hit < rules.hitCount(card); hit++) rules.applyAttackHit(state, card, check.targets, partKey, events)
    rules.finishAttack(state, card, check.targets, check.enemy, events)
  } else {
    rules.applySkill(state, card, events)
  }
  if (data.gamble && coinFirst === null) rules.resolveGamble(state, card, coin(), check.targets, events)
  rules.finishCard(state, card, events)
  rules.cleanEnemies(state)
  for (const ev of events) {
    if (ev.type === 'stagger') stats.staggers++
    if (ev.type === 'stagger-resist') stats.staggerResists++
  }
  count(stats.cardPlays, card.key)
  return true
}

function playerTurn(state) {
  // 최대 20번 시도: 손패에서 쓸 수 있는 카드를 계속 낸다.
  for (let guard = 0; guard < 20; guard++) {
    const weakest = [...state.enemies].sort((a, b) => a.hp - b.hp)[0]
    if (!weakest) return
    const playable = state.hand.filter(card => rules.canPlay(state, card, CARDS[card.key].target === 'self' ? 'self' : 'enemy', weakest.id).ok)
    if (!playable.length) return
    // 공격 우선, 그다음 회복(체력 60% 미만일 때), 그다음 방어.
    const attack = playable.find(c => CARDS[c.key].type === 'attack' && CARDS[c.key].damage)
    const heal = state.hp < state.maxHp * 0.6 && playable.find(c => rules.hitCount(c) && (CARDS[c.key].effects?.(c.upgraded)?.heal))
    const other = playable.find(c => CARDS[c.key].type !== 'attack')
    const pick = attack || heal || other || playable[0]
    // 사람처럼: 이 카드로 한 번에 부술 수 있는 사지가 있으면 사지를 노린다(사지 보너스 카드는 특히).
    let partKey = null
    // 단, 두 방 안에 죽일 수 있는 적이면 그냥 몸통을 친다.
    if (CARDS[pick.key].type === 'attack' && CARDS[pick.key].target === 'single' && weakest.hp > rules.attackDamage(state, pick) * 2) {
      const breakable = weakest.parts.find(p => p.hp > 0 && rules.attackDamage(state, pick, p.key) * rules.hitCount(pick) >= p.hp)
      if (breakable) partKey = breakable.key
    }
    if (!playCard(state, pick, weakest, partKey)) return
    if (rules.outcome(state)) return
  }
}

function enemyTurn(state) {
  rules.discardHand(state)
  for (const enemy of [...state.enemies]) rules.burnTick(state, enemy)
  rules.cleanEnemies(state)
  if (rules.outcome(state)) return
  const acting = [...state.enemies]
  rules.reinforce(state)
  for (const enemy of acting) {
    const intent = { ...enemy.intent }
    if (rules.resolveNonAttack(state, enemy, intent)) continue
    if (intent.coin && coin()) { rules.evade(state, enemy); continue }
    let penetrated = false
    for (let hit = 0; hit < intent.hits; hit++) {
      penetrated ||= rules.enemyHit(state, enemy, intent, hit).damage > 0
      if (state.hp <= 0) return
    }
    if (rules.enemyAfterAttack(state, enemy, intent, penetrated)) stats.limbInjuries++
  }
  rules.endEnemyPhase(state)
}

function preparation(state) {
  // 전리품: 아무거나 첫 번째. 장비면 빈손 또는 오른손에 장착.
  // 쓸 수 있는 것을 우선 고른다: 카드 > 들 수 있는 장비 > 소모품. 없으면 건너뛴다.
  const rewards = rules.rollLoot(state)
  const usable = rewards.find(e => rules.isRewardCard(e))
    || rewards.find(e => !rules.isRewardCard(e) && itemDef(e.key).kind === 'hand' && rules.canEquip(state))
    || rewards.find(e => !rules.isRewardCard(e) && itemDef(e.key).kind !== 'hand' && rules.hasWorkingArm(state))
  if (usable && rules.isRewardCard(usable)) rules.addSkill(state, usable.key)
  else if (usable) {
    rules.addLoot(state, usable)
    if (itemDef(usable.key).kind === 'hand') rules.equip(state, usable.uid, state.equipment.right ? 'left' : 'right')
  }
  // 경로: 다쳤거나 체력 절반 이하면 은신처, 아니면 정비소, 그것도 안 되면 낯선 생존자.
  const injured = Object.values(state.limbs).some(Boolean)
  if (injured || state.hp < state.maxHp * 0.5) {
    const limbs = rules.shelter(state)
    if (limbs.length) rules.healLimb(state, limbs[0].key)
  } else if (rules.canUpgradeAny(state)) {
    const card = state.deck.find(c => !c.upgraded && CARDS[c.key].type === 'attack') || state.deck.find(c => !c.upgraded)
    rules.upgradeCard(state, card)
  } else {
    rules.addSkill(state, rules.rollSkills(state)[0].key)
  }
  rules.nextStage(state)
}

function simulateRun(classId) {
  const state = rules.createState(classId)
  const played = new Set()
  let turns = 0
  for (;;) {
    rules.startBattle(state)
    for (;;) {
      rules.startTurn(state)
      turns++
      if (rules.outcome(state)) break
      const before = new Set(stats.cardPlays.keys())
      playerTurn(state)
      for (const key of stats.cardPlays.keys()) if (!before.has(key) || true) played.add(key)
      if (rules.outcome(state)) break
      enemyTurn(state)
      if (rules.outcome(state)) break
      if (turns > 400) { state.hp = 0; break }
    }
    const result = rules.outcome(state)
    if (result === 'dead') { stats.deaths[state.stage]++; break }
    if (result === 'extracted') { stats.extracted++; for (const key of played) count(stats.cardWins, key); break }
    preparation(state)
  }
  stats.turns.push(turns)
}

const classIds = classArg === 'all' ? Object.keys(CLASSES) : [classArg]
for (let i = 0; i < runs; i++) simulateRun(classIds[i % classIds.length])

const pct = n => `${(n / runs * 100).toFixed(1)}%`
console.log(`runs: ${runs}  extracted: ${stats.extracted} (${pct(stats.extracted)})  avg turns: ${(stats.turns.reduce((a, b) => a + b, 0) / runs).toFixed(1)}`)
console.log('deaths by stage:')
STAGES.forEach((stage, i) => console.log(`  ${stage.name.padEnd(22)} ${String(stats.deaths[i]).padStart(4)}  ${pct(stats.deaths[i])}`))
console.log(`stagger applied: ${stats.staggers}  resisted: ${stats.staggerResists}  limb injuries: ${stats.limbInjuries}`)
console.log('card plays (top 15):')
;[...stats.cardPlays.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([key, n]) => console.log(`  ${CARDS[key].name.padEnd(10)} ${String(n).padStart(6)}`))
