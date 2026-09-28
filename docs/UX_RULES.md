# UX rules

- Irreversible or scarce-resource actions never execute on the first card click.
- Irreversible choices do not have number-key shortcuts. Rewards, route commitment, treatment, and upgrade confirmation require an explicit pointer action or confirmation control.
- Upgrade screens use: select a card, inspect the before/after result, then press a separate confirmation button.
- Escape always returns to the immediately preceding preparation screen when that screen opened the current view.
- Combat information should use image icons and numbers before explanatory text; emoji are not production UI assets.
- The battlefield is the primary screen. Hand cards and combat HUD float over it rather than living in separate boxed rows.
- Canonical visual QA is always performed at 1920×1080 and 100% browser zoom. Smaller viewports are secondary responsive checks, never the acceptance viewport.
- Default surfaces retain only information needed for the current decision. Rule explanations, sources, flavour, and edge cases live in the codex or hover/focus disclosure.
- Reuse shared SVG icons for recurring concepts. Do not duplicate the same meaning as a full label when icon plus value is sufficient.

## Presentation hierarchy

- Visual language: near-black negative space, thin worn-metal rectangular frames, bone-grey text, restrained oxblood selection, desaturated art, and serif display type. Avoid glossy modern cards, large rounded panels, pill controls, and bright gold fills.
- Reference imagery informs presentation only. Do not copy its party systems, mind gauges, resistances, formation mechanics, or menu structure into game rules.

- Resting hand cards keep a compact physical-card proportion and stay below the battlefield. Hover and keyboard focus only lift them slightly; they never grow into the enemy targeting area. Number keys select a card, and right-click opens its complete effect and source in a dedicated detail view.
- Combat effect numbers come from content definitions and rule calculations. Conditional coin effects, delayed effects, ammo costs, noise, and exhaust retain distinct visible markers; they are not removed merely to shorten a card.
- Rarity names remain in accessible labels. Detailed card summaries remain available to assistive technology.
- Flavour text is on the card back, behind the 뒷면 chip, so the face carries only what is needed to play.
- The bag is a grid the player drags items around: hand slots on the left, bag in the middle, discard and the selected item on the right. Legal and illegal drops are marked while dragging, and R rotates.
- Enemy intentions use distinct vector symbols. Hidden intentions never reveal the actual action or coin-danger styling.
- Body status uses an anatomical diagram plus named limb states. Injuries also use dashed outlines and explicit text, not color alone.
- Class traits remain visible before choosing a survivor. Starting skills disclose each card's cost and actual rule summary—not only its name—on hover or keyboard focus. Backstory and starting loadout use the same progressive disclosure.
- The combat inventory is always reachable from the header or with `I`. It is read-only during combat so checking current equipment and supplies never changes combat state.
- Visual polish is in `src/styles/visual-polish.css`; shared symbols and read-only card display helpers live in `src/ui/`.
