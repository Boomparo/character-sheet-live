# Treasure Hunter Character Sheet V9

Android-first static PWA for a homebrew Treasure Hunter / Occult Collector D&D character.

V9 is a stabilization release. The loaded application has one canonical state store, one derived-stat module, one command layer and one renderer owner for each page. The older V7/V8 scripts remain in the repository for history and rollback, but `index.html` does not load their patch runtime.

## Runtime ownership

- `js/core/state-v9.js` — schema 11, safe V7 migration and persistence
- `js/core/origin-v9.js` — campaign species and background source data
- `js/core/derived-v9.js` — AC, HP maximum, saves, skills, DCs, speed, defenses and attacks
- `js/core/commands-v9.js` — all gameplay and editing state changes
- `js/ui/app-v9.js` — Character, Actions, Skills, Features, Relics, Gear and NPC/Bio renderers
- `js/classes/treasure-hunter/content-v9.js` — exact feature/relic labels from the supplied final V8 rules DOCX

Existing `character-sheet-v7s` and `character-sheet-v7s-roster` localStorage values are copied into new V9 keys on first use. The legacy keys are not deleted or overwritten.

## Validation

```sh
node --test tests/*.test.js
```

The test suite covers migrations, HP defense order, automatic AC, locked roll modes, shared relic charges, origin mechanics, source names and the loaded-script architecture.

## 10.1.3–10.1.4 patch notes

- Duplicate creates a separate character and leaves both entries visible in the roster.
- All JSON imports append new profiles with new IDs, including complete roster backups and repeated imports.
- The open character list refreshes immediately after every successful import.
- Failed storage writes abort duplication/import without changing the active character. Backups remain available when storage is full.
- Each open tab saves to its own character ID. Portraits are no longer stored twice inside each new roster entry.
- Regression tests cover profile isolation, reloads, imported ID collisions, full storage and multiple tabs.

## V10.1.5

- JSON file import reads UTF-8 explicitly, accepts BOM and Unicode separators outside strings, reports file/encoding/syntax/shape errors, and lets the same file be selected again. Every successful import still appends a new independent profile. The supplied Lili export is valid JSON and already imports on a clean V10.1.4 session; its reported original file failure was not reproducible there.
- One Occultist spell eligibility provider drives Actions, search/tactics and casting. Unprepared or unavailable spells stay out of Actions, as do leveled spells without a remaining slot. Selected cantrips do not need preparation. Oživení golema is always prepared and excluded from the daily limit, according to Occultist.pdf.
- Prepared flags survive legacy/native import and remain isolated between characters. Spell filters and experiment selections belong to each character.
- Weapon attacks and Gear details show melee/thrown/ranged distance and damage type. Property tags expand explanations for Finesse, Light, Thrown, Reach, Loading, Ammunition, Heavy, Two-Handed, Versatile and Masteries. Treasure Hunter's 15-ft. whip reach stays class-specific.
- Rules descriptions display English D&D mechanics while retaining the complete stored source text and feature names.
- At 0 HP, Death Saves provide three success/failure markers, Natural 1/20, stabilization and Undo. Healing clears counters; damage at 0 HP adds failures, Critical Hits add two, and massive damage causes death. Prone remains after waking up.
- Money accepts positive G/S/C quantities with Add/Remove. Removing more coins than an account holds is rejected as a whole, with no partial subtraction.
- Updated PWA assets and cache preserve stored characters, remove only previous character-sheet caches and work offline.

Additional validation:

```sh
# Optional: use the exact attachment, including its portrait.
LILI_JSON_PATH=/path/to/Lili_169.json node --test tests/*.test.js
# Install Playwright separately, or use an existing installation.
CHROMIUM_PATH=/path/to/chromium LILI_JSON_PATH=/path/to/Lili_169.json node tests/browser-v10.cjs
# BASELINE_DIR can point to a V10.1.4 checkout to test a live service-worker upgrade.
```

`tests/fixtures/Lili_169.json` preserves the supplied legacy data with portrait artwork omitted. The full original attachment was also verified with `LILI_JSON_PATH`. Death Save and weapon property behavior follows the 2024 [Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) and [Equipment](https://www.dndbeyond.com/sources/dnd/br-2024/equipment) rules.
