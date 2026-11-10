// NODE_PATH=/path/to/node_modules CHROMIUM_PATH=/path/to/chromium node tests/exhaustion-browser-v10.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = process.env.SCREENSHOT_DIR || path.resolve(root, '../combat-verification');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  try { const file = path.join(root, pathname === '/' ? 'index.html' : pathname); response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); response.end(fs.readFileSync(file)); }
  catch { response.statusCode = 404; response.end(); }
});

async function verify(browser, base, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.waitForFunction(() => window.CharacterRoster);
  const id = await page.evaluate(() => {
    CharacterState.update(s => {
      s.character.name = 'Combat test'; s.character.level = 8;
      s.character.abilities = { STR: 16, DEX: 18, CON: 14, INT: 16, WIS: 12, CHA: 10 };
      s.character.gear.weapons = [
        { id: 'sword', name: 'Longsword +1', itemType: 'weapon', location: 'equipped', damage: '1d8', damageType: 'Slashing' },
        { id: 'dagger', name: 'Dagger', itemType: 'weapon', properties: ['Finesse'], location: 'equipped', damage: '1d4', damageType: 'Piercing' },
        { id: 'greatsword', name: 'Greatsword +2', itemType: 'weapon', location: 'equipped', damage: '2d6', damageType: 'Slashing' },
        { id: 'bow', name: 'Longbow', itemType: 'weapon', category: 'Martial Ranged Weapon', location: 'equipped', damage: '1d8', damageType: 'Piercing' }
      ];
    });
    return CharacterRoster.activeId();
  });
  const go = async pageId => {
    await page.locator(`#pageDots [data-page-dot="${pageId}"]`).click();
    await page.waitForFunction(id => {
      const tabs = [...document.querySelectorAll('#pageDots [data-page-dot]')], pager = document.querySelector('#pager');
      return Math.abs(pager.scrollLeft - pager.clientWidth * tabs.findIndex(tab => tab.dataset.pageDot === id)) < 1;
    }, pageId);
  };
  await page.locator('[data-exhaustion-adjust="1"]').click(); await page.locator('[data-exhaustion-adjust="1"]').click();
  assert.match(await page.locator('#characterPage .exhaustion-notice').innerText(), /D20 Tests -4/);
  assert.match(await page.locator('[data-stat-detail="speed"]').innerText(), /20 ft/);
  await page.locator('#characterPage [data-stat-detail="exhaustion"]').click();
  assert.match(await page.locator('#statBody').innerText(), /Death Saves/); await page.locator('#statDialog [value="cancel"]').click();
  await go('actionsPage');
  const sword = page.locator('[data-search-anchor="action:weapon:sword"]');
  assert.match(await sword.locator('.action-numbers').innerText(), /HIT \+3/);
  assert.match(await sword.locator('.action-numbers').innerText(), /DMG 1d8\+4/);
  await sword.locator('[data-action-toggle]').click(); await sword.locator('.attack-breakdown summary').click();
  assert.match(await sword.locator('.attack-breakdown').innerText(), /Exhaustion\s+-4/);
  const line = page.locator('[data-search-anchor="action:line-attack"]');
  assert.match(await line.innerText(), /CHOOSE MELEE WEAPON/);
  await line.locator('[data-action-toggle]').click();
  assert.equal(await line.locator('[data-feature-weapon] option[value="bow"]').count(), 0);
  await line.locator('[data-feature-weapon]').selectOption('greatsword');
  assert.match(await line.locator('.feature-facts').innerText(), /FIRST HIT\s+2d6\+5 Slashing/);
  assert.match(await line.locator('.feature-facts').innerText(), /LATER HITS\s+1d6 Slashing/);
  assert.match(await line.locator('.action-numbers').innerText(), /HIT \+4/);
  await page.evaluate(() => CharacterState.update(s => { s.character.level = 11; }));
  assert.match(await line.locator('.feature-facts').innerText(), /1d6 or 1d10 Slashing/);
  await go('featuresPage'); await page.locator('#featureSearch').fill('Line Attack');
  const feature = page.locator('[data-search-anchor="feature:line-attack"]');
  if (!await feature.locator('[data-feature-weapon]').isVisible()) await feature.locator('[data-feature-toggle="line-attack"]').click();
  assert.equal(await feature.locator('[data-feature-weapon]').inputValue(), 'greatsword');
  await feature.locator('[data-feature-weapon]').selectOption('dagger'); await go('actionsPage');
  assert.match(await line.locator('.feature-facts').innerText(), /FIRST HIT\s+1d4\+4 Piercing/);
  await line.locator('[data-feature-weapon]').scrollIntoViewIfNeeded(); await page.waitForFunction(()=>!document.querySelector('.toast'));
  await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-line-attack.png`) });
  await page.reload(); await page.waitForFunction(() => window.CharacterRoster);
  assert.equal(await line.locator('[data-feature-weapon]').inputValue(), 'dagger');
  await page.evaluate(() => CharacterRoster.create('Second profile', 'occultist'));
  assert.equal(await page.evaluate(() => CharacterState.get().character.exhaustion), 0);
  await page.evaluate(id => CharacterRoster.switchTo(id), id);
  assert.equal(await page.evaluate(() => CharacterState.get().character.exhaustion), 2);
  await go('characterPage'); await page.evaluate(() => CharacterCommands.setHpCurrent(0));
  assert.match(await page.locator('.death-saves-panel').innerText(), /Death Save -4/);
  await page.locator('#deathSaveRoll').fill('13'); await page.locator('[data-death-record]').click();
  assert.equal(await page.evaluate(() => CharacterState.get().character.deathSaves.failures), 1);
  await page.locator('#deathSaveRoll').fill('14'); await page.locator('[data-death-record]').click();
  assert.equal(await page.evaluate(() => CharacterState.get().character.deathSaves.successes), 1);
  await page.locator('[data-death-natural="20"]').click();
  assert.equal(await page.evaluate(() => CharacterState.get().character.hp.current), 1);
  // Spell attacks refresh on Character, Spells, Features and Actions from the same state.
  await page.evaluate(() => {
    CharacterRoster.create('Spell test', 'occultist');
    CharacterState.update(s => {
      s.character.level = 8; s.character.abilities.INT = 16;
      s.classes.occultist.spells.push({ id: 'test-fire-bolt', added: true, prepared: true, definition: {
        id: 'test-fire-bolt', name: 'Test Fire Bolt', level: 0, time: 'Action', attack: 'Ranged Spell Attack', damage: '1d10 Fire', range: '120 ft.', desc: 'Make a ranged spell attack.'
      } });
    });
  });
  const baseline = await page.evaluate(() => CharacterDerived.spellAttack());
  await page.locator('[data-exhaustion-adjust="1"]').click();
  const spellAttack = page.locator('[data-occult-combat-stat]').filter({ hasText: 'SPELL ATTACK' });
  assert.match(await spellAttack.innerText(), new RegExp(`\\+${baseline - 2}`));
  await go('actionsPage');
  const spell = page.locator('.occult-action-row').filter({ hasText: 'Test Fire Bolt' });
  assert.match(await spell.locator('.action-numbers').innerText(), new RegExp(`HIT \\+${baseline - 2}`));
  await spell.locator('.attack-breakdown summary').click(); assert.match(await spell.locator('.attack-breakdown').innerText(), /Exhaustion\s+-2/);
  await go('spellsPage'); const spellCard = page.locator('.spell-row').filter({ hasText: 'Test Fire Bolt' });
  await spellCard.locator('summary').click(); assert.match(await spellCard.locator('.spell-current-facts').innerText(), new RegExp(`ATTACK\\s+\\+${baseline - 2}`));
  await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-spell-attack.png`) });
  await go('characterPage'); await page.locator('[data-exhaustion-adjust="-1"]').click();
  await go('actionsPage'); assert.match(await spell.locator('.action-numbers').innerText(), new RegExp(`HIT \\+${baseline}`));
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal viewport overflow');
  await context.close(); console.log(`${mobile ? 'mobile' : 'desktop'}: Exhaustion, attack details, weapon choice, Features/Actions sync, equipment/level math, reload, profile isolation, Death Saves and spell attacks passed`);
}

(async () => {
  fs.mkdirSync(output, { recursive: true }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try { const base = process.env.APP_URL || `http://127.0.0.1:${server.address().port}/`; await verify(browser, base, false); await verify(browser, base, true); }
  finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
