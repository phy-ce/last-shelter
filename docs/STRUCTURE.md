# 현재 구조

지금 코드가 **실제로** 어떻게 되어 있는지 적는 문서. 계획은 `docs/plan/`에 둔다.
구조를 바꾸는 변경(파일 추가·삭제·이동, 모듈 역할 변경, `state` 필드·이벤트 타입 추가·삭제)은 같은 작업 안에서 이 문서를 갱신한다.

관련 구조 문서: UI 렌더링은 `ENGINE_UI.md`, UI 규칙은 `UX_RULES.md`, 에셋은 `ART_NOTES.md`·`THIRD_PARTY_ASSETS.md`.

## 스택
- Vite + 바닐라 JS. 런타임 라이브러리: `pixi.js` v8(렌더링), `gsap`(트윈), `@pixi/ui`·`@pixi/layout`(UI 입력·배치).
- 전투 장면과 게임 UI는 WebGL(Pixi)로 그린다. WebGL이 없으면 게임이 시작되지 않고 안내만 뜬다.
- 배포: `main`에 푸시하면 GitHub Actions가 `npm run check` → `npm run build` → GitHub Pages.

## 폴더와 파일

| 경로 | 역할 | 담당 |
|---|---|---|
| `src/core/combat-rules.js` | 모든 게임 규칙. `state`를 바꾸고 이벤트 배열을 돌려준다. 브라우저 없이 돈다(시뮬레이터가 그대로 import). | Claude |
| `src/core/save.js` | 런 저장·불러오기(localStorage) | Claude |
| `src/core/settings.js` | 설정 값과 저장, `motionOn()` | Claude |
| `src/content/combat.js` | 카드(`CARDS`)·카드 문구·적 종류·적 패턴·구역(`STAGES`)·사지 정의 | Claude |
| `src/content/items.js` | 아이템·등급·가방 크기·전리품 표 | Claude |
| `src/content/classes.js` | 직업(생존자·술사·광인)과 특성 | Claude |
| `src/legacy/game.js` | 컨트롤러. 규칙 호출 순서, 턴 흐름, 모달, 이벤트 → 연출 연결(`present()`), 의미용 DOM 생성 | 공유 |
| `src/boot/preload.js` | 그림 선로딩. 전투 그림·카드 그림은 필수로 받고, 카드 그림은 디코딩해 들고 있다가 복제해 쓴다 | 공유 |
| `src/render/battle-view.js` | 전투 장면(Pixi). 배경·인물·적·이펙트·입자·빛·카메라. `state`는 읽기만 | Codex |
| `src/ui/engine-ui.js` | 게임 UI(Pixi). 상단 정보·손패·모달·가방·툴팁. 자세한 건 `ENGINE_UI.md` | Codex |
| `src/ui/icons.js` | 공용 SVG 아이콘 | Codex |
| `src/ui/card-metrics.js`, `src/ui/body-diagram.js` | 카드 수치 줄, 신체 도식 | Codex |
| `src/art/assets.js` | 그림 경로와 로딩된 Image, 생존자 그림 고르기(`heroSprite`) | Codex |
| `src/audio/engine.js`, `samples.js`, `music.js` | 효과음(Web Audio)·샘플·배경음악(`<audio>`) | Codex |
| `src/styles/*.css` | 남은 DOM 스타일 | Codex |
| `tools/check-content.mjs` | 콘텐츠 정합성 검사 (`npm run check`) | Claude |
| `tools/simulate.mjs` | 봇 시뮬레이션 (`npm run sim`) | Claude |
| `tools/smoke/serve.mjs`, `drive.mjs` | 스모크: Vite 서버(:8123) + 헤드리스 Chrome으로 새 게임·카드·턴 종료 | Claude |
| `tools/smoke/shots.mjs` | 1920×1080 화면 캡처, `fx` 모드는 연출별 1/6 속도 캡처 | Claude |

## 데이터 흐름
```
입력(Pixi UI) → game.js 컨트롤러 → rules.*(state 변경, 이벤트 반환)
                                  → present(events) → battle.*(전투 장면 연출) · Sound.* · 로그
                                  → render() → 의미용 DOM → engine-ui가 읽어 Pixi로 그림
```
- 규칙은 `combat-rules.js`에만 있다. 화면 쪽은 `state`를 읽기만 한다.
- 생존자 그림은 `rules.heroAppearance(state)` → `{ classId, injury }`로 고른다.
- 좌표(`geometry`/`enemyPosition`/`partPosition`)는 `game.js`가 계산해서 전투 장면에 넘긴다.

## `state` 필드 (`createState`)
| 필드 | 뜻 |
|---|---|
| `classId` | 직업 |
| `bag` | 가방 격자 크기 |
| `hp`, `maxHp` | 체력 |
| `energy` | 행동력 |
| `block` | 방어도 (내 턴 시작에 0) |
| `noise` | 소음. 6 이상이면 턴 종료 시 증원, 적 턴 끝마다 −1 |
| `infection` | 감염. 2마다 턴 시작 체력 −1, 8 이상 고열(행동력 −1) |
| `strength` | 이번 전투 공격 보너스 |
| `stage` | 현재 구역 인덱스 (`STAGES`) |
| `turn` | 전투 내 턴 수 |
| `drawPenalty`, `grabbed` | 붙잡힘: 다음 턴 / 이번 턴 드로우 감소 |
| `numb` | 진통제: 이번 턴 부상 무시 |
| `smoke` | 연막: 남은 적 턴 수, 적 공격 한 번마다 25% 회피 |
| `pending` | 예약 주문 목록 |
| `phase` | `combat` / `playing`(카드 사용 중) / `resolving`(적 행동·예약 주문) / `reward` / `over` |
| `target`, `selected` | 현재 대상 적, 선택한 카드 |
| `limbs`, `permanentLimbs` | 사지 부상, 영구 부상(술사의 팔) |
| `skills`, `inventory`, `equipment` | 스킬 카드, 가방 아이템, 손 장비 |
| `deck`, `draw`, `hand`, `discard`, `exhausted` | 카드 더미 |
| `enemies` | 적 목록 |
| `logs` | 로그 |

## 이벤트 타입
규칙이 내보내는 이벤트. `present()`의 `switch`가 각 연출을 정한다.

| 이벤트 | 뜻 |
|---|---|
| `draw` | 카드 뽑음 |
| `hit` | 적에게 공격 적중 |
| `kill` | 적 처치 (`present()` 케이스 없음. 쓰러지는 연출은 `game.js`의 `cleanEnemies()`가 `battle.kill`로 부름) |
| `limb-broken` | 적 사지 파괴 |
| `stagger`, `stagger-resist` | 경직 / 경직 저항 |
| `enemy-block`, `enemy-guard` | 적 방어도 흡수 / 적 방어 |
| `enemy-buff` | 적 힘 올리기 |
| `enemy-scream` | 적 울부짖기(소음 증가) |
| `enemy-summon` | 적 소환 |
| `enemy-regen` | 적 재생 |
| `enemy-skip` | 경직으로 행동 없음 |
| `reinforce` | 소음으로 증원 합류 |
| `player-hit` | 생존자 피격 |
| `evade` | 동전 판정으로 회피 |
| `smoke-evade` | 연막으로 회피 |
| `grab` | 붙잡힘 |
| `limb-injured` | 생존자 사지 훼손 |
| `infection-tick`, `fever` | 감염 피해 / 고열 |
| `item-depleted` | 소모품 소진 |
| `backfire` | 자해 피해 |
| `gamble-win`, `gamble-lose` | 도박 카드 결과 (컨트롤러 발생) |
| `discard-hand` | 손패 버림 |
| `spell-queued`, `spell-resolve` | 예약 주문 걸기 / 발동 |
| `skill` | 스킬 사용 결과 |
| `log` | 로그만 |

## 검증
- `npm run check` — 콘텐츠 정합성
- `npm run sim` — 봇 시뮬레이션이 예외 없이 끝나는지
- `npm run build`
- `npm run smoke:serve` + `npm run smoke` — 헤드리스 Chrome 흐름 검사 (예외 0, 캔버스 갱신)
- `node tools/smoke/shots.mjs 0 fx` — 연출 프레임 캡처
