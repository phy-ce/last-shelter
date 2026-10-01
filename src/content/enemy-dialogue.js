// 적 행동 대사는 전투 규칙과 분리한다. 수치나 결과를 설명하기보다
// 행동이 일어나기 직전 플레이어가 목격하는 한 문장을 보여 준다.
const COMMON_LINES = {
  stagger: ['{name}가 비틀거리며 바닥을 긁는다.'],
  guard: ['{name}가 두 팔로 몸을 감싸며 버틴다.'],
  guardCharge: ['{name}가 몸을 웅크린 채 힘을 끌어모은다.'],
  charge: ['{name}가 몸을 낮추고 거칠게 숨을 몰아쉰다.'],
  buff: ['{name}가 관절을 꺾으며 몸을 부풀린다.'],
  scream: ['{name}가 목이 찢어질 듯 울부짖는다!'],
  regen: ['{name}의 벌어진 살점이 꿈틀거리며 다시 붙는다.'],
  summon: ['{name}가 어둠 속 무언가를 향해 울음소리를 낸다.'],
  coin: ['{name}가 한쪽 사지를 노리고 거대한 팔을 치켜든다!'],
  grab: ['{name}가 바닥을 박차고 다리를 붙잡으려 달려든다!'],
  multiAttack: ['{name}가 양팔을 마구 휘두르며 덮쳐 온다!'],
  attack: ['{name}가 미친 듯이 팔을 흔들며 달려든다!'],
}

// 여기부터 적별 문구를 함께 확정한다. 같은 행동에 문장이 여러 개면
// 턴과 개체 번호를 기준으로 순환하므로 저장/불러오기 결과도 일정하다.
export const ENEMY_ACTION_LINES = {
  walker: {
    attack: [
      '배회자가 축 늘어진 팔을 휘두르며 다가온다!',
      '배회자가 턱을 달각거리며 손을 뻗는다!',
    ],
    buff: [
      '배회자가 제 몸을 비틀어 남은 힘을 쥐어짠다.',
    ],
  },
  brute: {
    coin: [
      '문지기가 당신의 {target} 으깨려 자세를 잡는다!',
    ],
  },
}

function actionKey(intent) {
  if (intent.type === 'stagger') return 'stagger'
  if (intent.type === 'guard') return intent.charge ? 'guardCharge' : 'guard'
  if (intent.type === 'charge') return 'charge'
  if (intent.type === 'buff') return 'buff'
  if (intent.type === 'scream') return 'scream'
  if (intent.type === 'regen') return 'regen'
  if (intent.type === 'summon') return 'summon'
  if (intent.coin) return 'coin'
  if (intent.grab) return 'grab'
  if (intent.hits > 1) return 'multiAttack'
  return 'attack'
}

export function enemyActionLine(enemy, intent, turn = 0) {
  const key = actionKey(intent)
  const lines = ENEMY_ACTION_LINES[enemy.type]?.[key] || COMMON_LINES[key] || COMMON_LINES.attack
  const index = Math.abs((turn || 0) + (enemy.id || 0)) % lines.length
  const limb = {
    leftArm: '왼팔',
    rightArm: '오른팔',
    leftLeg: '왼다리',
    rightLeg: '오른다리',
  }[intent.limb] || '몸'
  const code = limb.charCodeAt(limb.length - 1)
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
  const target = `${limb}${hasBatchim ? '을' : '를'}`
  return lines[index]
    .replaceAll('{name}', enemy.name)
    .replaceAll('{limb}', limb)
    .replaceAll('{target}', target)
}
