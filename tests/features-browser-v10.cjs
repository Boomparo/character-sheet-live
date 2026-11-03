const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=process.env.SCREENSHOT_DIR||path.resolve(root,'../feature-verification');
const server=http.createServer((q,r)=>{const p=new URL(q.url,'http://localhost').pathname,f=path.join(root,p==='/'?'index.html':p);try{r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');r.end(fs.readFileSync(f));}catch{r.statusCode=404;r.end();}});
const czech=/[ěščřžýáíéůúďťň]/i;
async function check(browser,base,mobile){
  const errors=[],context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>window.CharacterFeatureUI);
  const set=async(cls,level)=>page.evaluate(({cls,level})=>{
    const s=CharacterState.fresh();s.character.classKey=cls;s.character.level=level;s.character.name=cls==='occultist'?'Occultist QA':'Hunter QA';s.character.abilities.DEX=16;s.character.abilities.INT=14;
    s.classes.treasureHunter.choices.subclass='Occult Collector';s.classes.treasureHunter.choices.subclassConfirmed=true;
    s.ui.pageId='featuresPage';CharacterState.replace(s);
  },{cls,level});
  await set('treasureHunter',8);
  const visible=await page.locator('#featuresPage [data-feature-family]:visible').count();assert.ok(visible<=10,'Overview keeps passive rules and child upgrades collapsed');
  assert.equal(await page.locator('#featuresPage [data-feature-toggle="precision-slide"]:visible').count(),0);
  await page.locator('[data-feature-toggle="indy-maneuvers"]').click();
  assert.equal(await page.locator('[data-feature-toggle="indy-slide"]:visible').count(),1);
  assert.equal(await page.locator('[data-feature-toggle="precision-slide"]:visible').count(),0,'Children of a closed nested card stay collapsed');
  await page.locator('[data-feature-toggle="indy-slide"]').click();
  await page.locator('[data-feature-toggle="attack-slide"]').click();
  await page.locator('[data-feature-toggle="precision-slide"]').click();
  assert.match(await page.locator('[data-search-anchor="feature:precision-slide"]>.row-detail').innerText(),/1d8/);
  await page.locator('.feature-passive-section>summary').click();
  await page.locator('[data-feature-toggle="adventurer-through-and-through"]').click();
  assert.equal(await page.locator('.feature-passive-section').evaluate(node=>node.open),true);
  await page.locator('.feature-passive-section>summary').click();
  assert.equal(await page.locator('.feature-passive-section').evaluate(node=>node.open),false);
  await page.locator('#featureSearch').fill('Přesný skluz');
  assert.equal(await page.locator('#featureSearch').evaluate(node=>document.activeElement===node),true);
  assert.equal(await page.locator('[data-feature-toggle="precision-slide"]:visible').count(),1);
  assert.match(await page.locator('[data-feature-toggle="precision-slide"]').innerText(),/Precision Slide/);
  await page.locator('#featureSearch').fill('Narrow Escape');
  assert.match(await page.locator('[data-search-anchor="feature:narrow-escape"] .feature-facts').innerText(),/1d8\+11/);
  await page.locator('[data-feature-favorite="narrow-escape"]').click();
  await page.locator('#featureSearch').fill('');
  assert.match(await page.locator('#featuresPage').innerText(),/Starred/);
  await page.locator('#featureFilter').selectOption('favorites');
  assert.equal(await page.locator('#featuresPage [data-feature-family]:visible').count(),1);
  await page.locator('#featureFilter').selectOption('all');
  await page.locator('#searchBtn').click();await page.locator('#globalSearch').fill('Precision Slide');
  const match=page.locator('#globalSearchResults .search-result').filter({has:page.locator('small',{hasText:'FEATURE'})}).filter({has:page.locator('strong',{hasText:/^Precision Slide$/})});
  await match.click();await page.locator('[data-search-anchor="feature:precision-slide"]>.row-detail').waitFor({state:'visible'});
  await page.locator('[data-feature-toggle="indy-maneuvers"]').click();
  assert.equal(await page.locator('[data-feature-toggle="precision-slide"]:visible').count(),0);
  await page.evaluate(()=>{CharacterCommands.setUi('featureSearch','');CharacterState.update(s=>{s.ui.openFeatures=[];});document.querySelector('#toastHost').replaceChildren();});
  await page.screenshot({path:path.join(output,`${mobile?'mobile':'desktop'}-features-overview.png`)});
  for(const cls of ['treasureHunter','occultist']){
    await set(cls,cls==='occultist'?12:20);
    await page.evaluate(()=>{CharacterCommands.setUi('featureView','progression');CharacterState.update(s=>{s.ui.openFeatures=CharacterFeatureLibrary.records(s).map(f=>f.id);});});
    assert.doesNotMatch(await page.locator('#featuresPage').innerText(),czech,`${cls}: all feature descriptions are English`);
    const cards=await page.evaluate(()=>[...document.querySelectorAll('#featuresPage .feature-card')].map(n=>n.dataset.searchAnchor));
    assert.equal(new Set(cards).size,cards.length,'No duplicate feature entries');
    if(cls==='treasureHunter') {
      await page.evaluate(()=>CharacterState.update(s=>{
        s.classes.treasureHunter.relics=TreasureHunterRelicsV7s.map((relic,index)=>({instanceId:`qa-${index}`,relicId:relic.id,prepared:false,used:0}));
        s.ui.openRelics=s.classes.treasureHunter.relics.map(relic=>relic.instanceId);s.ui.pageId='relicsPage';
      }));
      const relicText=await page.locator('#relicsPage').innerText();assert.doesNotMatch(relicText,czech,relicText.split('\n').filter(line=>czech.test(line)).join('\n'));
      await page.evaluate(()=>CharacterState.update(s=>{s.classes.treasureHunter.choices.ancientLanguages=['Latina','Kečuánština','Starý keltský jazyk'];s.ui.pageId='skillsPage';}));
      await page.locator('#skillsPage details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      const skillText=await page.locator('#skillsPage').innerText();assert.doesNotMatch(skillText,czech,skillText.split('\n').filter(line=>czech.test(line)).join('\n'));
    }
  }
  await set('occultist',2);
  assert.equal(await page.locator('#featuresPage .feature-card.open').count(),0,'Occultist rules are not all expanded');
  await page.locator('[data-feature-toggle="occult-spellcasting"]').click();
  assert.match(await page.locator('[data-search-anchor="feature:occult-spellcasting"]>.feature-facts').innerText(),/DC 12/);
  await page.screenshot({path:path.join(output,`${mobile?'mobile':'desktop'}-occultist-features.png`)});
  // Inspect every science and every known spell, without changing character data through import adapters.
  await page.evaluate(()=>CharacterState.update(s=>{
    s.character.level=12;for(const key of Object.keys(s.classes.occultist.sciences))s.classes.occultist.sciences[key]=5;
    for(const choices of Object.values(OccultistDataV10.scienceChoices))for(const choice of choices)s.classes.occultist.choices.scienceChoices[choice.key]=choice.options[0];
    s.ui.pageId='relicsPage';
  }));
  const scienceText=await page.locator('#relicsPage').innerText();assert.doesNotMatch(scienceText,czech,scienceText.split('\n').filter(line=>czech.test(line)).join('\n'));
  await page.evaluate(()=>CharacterCommands.setUi('pageId','spellsPage'));
  await page.locator('#spellsPage details.spell-row').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
  const spellText=await page.locator('#spellsPage').innerText();assert.doesNotMatch(spellText,czech,spellText.split('\n').filter(line=>czech.test(line)).join('\n'));
  assert.doesNotMatch(await page.locator('#spellsPage').innerText(),/No rules text supplied/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await context.close();console.log(`${mobile?'mobile':'desktop'}: grouped features, nested collapse, bilingual search, favorites, numbers, all English rules and spellbook passed`);
}
(async()=>{fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const base=process.env.APP_URL||`http://127.0.0.1:${server.address().port}/`;await check(browser,base,false);await check(browser,base,true);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
