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
