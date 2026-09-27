function image(src) {
  const asset = new Image()
  asset.decoding = 'async'
  asset.src = src
  return asset
}

export const COMBAT_BACKGROUND = image('/assets/art/city-combat-bg-v1.webp')
export const SURVIVOR = image('/assets/art/survivor-v1.webp')
export const SURVIVOR_INJURED = {
  arm: image('/assets/art/survivor-arm-injured-v1.webp'),
  leg: image('/assets/art/survivor-leg-injured-v1.webp'),
}
export const SURVIVOR_SPRITES = {
  survivor: SURVIVOR,
  mage: image('/assets/art/survivor-mage-v1.webp'),
  berserker: image('/assets/art/survivor-berserker-v1.webp'),
}
// classId: { arm?, leg? } — 직업별 부상 스프라이트가 생기면 여기에 등록한다.
export const SURVIVOR_INJURED_BY_CLASS = {
  mage: {
    leg: image('/assets/art/survivor-mage-leg-injured-v1.webp'),
  },
  berserker: {
    arm: image('/assets/art/survivor-berserker-arm-injured-v1.webp'),
    leg: image('/assets/art/survivor-berserker-leg-injured-v1.webp'),
  },
}

// rules.heroAppearance(state) → { classId, injury } 를 받아 그릴 스프라이트를 고른다.
// 건강: 직업 기본 → 부상: 직업별 부상 → 없으면 공용 부상.
export function heroSprite({ classId, injury }) {
  const base = SURVIVOR_SPRITES[classId] || SURVIVOR
  if (!injury) return base
  return SURVIVOR_INJURED_BY_CLASS[classId]?.[injury] || SURVIVOR_INJURED[injury] || base
}
export const INFECTED = image('/assets/art/infected-v1.webp')
export const COIN_HEADS = '/assets/art/coin-heads-v2.webp'
export const COIN_TAILS = '/assets/art/coin-tails-v2.webp'

export const EFFECT_SPRITES = {
  flare: image('/assets/art/fx-flare-v1.webp'),
  flareImpact: image('/assets/art/fx-flare-impact-v1.webp'),
  flashbang: image('/assets/art/fx-flashbang-v1.webp'),
  grenade: image('/assets/art/fx-grenade-blast-v1.webp'),
  molotov: image('/assets/art/fx-molotov-v1.webp'),
  burn: image('/assets/art/fx-burn-v1.webp'),
  muzzle: image('/assets/art/fx-muzzle-v1.webp'),
  impact: image('/assets/art/fx-impact-v1.webp'),
  slash: image('/assets/art/fx-slash-v1.webp'),
  guard: image('/assets/art/fx-guard-v1.webp'),
  heal: image('/assets/art/fx-heal-v1.webp'),
  quiet: image('/assets/art/fx-quiet-v1.webp'),
  focus: image('/assets/art/fx-focus-v1.webp'),
}

export const ENEMY_SPRITES = {
  walker: INFECTED,
  runner: image('/assets/art/enemy-runner-v1.webp'),
  spitter: image('/assets/art/enemy-spitter-v1.webp'),
  brute: image('/assets/art/enemy-brute-v1.webp'),
  boss: image('/assets/art/enemy-boss-v1.webp'),
  shrieker: image('/assets/art/enemy-shrieker-v1.webp'),
  crawler: image('/assets/art/enemy-crawler-v1.webp'),
  bloater: image('/assets/art/enemy-bloater-v1.webp'),
}

export const ENEMY_INJURED_SPRITES = {
  runner: { leg: image('/assets/art/enemy-runner-leg-injured-v1.webp') },
  spitter: { arm: image('/assets/art/enemy-spitter-arm-injured-v1.webp') },
  brute: { arm: image('/assets/art/enemy-brute-arm-injured-v1.webp') },
  boss: {
    arm: image('/assets/art/enemy-boss-arm-injured-v1.webp'),
    leg: image('/assets/art/enemy-boss-leg-injured-v1.webp'),
  },
  crawler: { leg: image('/assets/art/enemy-crawler-leg-injured-v1.webp') },
  bloater: { arm: image('/assets/art/enemy-bloater-arm-injured-v1.webp') },
}

export const UPGRADE_EPAULETTE = '/assets/art/upgrade-epaulette-v1.webp'

export const CARD_ART = {
  knife: '/assets/art/card-knife-v2.webp',
  quickCut: '/assets/art/card-quick-cut-v2.webp',
  deepCut: '/assets/art/card-deep-cut-v2.webp',
  guard: '/assets/art/card-guard-v2.webp',
  parry: '/assets/art/card-parry-v2.webp',
  brace: '/assets/art/card-brace-v2.webp',
  shieldBash: '/assets/art/card-shield-bash-v2.webp',
  smash: '/assets/art/card-smash-v2.webp',
  batSwing: '/assets/art/card-bat-swing-v2.webp',
  batShove: '/assets/art/card-bat-shove-v2.webp',
  pistol: '/assets/art/card-pistol-v2.webp',
  flareShot: '/assets/art/card-flare-shot-v2.webp',
  heal: '/assets/art/card-heal-v2.webp',
  painkiller: '/assets/art/card-painkiller-v2.webp',
  rush: '/assets/art/card-rush-v2.webp',
  adrenaline: '/assets/art/card-adrenaline-v2.webp',
  shotgun: '/assets/art/card-shotgun-v2.webp',
  axe: '/assets/art/card-axe-v2.webp',
  fire: '/assets/art/card-fire-v2.webp',
  grenade: '/assets/art/card-grenade-v2.webp',
  smoke: '/assets/art/card-smoke-v2.webp',
  quiet: '/assets/art/card-quiet-v2.webp',
  focus: '/assets/art/card-focus-v3.webp',
  search: '/assets/art/card-search-v2.webp',
  slash: '/assets/art/card-slash-v1.webp',
  hamstring: '/assets/art/card-hamstring-v1.webp',
  thrust: '/assets/art/card-thrust-v1.webp',
  sweep: '/assets/art/card-sweep-v1.webp',
  hammerBlow: '/assets/art/card-hammer-blow-v1.webp',
  bolt: '/assets/art/card-bolt-v1.webp',
  antibiotic: '/assets/art/card-antibiotic-v1.webp',
  flashbang: '/assets/art/card-flashbang-v1.webp',
  secondWind: '/assets/art/card-second-wind-v1.webp',
  feint: '/assets/art/card-feint-v1.webp',
  tourniquet: '/assets/art/card-tourniquet-v1.webp',
  fanFire: '/assets/art/card-fan-fire-v1.webp',
  allIn: '/assets/art/card-all-in-v1.webp',
  overdose: '/assets/art/card-overdose-v1.webp',
  arcaneBolt: '/assets/art/card-arcane-bolt-v1.webp',
  fireball: '/assets/art/card-fireball-v1.webp',
  drain: '/assets/art/card-drain-v1.webp',
  foresight: '/assets/art/card-foresight-v1.webp',
  ward: '/assets/art/card-ward-v1.webp',
  maintenance: '/assets/art/card-maintenance-v1.webp',
}

export function assetReady(asset) {
  return asset.complete && asset.naturalWidth > 0
}
