// Run with Playwright installed: CHROMIUM_PATH=/path/to/chromium LILI_JSON_PATH=/path/to/Lili_169.json node tests/browser-v10.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const fixture = process.env.LILI_JSON_PATH || path.join(__dirname,'fixtures/Lili_169.json');
const output = process.env.SCREENSHOT_DIR || path.resolve(root,'../verification');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let servingRoot = root;
const server = http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const file=path.join(servingRoot,pathname==='/'?'index.html':pathname);
  try { response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file)); }
  catch {response.statusCode=404;response.end();}
});

async function verify(browser,base,mobile) {
  const name=mobile?'mobile':'desktop', errors=[];
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.waitForFunction(()=>window.CharacterRoster && window.CharacterOccultistUIV10);
  const original=await page.evaluate(()=>{
    CharacterState.update(state=>{state.character.name='Tazio';state.character.hp.current=7;state.character.bio.notes='Keep me';});
    return {id:CharacterRoster.activeId(),state:JSON.stringify(CharacterState.get())};
  });
  await page.locator('#charactersBtn').click();await page.locator('[data-import-open]').click();
  await page.locator('#importFile').setInputFiles(fixture);
  await page.waitForFunction(()=>CharacterState.get().character.name==='Lili' && !document.querySelector('#importDialog').open);
  assert.equal(await page.locator('#rosterList .roster-card').count(),2,'Open roster immediately refreshes');
  const first=await page.evaluate(()=>CharacterRoster.activeId());
  await page.locator('[data-import-open]').click();await page.locator('#importFile').setInputFiles(fixture);
  await page.waitForFunction(()=>CharacterRoster.list().length===3 && !document.querySelector('#importDialog').open);
  const second=await page.evaluate(()=>CharacterRoster.activeId());assert.notEqual(first,second);
  assert.equal(await page.locator('#rosterList .roster-card').count(),3);
  await page.locator('#charactersDialog [value="cancel"]').click();
  await page.evaluate(()=>CharacterCommands.adjustOccultistSlot(1,-2));
  await page.waitForFunction(()=>!!document.querySelector('#actionsPage [data-occult-cast="predurceni"]'));
  assert.equal(await page.locator('#actionsPage [data-occult-cast="mage-armor"]').count(),0);
  assert.equal(await page.locator('#actionsPage [data-occult-cast="blade-ward"]').count(),1);
  await page.evaluate(()=>CharacterCommands.setUi('pageId','spellsPage'));
  await page.locator('#occSpellSearch').pressSequentially('Mage');
  assert.equal(await page.locator('#occSpellSearch').inputValue(),'Mage');
  assert.equal(await page.locator('#occSpellSearch').evaluate(node=>document.activeElement===node),true);
  await page.locator('#occSpellSearch').fill('');
  await page.locator('#spellsPage .spell-row').filter({has:page.locator('[data-occult-prepare="predurceni"]')}).locator('summary').click();
  await page.locator('#spellsPage [data-occult-prepare="predurceni"]').click();
  await page.waitForFunction(()=>!document.querySelector('#actionsPage [data-occult-cast="predurceni"]'));
  const mage=page.locator('#spellsPage .spell-row').filter({has:page.locator('[data-occult-prepare="mage-armor"]')});
  await mage.locator('summary').click();await mage.locator('[data-occult-prepare]').click();
  await page.waitForFunction(()=>!!document.querySelector('#actionsPage [data-occult-cast="mage-armor"]'));
  await page.evaluate(()=>CharacterCommands.completeOccultistDawn());
  assert.equal(await page.locator('#actionsPage [data-occult-cast="mage-armor"]').count(),1);
  await page.evaluate(id=>CharacterRoster.switchTo(id),first);
  assert.equal(await page.locator('#actionsPage [data-occult-cast="mage-armor"]').count(),0);
  await page.evaluate(id=>CharacterRoster.switchTo(id),original.id);
  assert.equal(await page.evaluate(()=>JSON.stringify(CharacterState.get())),original.state);
  await page.locator('#charactersBtn').click();await page.locator(`[data-roster-duplicate="${original.id}"]`).click();
  assert.equal(await page.locator('#rosterList .roster-card').count(),4);
  assert.equal(await page.evaluate(()=>CharacterState.get().character.name),'Tazio Copy');
  await page.locator('#charactersDialog [value="cancel"]').click();
  await page.evaluate(id=>CharacterRoster.switchTo(id),second);
  await page.evaluate(()=>CharacterCommands.setUi('pageId','actionsPage'));
  await page.waitForFunction(()=>!!document.querySelector('#actionsPage .weapon-tag'));
  assert.match(await page.locator('#actionsPage').innerText(),/RANGE 5 ft\. · Thrown 20\/60 ft\./);
  assert.match(await page.locator('#actionsPage').innerText(),/Piercing/);
  await page.locator('#actionsPage .weapon-tag').filter({has:page.locator('summary',{hasText:'Finesse'})}).locator('summary').click();
  assert.match(await page.locator('#actionsPage .weapon-tag[open]').innerText(),/STR or DEX/);
  await page.evaluate(()=>document.querySelector('#toastHost').replaceChildren());
  await page.screenshot({path:path.join(output,`${name}-actions.png`)});
  await page.evaluate(()=>{CharacterCommands.setUi('pageId','characterPage');CharacterCommands.setHpCurrent(0);});
  await page.locator('[data-death-save="successes"][data-count="1"]').click();
  assert.equal(await page.evaluate(()=>CharacterState.get().character.deathSaves.successes),1);
  await page.locator('[data-death-natural="1"]').click();
  assert.equal(await page.evaluate(()=>CharacterState.get().character.deathSaves.failures),2);
  await page.locator('.death-saves-panel').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,`${name}-death-saves.png`)});
  await page.locator('[data-death-natural="20"]').click();
  assert.equal(await page.locator('.death-saves-panel').count(),0);
  assert.equal(await page.evaluate(()=>CharacterState.get().character.hp.current),1);
  await page.evaluate(()=>CharacterCommands.setUi('pageId','gearPage'));
  await page.locator('[data-money-open]').click();
  const before=await page.evaluate(()=>CharacterState.get().character.gear.currencyWallets.generic.g);
  await page.locator('#moneyGDelta').fill('40');await page.locator('[name="moneyOperation"][value="add"]').click();
  assert.equal(await page.evaluate(()=>CharacterState.get().character.gear.currencyWallets.generic.g),before+40);
  await page.locator('#moneyGDelta').fill('40');await page.locator('[name="moneyOperation"][value="remove"]').click();
  assert.equal(await page.evaluate(()=>CharacterState.get().character.gear.currencyWallets.generic.g),before);
  await page.screenshot({path:path.join(output,`${name}-money.png`)});
  await page.locator('#moneyDialog [value="cancel"]').first().click();
  await page.evaluate(()=>document.querySelector('#importDialog').showModal());
  await page.locator('#importText').fill('\uFEFF{\u00a0"name":"Český šotek", "abilities":{"DEX":13}}');
  await page.locator('#applyImport').click();
  await page.waitForFunction(()=>CharacterState.get().character.name==='Český šotek');
  const count=await page.evaluate(()=>CharacterRoster.list().length);
  await page.evaluate(()=>document.querySelector('#importDialog').showModal());
  await page.locator('#importFile').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"name":')});
  await page.waitForFunction(()=>document.querySelector('#importReport').textContent.includes('incomplete'));
  assert.equal(await page.evaluate(()=>CharacterRoster.list().length),count);
  await page.locator('#importDialog [value="cancel"]').first().click();
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  const caches=await page.evaluate(()=>window.caches.keys());assert.deepEqual(caches,['character-sheet-v10-play-ready-5']);
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>window.CharacterState?.APP_VERSION==='10.1.5-play-ready');
  assert.equal(await page.evaluate(()=>CharacterState.get().character.name),'Český šotek');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'No horizontal overflow');
  assert.deepEqual(errors,[],'No browser runtime errors');
  await context.close();console.log(`${name}: import, repeat, roster, isolation, copy, Prepared, Dawn, weapons, Death Saves, money, BOM, errors and offline PWA passed`);
}

async function verifyUpgrade(browser,base) {
  const context=await browser.newContext(),page=await context.newPage();
  servingRoot=path.resolve(process.env.BASELINE_DIR);
  await page.goto(base);await page.waitForFunction(()=>window.CharacterRoster);
  await page.evaluate(()=>CharacterState.update(state=>{state.character.name='Tazio Upgrade';state.character.hp.current=7;}));
  const id=await page.evaluate(()=>CharacterRoster.activeId());
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  assert.ok((await page.evaluate(()=>caches.keys())).includes('character-sheet-v10-safe-profiles-2'));
  await page.evaluate(async()=>{const cache=await caches.open('another-app');await cache.put('/other-app',new Response('keep'));});
  servingRoot=root;
  await page.reload();await page.waitForFunction(()=>CharacterState.APP_VERSION==='10.1.5-play-ready');
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.includes('10.1.5'));
  await page.waitForFunction(async()=>!(await caches.keys()).includes('character-sheet-v10-safe-profiles-2'));
  const keys=await page.evaluate(()=>caches.keys());assert.ok(keys.includes('another-app'));assert.ok(keys.includes('character-sheet-v10-play-ready-5'));
  assert.equal(await page.evaluate(()=>CharacterRoster.activeId()),id);
  assert.equal(await page.evaluate(()=>CharacterState.get().character.hp.current),7);
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>CharacterState.APP_VERSION==='10.1.5-play-ready');
  assert.equal(await page.evaluate(()=>CharacterState.get().character.name),'Tazio Upgrade');
  await context.close();console.log('PWA upgrade: old cache removed, other app cache kept, Tazio preserved and new version works offline');
}

(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {const base=process.env.APP_URL||`http://127.0.0.1:${server.address().port}/`;await verify(browser,base,false);await verify(browser,base,true);if(process.env.BASELINE_DIR&&!process.env.APP_URL)await verifyUpgrade(browser,base);}
  finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
