function image(src) {
  const asset = new Image()
  asset.decoding = 'async'
  asset.src = src
  return asset
}

export const COMBAT_BACKGROUND = image('/assets/art/city-combat-bg-v1.png')
export const SURVIVOR = image('/assets/art/survivor-v1.png')
export const SURVIVOR_INJURED = {
  arm: image('/assets/art/survivor-arm-injured-v1.png'),
  leg: image('/assets/art/survivor-leg-injured-v1.png'),
}
export const SURVIVOR_SPRITES = {
  survivor: SURVIVOR,
  mage: image('/assets/art/survivor-mage-v1.png'),
  berserker: image('/assets/art/survivor-berserker-v1.png'),
}
// classId: { arm?, leg? } — 직업별 부상 스프라이트가 생기면 여기에 등록한다.
export const SURVIVOR_INJURED_BY_CLASS = {
  mage: {
    leg: image('/assets/art/survivor-mage-leg-injured-v1.png'),
  },
  berserker: {
    arm: image('/assets/art/survivor-berserker-arm-injured-v1.png'),
    leg: image('/assets/art/survivor-berserker-leg-injured-v1.png'),
  },
}

// rules.heroAppearance(state) → { classId, injury } 를 받아 그릴 스프라이트를 고른다.
// 건강: 직업 기본 → 부상: 직업별 부상 → 없으면 공용 부상.
export function heroSprite({ classId, injury }) {
  const base = SURVIVOR_SPRITES[classId] || SURVIVOR
  if (!injury) return base
  return SURVIVOR_INJURED_BY_CLASS[classId]?.[injury] || SURVIVOR_INJURED[injury] || base
}
export const INFECTED = image('/assets/art/infected-v1.png')
export const COIN_HEADS = '/assets/art/coin-heads-v2.png'
export const COIN_TAILS = '/assets/art/coin-tails-v2.png'

export const INTENT_ICONS = {
  attack: '/assets/art/intent-zombie-attack-v1.png',
  guard: '/assets/art/intent-guard-v1.png',
  zombieGuard: '/assets/art/intent-zombie-guard-v1.png',
  charge: '/assets/art/intent-charge-v1.png',
  coin: '/assets/art/intent-coin-danger-v1.png',
  infection: '/assets/art/status-infection-v1.png',
  stagger: '/assets/art/intent-stagger-v1.png',
  scream: '/assets/art/intent-scream-v1.png',
  regen: '/assets/art/intent-regen-v1.png',
  grab: '/assets/art/intent-grab-v1.png',
}

export const EFFECT_SPRITES = {
  flare: image('/assets/art/fx-flare-v1.png'),
  flareImpact: image('/assets/art/fx-flare-impact-v1.png'),
  flashbang: image('/assets/art/fx-flashbang-v1.png'),
  grenade: image('/assets/art/fx-grenade-blast-v1.png'),
  molotov: image('/assets/art/fx-molotov-v1.png'),
  burn: image('/assets/art/fx-burn-v1.png'),
  muzzle: image('/assets/art/fx-muzzle-v1.png'),
  impact: image('/assets/art/fx-impact-v1.png'),
  slash: image('/assets/art/fx-slash-v1.png'),
  guard: image('/assets/art/fx-guard-v1.png'),
  heal: image('/assets/art/fx-heal-v1.png'),
  quiet: image('/assets/art/fx-quiet-v1.png'),
  focus: image('/assets/art/fx-focus-v1.png'),
}

export const ENEMY_SPRITES = {
  walker: INFECTED,
  runner: image('/assets/art/enemy-runner-v1.png'),
  spitter: image('/assets/art/enemy-spitter-v1.png'),
  brute: image('/assets/art/enemy-brute-v1.png'),
  boss: image('/assets/art/enemy-boss-v1.png'),
  shrieker: image('/assets/art/enemy-shrieker-v1.png'),
  crawler: image('/assets/art/enemy-crawler-v1.png'),
  bloater: image('/assets/art/enemy-bloater-v1.png'),
}

export const ENEMY_INJURED_SPRITES = {
  runner: { leg: image('/assets/art/enemy-runner-leg-injured-v1.png') },
  spitter: { arm: image('/assets/art/enemy-spitter-arm-injured-v1.png') },
  brute: { arm: image('/assets/art/enemy-brute-arm-injured-v1.png') },
  boss: {
    arm: image('/assets/art/enemy-boss-arm-injured-v1.png'),
    leg: image('/assets/art/enemy-boss-leg-injured-v1.png'),
  },
  crawler: { leg: image('/assets/art/enemy-crawler-leg-injured-v1.png') },
  bloater: { arm: image('/assets/art/enemy-bloater-arm-injured-v1.png') },
}

export const UPGRADE_EPAULETTE = '/assets/art/upgrade-epaulette-v1.png'

export const CARD_ART = {
  knife: '/assets/art/card-knife-v2.png',
  quickCut: '/assets/art/card-quick-cut-v2.png',
  deepCut: '/assets/art/card-deep-cut-v2.png',
  guard: '/assets/art/card-guard-v2.png',
  parry: '/assets/art/card-parry-v2.png',
  brace: '/assets/art/card-brace-v2.png',
  shieldBash: '/assets/art/card-shield-bash-v2.png',
  smash: '/assets/art/card-smash-v2.png',
  batSwing: '/assets/art/card-bat-swing-v2.png',
  batShove: '/assets/art/card-bat-shove-v2.png',
  pistol: '/assets/art/card-pistol-v2.png',
  flareShot: '/assets/art/card-flare-shot-v2.png',
  heal: '/assets/art/card-heal-v2.png',
  painkiller: '/assets/art/card-painkiller-v2.png',
  rush: '/assets/art/card-rush-v2.png',
  adrenaline: '/assets/art/card-adrenaline-v2.png',
  shotgun: '/assets/art/card-shotgun-v2.png',
  axe: '/assets/art/card-axe-v2.png',
  fire: '/assets/art/card-fire-v2.png',
  grenade: '/assets/art/card-grenade-v2.png',
  smoke: '/assets/art/card-smoke-v2.png',
  quiet: '/assets/art/card-quiet-v2.png',
  focus: '/assets/art/card-focus-v3.png',
  search: '/assets/art/card-search-v2.png',
  slash: '/assets/art/card-slash-v1.png',
  hamstring: '/assets/art/card-hamstring-v1.png',
  thrust: '/assets/art/card-thrust-v1.png',
  sweep: '/assets/art/card-sweep-v1.png',
  hammerBlow: '/assets/art/card-hammer-blow-v1.png',
  bolt: '/assets/art/card-bolt-v1.png',
  antibiotic: '/assets/art/card-antibiotic-v1.png',
  flashbang: '/assets/art/card-flashbang-v1.png',
  secondWind: '/assets/art/card-second-wind-v1.png',
  feint: '/assets/art/card-feint-v1.png',
  tourniquet: '/assets/art/card-tourniquet-v1.png',
  fanFire: '/assets/art/card-fan-fire-v1.png',
  allIn: '/assets/art/card-all-in-v1.png',
  overdose: '/assets/art/card-overdose-v1.png',
  arcaneBolt: '/assets/art/card-arcane-bolt-v1.png',
  fireball: '/assets/art/card-fireball-v1.png',
  drain: '/assets/art/card-drain-v1.png',
  foresight: '/assets/art/card-foresight-v1.png',
  ward: '/assets/art/card-ward-v1.png',
  maintenance: '/assets/art/card-maintenance-v1.png',
}

export function assetReady(asset) {
  return asset.complete && asset.naturalWidth > 0
}
