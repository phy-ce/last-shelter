# UX rules

- Irreversible or scarce-resource actions never execute on the first card click.
- Irreversible choices do not have number-key shortcuts. Rewards, route commitment, treatment, and upgrade confirmation require an explicit pointer action or confirmation control.
- Upgrade screens use: select a card, inspect the before/after result, then press a separate confirmation button.
- Upgrade screens separate equipment and independent skills, keep before/after values visible without hover, and show the committed target in a fixed confirmation panel.
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
- Hand cards keep a 2.5:3.5 physical-card ratio in both resting and hover states. Hover never changes the card's height. Hover/focus reveals the complete playable effect in a fixed, readable panel above the left side of the hand. Selection pins that card's effect while aiming, even when the pointer crosses other cards; the panel updates the current target and predicted result and never intercepts targeting clicks. Use, cancellation, or a modal dismisses the preview.
- Combat effect numbers come from content definitions and rule calculations. Conditional coin effects, delayed effects, ammo costs, noise, and exhaust retain distinct visible markers; they are not removed merely to shorten a card.
- Rarity names remain in accessible labels. Detailed card summaries remain available to assistive technology.
- Flavour text is on the card back, behind the 뒷면 chip, so the face carries only what is needed to play.
- The bag is a grid the player drags items around: hand slots on the left, bag in the middle, discard and the selected item on the right. Legal and illegal drops are marked while dragging, and R rotates.
- Enemy intentions use distinct vector symbols. Hidden intentions never reveal the actual action or coin-danger styling.
- Body status uses an anatomical diagram plus named limb states. Injuries also use dashed outlines and explicit text, not color alone.
- Class traits remain visible before choosing a survivor. Starting skills disclose each card's cost and actual rule summary—not only its name—on hover or keyboard focus. Backstory and starting loadout use the same progressive disclosure.
- Character cards select on the first click and start the run only through a separate confirmation control. Clicking a portrait never starts immediately.
- Every between-battle action ends at mandatory preparation. Healing, upgrading, taking a skill, and armory results all flow through equipment and supply management before the next combat.
- During between-battle preparation, every owned consumable whose card defines persistent HP recovery or infection reduction can be used directly from the bag. This currently includes the medkit, antibiotics, painkillers, and tourniquet. The button and applied values come from the card's content definition, never duplicated UI constants.
- Preparation use consumes exactly one use and removes the item and its cards at zero uses. Combat-only portions such as block, energy, card draw, strength, noise control, and one-turn injury suppression do not carry into preparation; the button states only the persistent effect that will actually apply.
- A preparation recovery button remains visible but disabled when there is nothing to heal/cure or the survivor cannot use consumables, and it explains the reason. Incoming loot cannot be consumed before it is placed in the bag, and the combat inventory remains read-only.
- Preparation inventory tiles show consumable uses as current/maximum. The selected-item panel shows identity, provided cards, remaining uses, and the exact HP/infection change that would occur now before the use button.
- Coin-toss audio plays once, on the HEADS/TAILS choice click. Landing and result rendering do not replay the coin sample.
- The combat inventory is always reachable from the header or with `I`. It is read-only during combat so checking current equipment and supplies never changes combat state.
- Visual polish is in `src/styles/visual-polish.css`; shared symbols and read-only card display helpers live in `src/ui/`.
