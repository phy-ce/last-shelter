// 직업. 각 직업은 규칙 한두 개를 비튼다(특성). 시작 덱·장비는 그 비틀기에 맞춘다.
//   traits.noArms       두 팔이 영구 부상. 손 장비·소모품 불가, 팔 부상 페널티는 무시(주문은 팔을 안 쓴다).
//   rewardCards         전투 보상·군수 창고 풀에 이 카드들이 아이템과 섞여 나온다(못 쓰는 물건과 함께)
//   traits.attackBonus  모든 직접 공격 피해 +N
//   traits.blockBonus   카드로 얻는 방어도 +N
//   traits.hideIntents  적의 다음 행동이 보이지 않는다
//   skillPool           낯선 생존자가 주는 스킬 후보(없으면 기본 SKILL_POOL)
//   startUses           시작 아이템의 사용 횟수를 기본값 대신 이 값으로 { key: uses }

export const CLASSES = {
  survivor: {
    name: '생존자',
    tagline: '평범하게 시작한다. 손에 든 것이 전부다.',
    hp: 76,
    skills: [['knife', 4], ['guard', 4], ['maintenance', 1]],
    inventory: ['crowbar', 'medkit', 'magazine'],
    startUses: { magazine: 4 }, // 시작 탄약은 반 상자
    equip: 'crowbar',
    traits: {},
  },
  mage: {
    name: '술사',
    tagline: '두 팔을 잃었다. 주문은 다음 턴에 터진다. 그때까지 살아 있어야 한다.',
    hp: 60,
    skills: [['arcaneBolt', 3], ['ward', 3], ['fireball', 1], ['drain', 1], ['foresight', 1]],
    inventory: [],
    equip: null,
    traits: { noArms: true },
    skillPool: ['arcaneBolt', 'ward', 'fireball', 'drain', 'foresight', 'guard', 'quiet', 'focus', 'search', 'secondWind', 'allIn'],
    rewardCards: ['arcaneBolt', 'arcaneBolt', 'ward', 'ward', 'fireball', 'drain', 'foresight'],
  },
  berserker: {
    name: '광인',
    tagline: '그것들이 무엇을 하려는지 보지 않는다. 볼 필요가 없다.',
    hp: 80,
    skills: [['knife', 4], ['guard', 4], ['maintenance', 1]],
    inventory: ['crowbar', 'medkit', 'magazine'],
    startUses: { magazine: 4 }, // 시작 탄약은 반 상자
    equip: 'crowbar',
    traits: { attackBonus: 3, blockBonus: 2, hideIntents: true },
  },
}

export function classDef(id) {
  return CLASSES[id] || CLASSES.survivor
}

export function classTrait(state, key) {
  return classDef(state.classId).traits[key]
}
