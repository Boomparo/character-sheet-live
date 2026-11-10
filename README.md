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

## V10.2.1: English rules and compact feature families

- The built-in Treasure Hunter, Occultist, relic and science descriptions have complete English presentations. Stored source records, IDs, preparation, character names, custom content and notes retain their original values.
- Features defaults to grouped ability cards. Related rules and upgrades are nested inside the parent, passive/setup rules are collapsed, and starred families appear first. Overview, progression, active/passive filters and searches in English or original names share the same model for both classes.
- Current-character facts show relevant DCs, attack bonuses, damage/healing dice, Temporary HP, movement distances, preparation limits and remaining resources. Formulas annotate current level and ability modifiers. Unknown DM-set DCs are explicitly labelled.
- Search, favorites and filters remain character-specific. Full rules stay available in the card detail. English names also appear in Actions, Spells, Sciences, Relics, Builder and proficiency sources.
- All new presentation modules are precached for offline use. The version update preserves the existing character storage keys and schema.

Validation: `node --test tests/*.test.js`; `node tests/browser-v10.cjs`; `node tests/features-browser-v10.cjs` (the browser scripts require Playwright and optionally `CHROMIUM_PATH`). Feature browser checks cover desktop/mobile grouping, nested disclosure, original-name search, starred rules, complete English feature/science/spell/relic displays and current numbers. The main browser suite also verifies the V10.1.5 cache upgrade, import, character isolation and offline operation.

## V10.2.2: Exhaustion and weapon-based feature attacks

- Exhaustion applies once to weapon/spell attacks, custom numerical attacks, ability checks, skills, saves, Initiative and Death Saves. Damage, raw ability modifiers and Save DCs remain unchanged. Current penalties and calculation details are visible on Character and Actions. Level 6 is explicitly fatal and ordinary healing/rest cannot bypass it.
- Line Attack, Precision Slide and Daring Strike use a character-local weapon selection shared by Actions and Features. One eligible equipped weapon is selected automatically; multiple choices require an explicit selection. Later Line Attack hits use one weapon damage die without modifiers or magic bonuses; level 11 adds the Cool die option.
- Schema and storage keys are unchanged. Export/import, profile isolation, rest, Undo, cache upgrade and offline use are covered by regression tests.

Rules: [D&D 2024 Exhaustion](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#ExhaustionCondition); Treasure Hunter feature definitions in the supplied campaign source.
