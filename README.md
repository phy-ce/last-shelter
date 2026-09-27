# Last Shelter

Originally migrated from the single-file demo `라스트셸터_사지와코인토스_사운드통합.html`.
The one-shot migration scripts (`tools/split-demo.mjs`, `tools/modularize-demo.mjs`) are kept for
reference only — running them would overwrite the hand-edited `index.html`, `src/legacy/game.js` and
`src/styles/game.css`. They are no longer wired to any npm script.

## Run

`npm install` then `npm run dev`. `npm run check` validates content definitions.

Combat and preparation rules live in `src/core/combat-rules.js` and run without a browser:
`npm run sim [runs] [seed]` plays whole runs with a greedy bot and prints death-by-stage and card usage.
`src/legacy/game.js` only orchestrates animation timing and presents rule events.

Two AIs share this codebase; see `CLAUDE.md` / `AGENTS.md` for file ownership and the rules → presentation contract.

## Content rules

- Card numbers live only in `src/content/combat.js`. Skill/power cards declare an `effects(upgraded)`
  object (`block`, `heal`, `cure`, `noiseDown`, `strength`, `energy`, `draw`, `sound`); combat execution,
  hand summaries and the preparation-screen medkit all read from it. Do not hardcode numbers in `game.js`.
- Enemy behaviour for new enemy types is declared in `ENEMY_PATTERNS` (`cycle`, optional `part` + `broken`).

## Current game model

- A run owns permanent skill cards plus physical items, which live either in a grid bag
  (`state.bag`, 3x3) or in the survivor's two hands (`state.equipment`).
- Items occupy bag cells by kind: consumables and ammo 1x1, one-handed weapons 1x2, two-handed
  weapons 1x3, the riot shield 2x2. They can be rotated. A held weapon occupies no bag cell.
- Only a weapon held in hand contributes its cards; consumables work from inside the bag.
  Equipping is refused when the weapon it displaces has nowhere to go in the bag.
- The combat deck is rebuilt before every encounter from base skills, held-weapon cards and
  consumables that still have uses.
- A crowbar grants `패링` and `내려치기`; putting it back in the bag removes both cards next encounter.
- A medkit grants `응급 처치` and has three physical uses. At zero uses the item and its card vanish.
- Ordinary victory rewards are items/equipment; a reward that does not fit opens the bag screen so it
  can be placed, held or left behind. Direct card rewards are rare skill acquisitions.
- Rarity is communicated with border and glow. Rarity names stay in accessible labels, not on the card face.
- Card flavour text lives on the card back and is revealed by the 뒷면 chip in the deck and codex screens.

## Credits

Music: "Oppressive Gloom", "The Descent", "Volatile Reaction" — Kevin MacLeod (incompetech.com),
licensed under Creative Commons: By Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/).
Details: `public/assets/audio/music/CREDITS.md`. Sound effect licenses: `public/assets/audio/cc0/LICENSES.md`.
