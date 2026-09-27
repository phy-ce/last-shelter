export const RARITIES = {
  common: { name: 'COMMON', mark: 'I' },
  uncommon: { name: 'UNCOMMON', mark: 'II' },
  rare: { name: 'RARE', mark: 'III' },
  unique: { name: 'UNIQUE', mark: '◆' },
  legendary: { name: 'LEGENDARY', mark: '★' },
}

export const ITEMS = {
  kitchenKnife: {
    name: '식칼', rarity: 'common', kind: 'hand', hands: 1,
    note: '가볍고 빠르지만 큰 상처에는 힘이 부족하다.', cards: ['quickCut', 'deepCut'],
  },
  baseballBat: {
    name: '알루미늄 배트', rarity: 'common', kind: 'hand', hands: 2,
    note: '공격과 거리 확보를 함께 노린다.', cards: ['batSwing', 'batShove'],
  },
  riotShield: {
    name: '진압 방패', rarity: 'uncommon', kind: 'hand', hands: 1, shape: [2, 2],
    note: '한 손을 쓰지만 안정적인 방어 카드를 준다.', cards: ['brace', 'shieldBash'],
  },
  flareGun: {
    name: '조명탄 권총', rarity: 'rare', kind: 'hand', hands: 1,
    note: '적 무리를 밝히고 불태운다.', cards: ['flareShot'],
  },
  crowbar: {
    name: '쇠지레', rarity: 'common', kind: 'hand', hands: 1,
    note: '무게를 받아내고, 짧게 내려친다.', cards: ['parry', 'smash'],
  },
  pistol: {
    name: '낡은 권총', rarity: 'uncommon', kind: 'hand', hands: 1,
    note: '탄약은 적지만 한 발은 확실하다.', cards: ['pistol'],
  },
  shotgun: {
    name: '펌프액션 산탄총', rarity: 'rare', kind: 'hand', hands: 2,
    note: '두 손을 차지한다. 모든 적을 밀어붙인다.', cards: ['shotgun', 'shotgun'],
  },
  fireAxe: {
    name: '소방 도끼', rarity: 'uncommon', kind: 'hand', hands: 2,
    note: '느리지만 처치하면 흐름을 되찾는다.', cards: ['axe'],
  },
  medkit: {
    name: '구급상자', rarity: 'common', kind: 'consumable', uses: 3,
    note: '준비 단계나 전투 중 사용할 수 있다.', cards: ['heal'],
  },
  molotov: {
    name: '화염병', rarity: 'uncommon', kind: 'consumable', uses: 1,
    note: '한 번 던지면 사라진다.', cards: ['fire'],
  },
  painkillers: {
    name: '진통제 통', rarity: 'common', kind: 'consumable', uses: 3,
    note: '낫지는 않는다. 이번 턴만 아프지 않을 뿐이다.', cards: ['painkiller'],
  },
  energyDrink: {
    name: '고카페인 음료', rarity: 'uncommon', kind: 'consumable', uses: 2,
    note: '짧은 순간 행동력을 끌어낸다.', cards: ['rush'],
  },
  smokeBomb: {
    name: '연막탄', rarity: 'uncommon', kind: 'consumable', uses: 2,
    note: '소음을 덮고 공격을 피할 틈을 만든다.', cards: ['smoke'],
  },
  grenade: {
    name: '세열 수류탄', rarity: 'rare', kind: 'consumable', uses: 2,
    note: '두 번 던질 수 있는 강력한 전체 공격.', cards: ['grenade'],
  },
  adrenaline: {
    name: '아드레날린 주사', rarity: 'rare', kind: 'consumable', uses: 3,
    note: '전투가 끝날 때까지 공격성을 끌어올린다.', cards: ['adrenaline'],
  },
  magazine: {
    name: '탄약', rarity: 'common', kind: 'resource', uses: 8,
    note: '총기 카드가 사용하는 공용 탄약 8발.', cards: [],
  },
  // ── 추가 장비 ──
  machete: {
    name: '마체테', rarity: 'uncommon', kind: 'hand', hands: 1,
    note: '넓게 휘두르거나 다리를 노린다.', cards: ['slash', 'hamstring'],
  },
  spear: {
    name: '개조 창', rarity: 'uncommon', kind: 'hand', hands: 2,
    note: '거리를 두고 찌르고, 쓰러뜨린다.', cards: ['thrust', 'sweep'],
  },
  sledgehammer: {
    name: '해체용 해머', rarity: 'rare', kind: 'hand', hands: 2,
    note: '느리고 시끄럽지만 맞은 것은 일어나지 못한다.', cards: ['hammerBlow'],
  },
  crossbow: {
    name: '사냥용 석궁', rarity: 'rare', kind: 'hand', hands: 2,
    note: '탄약을 쓰지만 소리가 나지 않는다.', cards: ['bolt', 'bolt'],
  },
  // ── 추가 소모품 ──
  antibiotics: {
    name: '항생제', rarity: 'uncommon', kind: 'consumable', uses: 2,
    note: '감염을 크게 줄인다.', cards: ['antibiotic'],
  },
  flashbang: {
    name: '섬광탄', rarity: 'rare', kind: 'consumable', uses: 1,
    note: '한 턴을 통째로 산다.', cards: ['flashbang'],
  },
  tourniquet: {
    name: '지혈대', rarity: 'common', kind: 'consumable', uses: 2,
    note: '출혈을 막고 버틸 시간을 번다.', cards: ['tourniquet'],
  },
  // ── 도박 장비·소모품 ──
  revolver: {
    name: '낡은 리볼버', rarity: 'rare', kind: 'hand', hands: 1,
    note: '약실 몇 개는 비어 있다. 어느 것인지는 모른다.', cards: ['fanFire', 'fanFire'],
  },
  serum: {
    name: '실험용 혈청', rarity: 'rare', kind: 'consumable', uses: 1,
    note: '병동에서 나온 것. 라벨은 없다.', cards: ['overdose'],
  },
}

// 가방: 칸 단위. 아이템은 종류별 고정 크기(shape로 예외 지정)이며 90° 회전할 수 있다.
//   소모품·탄약 1×1, 한손 무기 1×2, 양손 무기 1×3. 손에 든 무기는 가방 칸을 차지하지 않는다.
export const BAG = { cols: 3, rows: 3 }

export function itemShape(data) {
  if (data.shape) return { w: data.shape[0], h: data.shape[1] }
  if (data.kind === 'hand') return { w: 1, h: data.hands === 2 ? 3 : 2 }
  return { w: 1, h: 1 }
}

export const LOOT_TABLE = [
  'medkit', 'crowbar', 'kitchenKnife', 'baseballBat', 'painkillers',
  'pistol', 'molotov', 'fireAxe', 'riotShield', 'energyDrink', 'smokeBomb',
  'shotgun', 'flareGun', 'grenade', 'adrenaline', 'magazine',
  'machete', 'spear', 'sledgehammer', 'crossbow', 'antibiotics', 'flashbang', 'tourniquet',
  'revolver', 'serum',
]

// 군수 창고(동전 성공) 전용 후보.
export const ARMORY_TABLE = [
  'pistol', 'shotgun', 'fireAxe', 'flareGun', 'riotShield', 'grenade', 'magazine',
  'sledgehammer', 'crossbow', 'flashbang', 'revolver',
]

export function itemDef(id) { return ITEMS[id] }
export function rarityDef(id) { return RARITIES[id] }
