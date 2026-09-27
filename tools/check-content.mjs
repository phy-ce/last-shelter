import assert from 'node:assert/strict'
import { CARDS, SKILL_POOL, ENEMY_TYPES, ENEMY_PATTERNS, STAGES } from '../src/content/combat.js'
import { ITEMS, RARITIES, LOOT_TABLE, ARMORY_TABLE } from '../src/content/items.js'
import { CLASSES } from '../src/content/classes.js'

for (const [key, item] of Object.entries(ITEMS)) {
  assert.ok(RARITIES[item.rarity], `${key}: unknown rarity ${item.rarity}`)
  if (item.kind !== 'resource') assert.ok(item.cards.length > 0, `${key}: item must grant at least one card`)
  for (const card of item.cards) assert.ok(CARDS[card], `${key}: unknown card ${card}`)
  if (item.kind === 'consumable') assert.ok(item.uses > 0, `${key}: consumable needs uses`)
  if (item.kind === 'resource') assert.ok(item.uses > 0, `${key}: resource needs quantity`)
  if (item.kind === 'hand') assert.ok(item.hands === 1 || item.hands === 2, `${key}: invalid hands`)
}

for (const [key, card] of Object.entries(CARDS)) {
  assert.ok(RARITIES[card.rarity], `${key}: unknown rarity ${card.rarity}`)
  if (card.type === 'attack') assert.ok(card.damage || card.stagger || card.gamble, `${key}: attack card needs damage, stagger or gamble`)
  else assert.ok(typeof card.effects === 'function' && Object.keys(card.effects(false)).some(k => k !== 'sound'), `${key}: skill/power card needs numeric effects()`)
  if (card.gamble) {
    for (const field of ['title', 'description', 'success', 'failure']) assert.ok(card.gamble[field], `${key}: gamble needs ${field}`)
    assert.ok(card.gamble.win || card.gamble.lose, `${key}: gamble needs win or lose effects`)
  }
  if (card.effects?.(false)?.gambleOnly) assert.ok(card.gamble, `${key}: gambleOnly card needs a gamble`)
}

const itemCards = new Set(Object.values(ITEMS).flatMap(item => item.cards))
for (const skill of SKILL_POOL) {
  assert.ok(CARDS[skill], `${skill}: unknown skill card`)
  assert.ok(!itemCards.has(skill), `${skill}: equipment/item card cannot be a skill reward`)
}

for (const key of [...LOOT_TABLE, ...ARMORY_TABLE]) assert.ok(ITEMS[key], `loot: unknown item ${key}`)

for (const [key, pattern] of Object.entries(ENEMY_PATTERNS)) {
  assert.ok(ENEMY_TYPES[key], `${key}: pattern for unknown enemy`)
  assert.ok(pattern.cycle?.length, `${key}: pattern needs a cycle`)
  if (pattern.broken) assert.ok(pattern.part, `${key}: broken pattern needs a part`)
  for (const step of [...pattern.cycle, ...(pattern.broken ?? [])]) {
    assert.ok(['attack', 'guard', 'charge', 'scream', 'regen', 'summon'].includes(step.type), `${key}: unknown step ${step.type}`)
    if (step.type === 'attack') assert.ok(step.damage > 0, `${key}: attack needs damage`)
    if (step.type === 'guard') assert.ok(step.block > 0, `${key}: guard needs block`)
    if (step.type === 'scream') assert.ok(step.noise > 0, `${key}: scream needs noise`)
    if (step.type === 'regen') assert.ok(step.heal > 0, `${key}: regen needs heal`)
    if (step.type === 'summon') assert.ok(ENEMY_TYPES[step.summon] && step.summon !== key, `${key}: summon needs another enemy type`)
  }
  if (pattern.part) assert.ok(['arm', 'leg'].includes(pattern.part.key), `${key}: part must be arm or leg`)
}

for (const [id, cls] of Object.entries(CLASSES)) {
  assert.ok(cls.hp > 0, `${id}: hp`)
  for (const [key, count] of cls.skills) { assert.ok(CARDS[key], `${id}: unknown skill ${key}`); assert.ok(count > 0, `${id}: skill count`) }
  for (const key of cls.inventory) assert.ok(ITEMS[key], `${id}: unknown item ${key}`)
  if (cls.equip) assert.ok(cls.inventory.includes(cls.equip) && ITEMS[cls.equip].kind === 'hand', `${id}: equip must be a hand item in inventory`)
  for (const key of cls.skillPool ?? []) assert.ok(CARDS[key], `${id}: unknown pool card ${key}`)
  for (const key of cls.rewardCards ?? []) assert.ok(CARDS[key], `${id}: unknown reward card ${key}`)
  if (cls.traits.noArms) {
    assert.ok(!cls.equip, `${id}: no arms but equips`)
    assert.ok(cls.rewardCards?.length, `${id}: no arms needs rewardCards mixed into loot`)
    for (const key of cls.inventory) assert.ok(ITEMS[key].kind === 'resource', `${id}: armless class cannot use ${key}`)
    for (const [key] of cls.skills) assert.ok(CARDS[key].magic || CARDS[key].type !== 'attack', `${id}: armless class starts with a hand attack ${key}`)
  }
}

for (const stage of STAGES) for (const enemy of stage.enemies) assert.ok(ENEMY_TYPES[enemy], `${stage.name}: unknown enemy ${enemy}`)
assert.ok(STAGES.at(-1).enemies.includes('boss'), 'last stage must contain the boss')

console.log(`content ok: ${Object.keys(ITEMS).length} items, ${Object.keys(CARDS).length} cards, ${Object.keys(ENEMY_TYPES).length} enemies, ${STAGES.length} stages`)
