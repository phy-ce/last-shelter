# Native engine UI

`src/ui/engine-ui.js` owns visible gameplay UI: HUD, enemy readouts, hand,
menus, inventory slots, cards, tooltip panels, settings controls and coin motion.
Pixi Graphics/Text/Sprite draw it; Pixi federated events and
`@pixi/ui` components handle input. Toolbar flex layout uses `@pixi/layout`.

## Templates and assets

- Shared card template: frame, art, title, AP, metric icons, effect, uses and back.
- Shared procedural panel/button template: clipped rectangular silhouette, thin
  worn-metal outer line, faint inset line and restrained corner highlights.
- Frames and dividers are drawn directly with Pixi Graphics. UI box textures are
  not loaded at runtime; illustration and gameplay sprites remain image assets.
- Icons: the project's existing Tabler SVG set; vector geometry is rasterized as
  individual Pixi textures, not as HTML screenshots.

The coin judgment uses its own compact centered layout instead of the generic
modal flow: title, dark toss stage, coin, outcome stakes and choice controls stay
in one vertical reading path. The controller still decides the outcome, and the
existing GSAP toss/flip timing is unchanged.

The hand rests in a shallow, overlapping fan at the bottom center of the battlefield,
without a backing panel. Card count controls spacing and rotation; a single card
stays upright. Hover brings one card to the front, straightens it and scales it
to 106% around its bottom-center pivot. Hit testing
uses local rotated coordinates and front-to-back order, retaining the hovered
card over its original footprint to prevent oscillation during the lift.
Native control snapshots transform their centers through the card pivot/rotation.
Only mouse hover or keyboard selection
raises a card to show its effect below the art; mouse selection alone does not
keep it raised after the pointer leaves. Deck and codex cards flip by clicking
the card itself, with Enter/Space available for keyboard input.
Costs and intent values use an icon with a small lower-right number. Persistent
location titles, atmospheric menu headings, obvious click instructions and
footer logs are omitted from the native screen.

## Controller boundary

The legacy controller still creates semantic nodes with its existing action
closures. The engine reads their labels, attributes and art, then invokes those
same actions. The nodes remain offscreen for accessibility and the existing
smoke driver. Native layout never reads their DOM bounding boxes or CSS sizes.
The WebGL initialization/loading fallback remains in HTML until the renderer is
available. This is a rendering/input migration, not removal of the DOM controller.

Inventory drag/drop delegates to existing `dropAt`, `equipRef`, `discardRef`;
placement hints call read-only `rules.canPlace`. The renderer does not write
inventory positions or combat state. Coin outcomes stay in the controller; only
the visible animation moves to GSAP/Pixi.

## Review

Run `npm run build`, then `npm run smoke:serve` and `npm run smoke`. Inspect the
native UI at 1920×1080, including mouse card selection, context menu, modal close,
scrolling, settings and inventory. The smoke driver verifies controller flows;
it does not replace native pointer/visual QA.
