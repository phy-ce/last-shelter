# Native engine UI

`src/ui/engine-ui.js` owns visible gameplay UI: HUD, enemy readouts, hand,
menus, inventory slots, cards, tooltip panels, settings controls and coin motion.
Pixi Graphics/Text/Sprite/NineSliceSprite draw it; Pixi federated events and
`@pixi/ui` components handle input. Toolbar flex layout uses `@pixi/layout`.

## Templates and assets

- Shared card template: frame, art, title, AP, metric icons, effect, uses and back.
- Shared skinned panel/button template: native background and a 9-slice border.
- Frames and divider: [Kenney Fantasy UI Borders](https://kenney.nl/assets/fantasy-ui-borders), CC0. Original license is retained with the selected assets.
- Icons: the project's existing Tabler SVG set; vector geometry is rasterized as
  individual Pixi textures, not as HTML screenshots.

The hand rests below the battlefield. Only mouse hover or keyboard selection
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
