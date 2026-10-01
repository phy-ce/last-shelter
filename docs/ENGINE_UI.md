# Native engine UI

`src/ui/engine-ui.js` owns the visible battle HUD, enemy readouts, hand and
simple menus. Pixi Graphics/Text/Sprite draw those surfaces; Pixi federated
events and `@pixi/ui` components handle input. Toolbar flex layout uses
`@pixi/layout`. Character selection, loot, inventory and coin judgment retain
their purpose-built DOM/CSS layouts instead of being flattened through the
generic Pixi modal renderer.

## Templates and assets

- Shared card template: frame, art, title, AP, metric icons, effect, uses and back.
- Shared procedural panel/button template: clipped rectangular silhouette, thin
  worn-metal outer line, faint inset line and restrained corner highlights.
- Frames and dividers are drawn directly with Pixi Graphics. UI box textures are
  not loaded at runtime; illustration and gameplay sprites remain image assets.
- Icons: the project's existing Tabler SVG set; vector geometry is rasterized as
  individual Pixi textures, not as HTML screenshots.

The coin judgment uses its original centered DOM layout and original eight-step
Web Animations toss/flip sequence. The controller still decides the outcome.
Status effects render as bare icon/value tokens without card-like boxes, and
temporary depletion/injury banners are drawn only while their `active` state is
present. Flat character ground-shadow ellipses are intentionally omitted.

The hand rests in a shallow, overlapping fan at the bottom center of the battlefield,
without a backing panel. Card count controls spacing and rotation; a single card
stays upright. Hover brings one card to the front, straightens it and scales it
to 106% around its bottom-center pivot. Hit testing
uses local rotated coordinates and front-to-back order, retaining the hovered
card over its original footprint to prevent oscillation during the lift.
Native control snapshots transform their centers through the card pivot/rotation.
Each card uses fixed vertical regions for illustration, a bordered source ribbon,
title, metrics, clipped rules text and footer metadata. Equipment and consumable
sources include both category and item name, so provenance never competes with
variable-length rules text.
Only mouse hover or keyboard selection
raises a card to show its effect below the art; mouse selection alone does not
keep it raised after the pointer leaves. Deck and codex cards flip by clicking
the card itself, with Enter/Space available for keyboard input.
Costs and intent values use an icon with a small lower-right number. Persistent
location titles, atmospheric menu headings, obvious click instructions and
footer logs are omitted from the native screen.

Enemy turns use a short presentation sequence: the native hand exits below the
viewport, a bottom narration panel identifies the acting enemy and describes its
current intent, and only then does the corresponding action animation resolve.
The enemy/action-specific copy lives in `src/content/enemy-dialogue.js`, separate
from combat resolution, so narration can be revised without touching rules.

## Controller boundary

The legacy controller still creates semantic nodes with its existing action
closures. The engine reads their labels, attributes and art, then invokes those
same actions. The nodes remain offscreen for accessibility and the existing
smoke driver. Native layout never reads their DOM bounding boxes or CSS sizes.
The WebGL initialization/loading fallback remains in HTML until the renderer is
available. This is a rendering/input migration, not removal of the DOM controller.

Inventory drag/drop delegates to existing `dropAt`, `equipRef`, `discardRef`;
placement hints call read-only `rules.canPlace`. The renderer does not write
inventory positions or combat state. Coin outcomes and their DOM animation stay
in the controller.

## Branching map prototype

The main game now opens `src/ui/route-map.js` after battle rewards, styled by
`src/styles/route-map.css` as a dedicated DOM map modal. Clicking a maintenance
or unknown encounter node previews only its name and atmosphere; a separate
travel button commits the choice. Maintenance offers treatment or upgrades.
Unknown encounters lead to a skill offer or coin-based equipment search; low
health excludes warehouse search. Both return through mandatory inventory
preparation before the next battle. Existing seven battle stages remain ordered;
only intermission destinations branch in this integration. Visited connections
are kept in a controller-side display record, separate from combat save state.

`/map-demo.html` opens a standalone interactive route mockup. `src/ui/map-demo.js`
draws a city plan and connected locations using SVG plus the shared icon set;
`src/styles/map-demo.css` lays out the map and destination details. Visited
locations are represented by map connections, without a separate text history.
It previews selecting and confirming destinations through seven steps, with
branches reconverging before a shared final boss. All route data and visited
locations are local to the demo; it does not alter run state, saves or combat.
Location descriptions here are design proposals. Destination details show only
the location name and atmospheric description; enemy groups, rewards and dangers
are not disclosed before arrival.
Maintenance locations combine treatment and equipment upgrades. Skill acquisition
and coin-based equipment offers are possible random encounters, not fixed
destination types. Encounter candidates stay hidden. Actual encounter selection
and maintenance actions are not implemented here.

## Review

Run `npm run build`, then `npm run smoke:serve` and `npm run smoke`. Inspect the
native UI at 1920×1080, including mouse card selection, context menu, modal close,
scrolling, settings and inventory. The smoke driver verifies controller flows;
it does not replace native pointer/visual QA.
