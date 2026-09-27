# UX rules

- Irreversible or scarce-resource actions never execute on the first card click.
- Irreversible choices do not have number-key shortcuts. Rewards, route commitment, treatment, and upgrade confirmation require an explicit pointer action or confirmation control.
- Upgrade screens use: select a card, inspect the before/after result, then press a separate confirmation button.
- Escape always returns to the immediately preceding preparation screen when that screen opened the current view.
- Combat information should use image icons and numbers before explanatory text; emoji are not production UI assets.
- The battlefield is the primary screen. Hand cards and combat HUD float over it rather than living in separate boxed rows.

## Presentation hierarchy

- Resting hand cards show illustration, name, cost, and effect icons with numbers; rarity reads from the border, not a printed mark. Hover, keyboard focus, or selection lifts the card and reveals complete effect text and its source.
- Combat effect numbers come from content definitions and rule calculations. Conditional coin effects, delayed effects, ammo costs, noise, and exhaust retain distinct visible markers; they are not removed merely to shorten a card.
- Rarity names remain in accessible labels. Detailed card summaries remain available to assistive technology.
- Flavour text is on the card back, behind the 뒷면 chip, so the face carries only what is needed to play.
- The bag is a grid the player drags items around: hand slots on the left, bag in the middle, discard and the selected item on the right. Legal and illegal drops are marked while dragging, and R rotates.
- Enemy intentions use distinct vector symbols. Hidden intentions never reveal the actual action or coin-danger styling.
- Body status uses an anatomical diagram plus named limb states. Injuries also use dashed outlines and explicit text, not color alone.
- Class traits remain visible before choosing a survivor. Backstory and starting loadout are disclosed on hover or keyboard focus.
- Visual polish is in `src/styles/visual-polish.css`; shared symbols and read-only card display helpers live in `src/ui/`.
