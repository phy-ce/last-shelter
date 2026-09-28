# Last Shelter

좀비로 무너진 도시에서 일곱 구역을 지나 탈출하는 카드 서바이벌 로그라이크.
손에 든 장비가 곧 덱이 되고, 동전 한 번에 팔다리를 잃는다.

**▶ 플레이: https://phy-ce.github.io/last-shelter/** (브라우저에서 바로 실행, 설치 불필요)

## 게임 방법

- **턴제 카드 전투:** 매 턴 행동력 3과 카드 5장으로 시작한다. 공격은 카드를 고른 뒤 대상(몸통 또는 팔·다리)을 누르고, 방어·회복은 바로 쓴다.
- **적의 의도:** 적 머리 위에 다음 행동(공격, 방어, 힘 모으기, 소환 등)이 보인다. 보고 막을지 칠지 정한다.
- **장비가 곧 덱:** 손에 든 무기만 카드를 준다. 쇠지레를 들면 `패링`·`내려치기`가 덱에 들어오고, 가방에 넣으면 빠진다. 소모품은 가방에 있기만 하면 쓸 수 있고, 횟수를 다 쓰면 사라진다.
- **가방:** 3×3 격자 인벤토리. 물건마다 크기가 다르고 돌려서 넣을 수 있다. 탄약은 한 칸에 8발까지 쌓인다.
- **사지와 동전:** 강한 적의 강타는 동전으로 판정한다(앞·뒤 50%). 실패해서 피해를 받으면 팔이나 다리를 다친다. 팔은 공격 피해 −2, 다리는 턴 시작 드로우 −1.
- **적의 부위 파괴:** 적의 팔·다리를 노려 부수면 그 부위로 하던 행동이 약해지거나 사라진다.
- **소음:** 큰 소리를 내는 카드를 쓰면 소음이 쌓이고, 6이 넘으면 적이 한 마리 더 온다. 한 번에 최대 5마리.
- **감염:** 감염 2마다 매 턴 체력 1을 잃고(방어 무시), 8 이상이면 고열로 행동력이 1 줄어든다.
- **구역 사이의 선택:**
  - 은신처: 체력 15 회복, 감염 2 감소, 사지 부상 1곳 치료
  - 정비소: 장비 하나(딸린 카드 전부) 또는 스킬 2장 강화
  - 낯선 생존자: 스킬 카드 3장 중 1장
  - 군수 창고: 동전 성공 시 장비·탄약, 실패 시 체력 −6

## 직업

| 직업 | 체력 | 특징 |
|---|---|---|
| 생존자 | 76 | 특성 없음. 쇠지레·구급상자·탄약으로 시작 |
| 술사 | 60 | 두 팔이 없어 장비·소모품을 못 쓴다. 주문은 다음 턴에 터진다 |
| 광인 | 80 | 공격 +3, 카드 방어도 +2. 대신 적의 다음 행동이 안 보인다 |

## 조작

| 키 | 동작 |
|---|---|
| 1–9, 0 | 손패 카드 선택 |
| Space | 턴 종료 · 동전 결과 확인 |
| Esc | 선택 취소 · 창 닫기 |
| I | 인벤토리(가방) |
| D | 덱 |
| B | 신체(사지 상태) |
| C | 도감 |
| L | 전투 기록 |
| H | 규칙 |
| O | 설정 |
| M | 음소거 |
| R | 가방에서 물건 회전 |

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버
npm run build    # dist/에 빌드
npm run check    # 카드·아이템·적 데이터 정합성 검사
npm run sim      # 봇이 200판을 돌려 구역별 사망률과 카드 사용량 출력 (npm run sim [판수] [시드])
npm run smoke:serve   # 스모크 테스트용 정적 서버 (포트 8123)
npm run smoke         # 헤드리스 Chrome으로 새 게임 → 카드 사용 → 턴 종료까지 실행
```

`main`에 푸시하면 GitHub Actions가 빌드해서 GitHub Pages에 자동 배포한다(`.github/workflows/pages.yml`).

### 구조

| 경로 | 역할 |
|---|---|
| `src/core/combat-rules.js` | 전투·준비 규칙 전부. 브라우저 없이 돌아가며 상태를 바꾸고 이벤트 배열을 돌려준다 |
| `src/content/` | 카드(`combat.js`), 아이템(`items.js`), 직업(`classes.js`) 데이터 |
| `src/legacy/game.js` | 규칙을 호출하고 결과를 화면·소리로 그린다 |
| `src/boot/preload.js` | 첫 화면에 필요한 그림을 먼저 받고 나머지는 뒤에서 받는다 |
| `src/audio/` | 효과음(`engine.js`, `samples.js`)과 배경 음악(`music.js`) |
| `src/art/`, `src/ui/`, `src/styles/` | 그림 경로, 아이콘, 스타일 |
| `tools/` | 데이터 검사, 시뮬레이터, 스모크 테스트 |

### 데이터 규칙

- 카드 수치는 `src/content/combat.js`에만 둔다. 스킬 카드는 `effects(upgraded)`로 효과를 선언하고, 전투 실행·손패 요약이 모두 이 값을 읽는다.
- 강화 시 비용이 바뀌는 카드는 `upgradedCost`를 준다.
- 새 적의 행동은 `ENEMY_PATTERNS`에 선언한다: `cycle`(순환 행동), 선택적으로 `part`(파괴 가능한 부위)와 `broken`(부위 파괴 후 행동). 행동 종류는 `attack`, `guard`, `scream`, `regen`, `summon`.

## 크레딧

- **음악:** "Oppressive Gloom", "The Descent", "Volatile Reaction" — Kevin MacLeod (incompetech.com), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). 자세한 내용은 `public/assets/audio/music/CREDITS.md`.
- **효과음:** Sonniss GDC Game Audio Bundle에서 발췌(로열티 프리, 출처 표기 불요). 파일별 출처는 `public/assets/audio/sonniss/CREDITS.md`.
- **아이콘:** 일부 상태 아이콘은 [Tabler Icons](https://github.com/tabler/tabler-icons)(MIT)를 변형. `docs/THIRD_PARTY_ASSETS.md` 참고.
