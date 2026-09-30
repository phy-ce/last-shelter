export const CARDS = {
      quickCut: {
        name: "빠른 베기", rarity: "common", cost: 0, type: "attack", target: "single",
        damage: (u) => u ? 5 : 4, text: (u, p = 0) => `피해 ${Math.max(0, (u ? 5 : 4) + p)}.`
      },
      deepCut: {
        name: "깊게 찌르기", rarity: "uncommon", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 12 : 10, text: (u, p = 0) => `피해 ${Math.max(0, (u ? 12 : 10) + p)}.`
      },
      brace: {
        name: "방패 세우기", rarity: "uncommon", cost: 1, type: "skill", target: "self",
        text: (u) => `방어도 ${u ? 11 : 9} 획득.`,
        effects: (u) => ({ sound: "guard", block: u ? 11 : 9 })
      },
      shieldBash: {
        name: "방패 밀치기", rarity: "uncommon", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 9 : 7, block: (u) => u ? 5 : 4,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 9 : 7) + p)}. 방어도 ${u ? 5 : 4}.`
      },
      batSwing: {
        name: "풀스윙", rarity: "common", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 14 : 11, text: (u, p = 0) => `피해 ${Math.max(0, (u ? 14 : 11) + p)}.`
      },
      batShove: {
        name: "밀어내기", rarity: "common", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 9 : 7, block: (u) => u ? 6 : 5,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 9 : 7) + p)}. 방어도 ${u ? 6 : 5}.`
      },
      flareShot: {
        name: "조명탄 사격", rarity: "rare", cost: 1, type: "attack", target: "all",
        damage: (u) => u ? 13 : 9, burn: (u) => u ? 4 : 2, noise: 4, ammo: 1,
        text: (u, p = 0) => `모든 적에게 피해 ${Math.max(0, (u ? 13 : 9) + p)}, 화상 ${u ? 4 : 2}.\n탄약 1발 소모 · 소음 4 증가.`
      },
      painkiller: {
        name: "진통제", rarity: "common", cost: 0, type: "skill", target: "self",
        text: (u) => `체력 ${u ? 4 : 3} 회복.\n이번 턴 사지 부상 무시: 팔 부상의 공격 −2가 사라지고, 잠긴 장비 카드를 쓸 수 있다.`,
        effects: (u) => ({ sound: "heal", heal: u ? 4 : 3, numb: true })
      },
      rush: {
        name: "각성", rarity: "uncommon", cost: 0, type: "skill", target: "self",
        text: (u) => `행동력 1 회복. 카드 ${u ? 2 : 1}장 뽑기.`,
        effects: (u) => ({ energy: 1, draw: u ? 2 : 1 })
      },
      smoke: {
        name: "연막", rarity: "uncommon", cost: 1, type: "skill", target: "self",
        text: (u) => `방어도 6. 연막 ${u ? 2 : 1}턴: 적 공격 25% 회피.`,
        effects: (u) => ({ sound: "quiet", block: 6, smoke: u ? 2 : 1 })
      },
      grenade: {
        name: "세열 수류탄", rarity: "rare", cost: 2, type: "attack", target: "all",
        damage: (u) => u ? 28 : 24, noise: 5,
        text: (u, p = 0) => `모든 적에게 피해 ${Math.max(0, (u ? 28 : 24) + p)}.\n동전 실패 시 자신에게 피해 18. 소음 5.`,
        gamble: {
          title: "파편 역류", description: "폭발 반경에서 벗어날 수 있을까.",
          success: "회피", failure: "체력 18 피해",
          lose: { selfDamage: 18 }
        }
      },
      adrenaline: {
        name: "아드레날린", rarity: "rare", cost: 0, type: "power", target: "self",
        text: (u) => `이번 전투 공격 피해 ${u ? 4 : 3} 증가. 방어도 ${u ? 7 : 5}.`,
        effects: (u) => ({ strength: u ? 4 : 3, block: u ? 7 : 5 })
      },
      parry: {
        name: "패링",
        rarity: "common",
        cost: 1,
        type: "skill",
        target: "self",
        text: (u) => `방어도 ${u ? 9 : 7} 획득.\n쇠지레 장비 카드.`,
        effects: (u) => ({ sound: "guard", block: u ? 9 : 7 })
      },
      smash: {
        name: "내려치기",
        rarity: "common",
        cost: 1,
        type: "attack",
        target: "single",
        damage: (u) => u ? 10 : 8,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 10 : 8) + p)}.\n쇠지레 장비 카드.`
      },
      knife: {
        name: "생존용 칼",
        rarity: "common",
        cost: 1,
        type: "attack",
        target: "single",
        damage: (u) => u ? 7 : 5, limbBonus: (u) => u ? 3 : 2,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 7 : 5) + p)}.\n사지를 노리면 피해 ${u ? 3 : 2} 추가.`
      },
      guard: {
        name: "급조 바리케이드",
        rarity: "common",
        cost: 1,
        type: "skill",
        target: "self",
        text: (u) => `방어도 ${u ? 7 : 5} 획득.`,
        effects: (u) => ({ sound: "guard", block: u ? 7 : 5 })
      },
      pistol: {
        name: "권총 사격",
        rarity: "uncommon",
        cost: 1,
        type: "attack",
        target: "single",
        damage: (u) => u ? 22 : 16,
        noise: 3, ammo: 1,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 22 : 16) + p)}.\n탄약 1발 소모 · 소음 3 증가.`
      },
      heal: {
        name: "응급 처치",
        rarity: "common",
        cost: 1,
        type: "skill",
        target: "self",
        text: (u) => `체력 ${u ? 5 : 4} 회복.\n감염 ${u ? 3 : 2} 감소.`,
        effects: (u) => ({ sound: "heal", heal: u ? 5 : 4, cure: u ? 3 : 2 })
      },
      shotgun: {
        name: "산탄 사격",
        rarity: "rare",
        cost: 2,
        type: "attack",
        target: "all",
        damage: (u) => u ? 16 : 13,
        noise: 5, ammo: 2,
        text: (u, p = 0) => `모든 적에게 피해 ${Math.max(0, (u ? 16 : 13) + p)}.\n탄약 2발 소모 · 소음 5 증가.`
      },
      quiet: {
        name: "은밀한 이동",
        rarity: "rare",
        cost: 1,
        type: "skill",
        target: "self",
        text: (u) => `방어도 ${u ? 7 : 5} 획득.\n소음 ${u ? 3 : 2} 감소.`,
        effects: (u) => ({ sound: "quiet", block: u ? 7 : 5, noiseDown: u ? 3 : 2 })
      },
      axe: {
        name: "소방 도끼",
        rarity: "uncommon",
        cost: 2,
        type: "attack",
        target: "single",
        damage: (u) => u ? 25 : 19,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 25 : 19) + p)}.\n처치 시 행동력 1 회복.`
      },
      fire: {
        name: "화염병",
        rarity: "uncommon",
        cost: 1,
        type: "attack",
        target: "all",
        damage: (u) => u ? 9 : 6,
        burn: (u) => u ? 4 : 3,
        noise: 2,
        exhaust: true,
        text: (u, p = 0) => `모든 적에게 피해 ${Math.max(0, (u ? 9 : 6) + p)}, 화상 ${u ? 4 : 3}.\n소음 2 증가. 소멸.`
      },
      focus: {
        name: "살아남을 의지",
        rarity: "unique",
        cost: 1,
        type: "power",
        target: "self",
        exhaust: true,
        text: (u) => `이번 전투 공격 피해 ${u ? 3 : 2} 증가.\n소멸.`,
        effects: (u) => ({ strength: u ? 3 : 2 })
      },
      search: {
        name: "폐허 수색",
        rarity: "rare",
        cost: 0,
        type: "skill",
        target: "self",
        exhaust: true,
        noise: 1,
        text: (u) => `카드 ${u ? 3 : 2}장 뽑기.\n소음 1 증가. 소멸.`,
        effects: (u) => ({ sound: "search", draw: u ? 3 : 2 })
      },
      // ── 추가 무기 카드 ──
      slash: {
        name: "넓게 베기", rarity: "uncommon", cost: 1, type: "attack", target: "all",
        damage: (u) => u ? 8 : 6,
        text: (u, p = 0) => `모든 적에게 피해 ${Math.max(0, (u ? 8 : 6) + p)}.\n마체테 장비 카드.`
      },
      hamstring: {
        name: "오금 베기", rarity: "uncommon", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 9 : 8, limbBonus: (u) => u ? 7 : 6,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 9 : 8) + p)}.\n사지를 노리면 피해 ${u ? 7 : 6} 추가.`
      },
      thrust: {
        name: "연속 찌르기", rarity: "uncommon", cost: 2, type: "attack", target: "single",
        damage: (u) => u ? 8 : 7, hits: () => 2,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 8 : 7) + p)} × 2회.\n개조 창 장비 카드.`
      },
      sweep: {
        name: "휘둘러 넘기기", rarity: "uncommon", cost: 2, type: "attack", target: "single",
        damage: (u) => u ? 9 : 7, stagger: true,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 9 : 7) + p)}.\n대상 경직: 다음 적 행동을 건너뜀.`
      },
      hammerBlow: {
        name: "해머 강타", rarity: "rare", cost: 3, type: "attack", target: "single",
        damage: (u) => u ? 32 : 26, stagger: true, noise: 2,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 32 : 26) + p)}. 대상 경직.\n소음 2 증가. 한 턴을 다 쓴다.`
      },
      bolt: {
        name: "석궁 사격", rarity: "rare", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 17 : 14, ammo: 1,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 17 : 14) + p)}.\n탄약 1발 소모 · 소음 없음.`
      },

      // ── 추가 소모품 카드 ──
      antibiotic: {
        name: "항생제", rarity: "uncommon", cost: 1, type: "skill", target: "self",
        text: (u) => `감염 ${u ? 6 : 5} 감소. 체력 ${u ? 3 : 2} 회복.`,
        effects: (u) => ({ sound: "heal", cure: u ? 6 : 5, heal: u ? 3 : 2 })
      },
      flashbang: {
        name: "섬광탄", rarity: "rare", cost: 2, type: "attack", target: "all",
        stagger: true, noise: 4, exhaust: true,
        text: () => `모든 적 경직: 다음 적 행동을 건너뜀.\n소음 4 증가. 소멸.`
      },

      // ── 추가 스킬 카드 (장비 없이 독립 획득) ──
      secondWind: {
        name: "숨 고르기", rarity: "common", cost: 1, type: "skill", target: "self",
        text: (u) => `방어도 ${u ? 5 : 4} 획득. 카드 1장 뽑기.`,
        effects: (u) => ({ sound: "guard", block: u ? 5 : 4, draw: 1 })
      },
      feint: {
        name: "허를 찌르기", rarity: "rare", cost: 1, upgradedCost: 0, type: "attack", target: "single",
        damage: (u) => u ? 4 : 3, stagger: true, exhaust: true,
        text: (u, p = 0) => `피해 ${Math.max(0, (u ? 4 : 3) + p)}. 대상 경직.\n소멸.`
      },

      // ── 도박 카드: 기본 효과 뒤에 동전을 던진다. 성공/실패 효과는 gamble.win / gamble.lose ──
      fanFire: {
        name: "속사", rarity: "rare", cost: 1, type: "attack", target: "single",
        damage: (u) => u ? 28 : 24, ammo: 1, noise: 3,
        text: (u, p = 0) => `동전을 먼저 던진다.\n성공: 피해 ${Math.max(0, (u ? 28 : 24) + p)}. 실패: 불발.\n탄약 1발 · 소음 3.`,
        gamble: {
          before: true,
          title: "실린더가 돈다", description: "다음 약실에 탄이 있을까.",
          success: (u) => `피해 ${u ? 24 : 20}`, failure: "불발 · 탄약만 소모",
          win: {}, lose: {}
        }
      },
      allIn: {
        name: "올인", rarity: "rare", cost: 0, type: "skill", target: "self", exhaust: true,
        text: (u) => `동전 성공: 행동력 +${u ? 3 : 2}, 카드 3장 뽑기.\n실패: 손패를 전부 버림. 소멸.`,
        effects: () => ({ gambleOnly: true }),
        gamble: {
          title: "남은 것을 전부", description: "여기서 끝내거나, 빈손이 되거나.",
          success: (u) => `행동력 +${u ? 3 : 2} · 카드 3장`, failure: "손패 전부 버림",
          win: (u) => ({ energy: u ? 3 : 2, draw: 3 }), lose: { discardHand: true }
        }
      },
      overdose: {
        name: "과다 투여", rarity: "rare", cost: 0, type: "power", target: "self", exhaust: true,
        text: (u) => `동전 성공: 이번 전투 공격 +${u ? 6 : 5}.\n실패: 감염 +8 · 체력 8 피해. 소멸.`,
        effects: () => ({ gambleOnly: true }),
        gamble: {
          title: "정체불명의 혈청", description: "몸이 받아들일까.",
          success: (u) => `공격 +${u ? 6 : 5}`, failure: "감염 +8 · 체력 8 피해",
          win: (u) => ({ strength: u ? 6 : 5 }), lose: { infection: 8, selfDamage: 8 }
        }
      },

      // ── 술사 주문: 팔이 없어도 쓴다. delayed 주문은 다음 내 턴 시작에 발동한다 ──
      arcaneBolt: {
        name: "마력 화살", rarity: "common", cost: 1, type: "attack", target: "single", magic: true, delayed: true,
        damage: (u) => u ? 12 : 10,
        text: (u, p = 0) => `예약: 다음 턴 시작에 피해 ${Math.max(0, (u ? 12 : 10) + p)}.\n대상이 죽으면 다른 적에게.`
      },
      fireball: {
        name: "화염구", rarity: "uncommon", cost: 2, type: "attack", target: "all", magic: true, delayed: true,
        damage: (u) => u ? 10 : 8, burn: (u) => u ? 4 : 3, noise: 1,
        text: (u, p = 0) => `예약: 다음 턴 시작에 모든 적에게 피해 ${Math.max(0, (u ? 10 : 8) + p)}, 화상 ${u ? 4 : 3}.\n소음 1 증가.`
      },
      drain: {
        name: "흡수", rarity: "uncommon", cost: 1, type: "attack", target: "single", magic: true, delayed: true,
        damage: (u) => u ? 8 : 6, heal: (u) => u ? 5 : 4,
        text: (u, p = 0) => `예약: 다음 턴 시작에 피해 ${Math.max(0, (u ? 8 : 6) + p)}, 체력 ${u ? 5 : 4} 회복.`
      },
      foresight: {
        name: "예지", rarity: "rare", cost: 0, type: "skill", target: "self", magic: true, delayed: true, exhaust: true,
        text: (u) => `예약: 다음 턴 시작에 카드 3장 뽑기, 행동력 +${u ? 2 : 1}.\n소멸.`,
        effects: (u) => ({ draw: 3, energy: u ? 2 : 1 })
      },
      ward: {
        name: "역장", rarity: "common", cost: 1, type: "skill", target: "self", magic: true,
        text: (u) => `방어도 ${u ? 7 : 5} 획득. 즉시.`,
        effects: (u) => ({ sound: "quiet", block: u ? 7 : 5 })
      },
      maintenance: {
        name: "개인 정비", rarity: "uncommon", cost: 3, upgradedCost: 2, type: "skill", target: "self", choice: true,
        text: () => `둘 중 하나 선택:\n방어도 10 획득 / 손에 든 장비 교체.`,
        effects: () => ({ sound: "guard", block: 10 })
      },
      tourniquet: {
        name: "지혈대", rarity: "common", cost: 1, type: "skill", target: "self",
        text: (u) => `체력 ${u ? 5 : 4} 회복. 방어도 ${u ? 4 : 3}.`,
        effects: (u) => ({ sound: "heal", heal: u ? 5 : 4, block: u ? 4 : 3 })
      }
    };

export const CARD_FLAVOR = {
  quickCut: "망설임보다 칼끝이 먼저 움직인다.",
  deepCut: "가까이 붙어, 한 번에 깊게 밀어 넣는다.",
  brace: "방패 뒤에서는 다음 숨을 고를 수 있다.",
  shieldBash: "막는 것과 밀어내는 것은 같은 동작이다.",
  batSwing: "넓은 궤적은 힘보다 공간을 만든다.",
  batShove: "쓰러뜨리지 못해도 가까이 오지는 못한다.",
  flareShot: "빛을 본 것들은 곧 불길도 보게 된다.",
  painkiller: "상처는 그대로다. 지금 아프지 않을 뿐이다.",
  rush: "몸이 내일의 피로를 오늘 빌려 쓴다.",
  smoke: "보이지 않으면, 소리도 방향을 잃는다.",
  grenade: "핀을 뽑은 순간부터 선택지는 하나뿐이다.",
  adrenaline: "심장은 살아남기 위해 스스로를 태운다.",
  parry: "쇠지레를 비틀어 충격을 옆으로 흘린다.",
  smash: "도구의 무게를 그대로 머리 위에서 떨어뜨린다.",
  knife: "무기는 아니었다. 세상이 바뀌기 전까지는.",
  guard: "진열대와 판자도 한 번의 공격은 막아 준다.",
  pistol: "방아쇠를 당길 때마다 살아남을 시간이 한 발씩 줄어든다.",
  heal: "깨끗한 붕대는 이제 탄약만큼 귀하다.",
  shotgun: "좁은 거리에서 이보다 확실한 대답은 없다.",
  quiet: "발소리를 죽이면 적의 수가 줄어든다.",
  axe: "문을 열던 도끼는 이제 다른 것을 가른다.",
  fire: "불은 감염됐는지 묻지 않는다.",
  focus: "살아남는다는 한 가지 생각만 남긴다.",
  search: "폐허는 비어 있지 않다. 먼저 찾는 사람이 가질 뿐이다.",
  slash: "정확할 필요는 없다. 넓으면 된다.",
  hamstring: "다리를 끊으면, 나머지는 시간이 해결한다.",
  thrust: "한 번으로 안 되면 같은 자리를 다시.",
  sweep: "쓰러진 것은 한 턴 동안 일어나지 못한다.",
  hammerBlow: "벽을 부수던 도구다. 뼈는 벽보다 약하다.",
  bolt: "소리 없이 날아가는 것은 대답도 남기지 않는다.",
  antibiotic: "유통기한은 지났다. 그래도 없는 것보단 낫다.",
  flashbang: "빛이 사라지기 전까지, 그것들은 아무것도 아니다.",
  secondWind: "한 번 더 숨을 쉴 수 있다면 한 번 더 싸울 수 있다.",
  feint: "그것들도 예상이라는 걸 한다. 그게 약점이다.",
  tourniquet: "피를 멈추는 것이 먼저다. 아픈 건 나중이다.",
  maintenance: "한 턴을 통째로 쓴다. 살아남으면 그 값을 한다.",
  arcaneBolt: "손이 없어도 겨눌 수는 있다. 맞는 건 다음 숨에.",
  fireball: "불은 던지는 게 아니다. 거기 있으라고 하는 것이다.",
  ward: "벽은 나무로만 만드는 게 아니다. 지금 당장 필요한 건 이것뿐이다.",
  foresight: "다음 숨을 미리 쉬어 둔다.",
  drain: "그것들에게서 가져올 수 있는 건 하나뿐이다.",
  fanFire: "여섯 발 중 몇 발이 살아 있는지는 쏴 봐야 안다.",
  allIn: "남는 게 없으면 잃을 것도 없다.",
  overdose: "라벨은 지워졌다. 효과는 지워지지 않았다.",
};

// 스킬은 장비/소모품이 공급하지 않아도 독립적으로 획득 가능한 카드만 포함한다.
export const SKILL_POOL = ["knife", "guard", "quiet", "focus", "search", "secondWind", "feint", "maintenance", "allIn"];

export const ENEMY_TYPES = {
      walker: { name: "배회자", hp: 21, size: 1, coat: "#686256" },
      runner: { name: "역관절 질주자", hp: 22, size: 1.03, coat: "#855b52" },
      spitter: { name: "봉합된 감염체", hp: 27, size: 1.08, coat: "#7b7c57" },
      brute: { name: "문지기", hp: 47, size: 1.26, coat: "#72605a" },
      // 추가 적: 전용 스프라이트가 없으면 감염체 더미 스프라이트로 그려진다.
      shrieker: { name: "울부짖는 것", hp: 18, size: 0.96, coat: "#6f5f6e" },
      crawler: { name: "기어오는 것", hp: 16, size: 0.9, coat: "#5d5a4c" },
      bloater: { name: "부풀어 오른 것", hp: 38, size: 1.2, coat: "#7a7d5a" },
      boss: { name: "문 안의 어머니", hp: 116, size: 1.45, coat: "#896b69" }
    };

// 추가 적의 행동 패턴. 턴마다 순서대로 순환한다.
//   attack: damage · hits 연타 · infection 감염 · grab 붙잡기(다음 턴 드로우 −1)
//   guard: 방어도 / scream: 소음 증가 / regen: 체력 회복 / summon: 다른 적 1마리를 불러낸다(최대 적 수를 넘지 않을 때만)
// 부위가 파괴되면 `broken` 패턴으로 바뀐다.
export const ENEMY_PATTERNS = {
      shrieker: {
        cycle: [
          { type: "scream", noise: 3 },
          { type: "attack", damage: 4 },
          { type: "summon", summon: "crawler" },
          { type: "attack", damage: 4 }
        ]
      },
      crawler: {
        part: { key: "leg", name: "다리", hp: 9, effect: "붙잡기 제거." },
        cycle: [
          { type: "attack", damage: 3, grab: true },
          { type: "attack", damage: 5 }
        ],
        broken: [{ type: "attack", damage: 4 }]
      },
      bloater: {
        part: { key: "arm", name: "팔", hp: 12, effect: "재생 제거. 방어 약화." },
        cycle: [
          { type: "guard", block: 7 },
          { type: "attack", damage: 8, infection: 2 },
          { type: "regen", heal: 6 }
        ],
        broken: [
          { type: "guard", block: 3 },
          { type: "attack", damage: 8, infection: 2 }
        ]
      }
    };

export const STAGES = [
      { name: "01 / 문 닫힌 편의점", enemies: ["walker", "walker"] },
      { name: "02 / 아래로만 이어지는 주차장", enemies: ["runner", "spitter"] },
      { name: "03 / 멈춘 지하철", enemies: ["shrieker", "crawler"] },
      { name: "04 / 이름 없는 병동", enemies: ["brute", "walker"] },
      { name: "05 / 수문 관리소", enemies: ["bloater", "crawler", "walker"] },
      { name: "06 / 돌아보는 검문소", enemies: ["spitter", "runner", "shrieker"] },
      { name: "07 / 숨 쉬는 출구", enemies: ["boss", "spitter"] }
    ];

export const LIMBS = [
      { key: "leftArm", name: "왼팔", type: "arm" },
      { key: "rightArm", name: "오른팔", type: "arm" },
      { key: "leftLeg", name: "왼다리", type: "leg" },
      { key: "rightLeg", name: "오른다리", type: "leg" }
    ];

// 스킬·파워 카드의 수치 효과. 전투 실행, 손패 요약, 준비 화면 사용이 모두 이 값을 쓴다.
export function skillEffects(key, upgraded = false) {
  return CARDS[key]?.effects?.(upgraded) ?? {}
}

export const BURN_TEXT = "적 행동 전에 화상 수치만큼 몸통 피해를 주고, 화상이 1 감소합니다.";
