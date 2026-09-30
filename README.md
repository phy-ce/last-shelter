# Last Shelter

좀비 카드 서바이벌 로그라이크.

**▶ 플레이: https://phy-ce.github.io/last-shelter/** (브라우저에서 바로 실행, 설치 불필요)

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
