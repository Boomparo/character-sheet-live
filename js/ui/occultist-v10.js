(function () {
  'use strict';
  const S = window.CharacterState, D = window.CharacterDerived, C = window.CharacterCommands;
  const O = window.OccultistDataV10, Origin = window.CharacterOrigin, Roster = window.CharacterRoster;
  const SpellCatalog = window.CharacterSpellCatalog, Homebrew = window.CharacterHomebrewLibrary;
  if (!S || !D || !C || !O) return;

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const nl = value => esc(value).replace(/\n/g, '<br>');
  const signed = value => Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
  const active = () => S.get().character.classKey === 'occultist';
  const toast = (message, kind = '') => {
    const host = $('#toastHost'); if (!host) return;
    const node = document.createElement('div'); node.className = `toast ${kind}`; node.textContent = message; host.append(node);
    setTimeout(() => node.remove(), 2600);
  };
  const actionKey = value => /bonus/i.test(value) ? 'bonus' : /reaction/i.test(value) ? 'reaction' : /action/i.test(value) ? 'action' : 'other';
  const actionCode = value => ({ action: 'A', bonus: 'BA', reaction: 'R', other: 'OTHER' }[actionKey(value)]);
  const progress = source => O.progressionAt(D.level(source));
  const classState = source => source.classes.occultist;
  const spellEntry = (spell, source) => classState(source).spells.find(entry => (entry.id || entry.libraryId) === spell.id);
  const spellAvailable = (spell, source) => (!spell.requiredLevel || D.level(source) >= spell.requiredLevel) && (!spell.scienceKey || Number(classState(source).sciences[spell.scienceKey]) >= Number(spell.scienceLevel || 1));
  const selectedCantrip = (spell, source) => {
    if (spell.level || !spell.scienceKey) return true;
    const choices = O.scienceChoices?.[spell.scienceKey] || [];
    const definition = choices.find(choice => choice.options.includes(spell.id));
    return !definition || classState(source).choices.scienceChoices?.[definition.key] === spell.id;
  };
  const ui = { spellQuery:'', spellLevel:'all', spellSchool:'all', spellView:'known', catalogQuery:'', experimentExcluded:new Set() };
  const knownSpells = source => {
    const byId = new Map(O.spells.filter(spell => spellAvailable(spell, source) && selectedCantrip(spell, source)).map(spell => [spell.id, spell]));
    for (const entry of classState(source).spells) if (entry.added && entry.definition) byId.set(entry.id, { ...entry.definition, id:entry.id });
    return [...byId.values()];
  };
  const preparedCount = source => classState(source).spells.filter(entry => entry.prepared && Number(entry.definition?.level ?? O.spells.find(spell => spell.id === entry.id)?.level) > 0).length;
  const slots = source => progress(source).slots.map((max, index) => ({ level: index + 1, max, used: Number(classState(source).slotsUsed[index + 1]) || 0 }));

  function resourceBar(source) {
    return slots(source).map(slot => `<div class="occ-slot"><small>LEVEL ${slot.level}</small><b>${Math.max(0, slot.max - slot.used)}/${slot.max}</b><div>${Array.from({ length: slot.max }, (_, index) => `<button type="button" class="charge-dot ${index < slot.max - slot.used ? 'filled' : ''}" data-occult-slot="${slot.level}" data-delta="${index < slot.max - slot.used ? 1 : -1}" aria-label="${index < slot.max - slot.used ? 'Spend' : 'Restore'} level ${slot.level} slot"></button>`).join('') || '<span>—</span>'}</div></div>`).join('');
  }

  function patchCharacter(source) {
    const page = $('#characterPage'); if (!page) return;
    page.querySelector('.hero-copy .eyebrow')?.replaceChildren(document.createTextNode(`${source.character.race || 'SPECIES'} • OCCULTIST ${D.level(source)}`));
    page.querySelectorAll('.combat-secondary .stat').forEach(card => {
      const label = card.querySelector('span')?.textContent?.trim();
      if (label === 'WHIP DC' || label === 'RELIC DC') card.remove();
    });
    const grid = page.querySelector('.combat-secondary');
    if (grid && !grid.querySelector('[data-occult-combat-stat]')) grid.insertAdjacentHTML('beforeend', `<button type="button" class="stat compact" data-occult-combat-stat><span>SPELL DC</span><b>${D.spellDC(source)}</b></button><button type="button" class="stat compact" data-occult-combat-stat><span>SPELL ATTACK</span><b>${signed(D.spellAttack(source))}</b></button>`);
    const resource = page.querySelector('.cool-section');
    if (resource) {
      const spent = O.knowledgeSpent(classState(source));
      resource.innerHTML = `<div class="section-head"><h2>Spellcasting</h2><span class="eyebrow">INT</span></div><div class="occ-character-resources"><div class="occ-slot-grid">${resourceBar(source)}</div><div class="occ-knowledge"><span><small>KNOWLEDGE</small><b>${spent}/${progress(source).knowledge}</b></span><span><small>PREPARED</small><b>${preparedCount(source)}/${progress(source).prepared}</b></span><button type="button" class="small-btn" data-jump-page="relicsPage">Open Sciences</button></div></div>`;
    }
  }

  function actionRecords(source) {
    const records = [];
    D.weaponAttacks(source).forEach(weapon => {
      const ammunition = weapon.ammunitionType ? D.ammunitionSummaryForWeapon(weapon, source) : null;
      records.push({ id: `weapon:${weapon.id}`, weaponId: weapon.id, name: weapon.name, action: 'Action', group: 'Weapons', source: 'Weapon', hit: signed(weapon.hit), damage: weapon.damage, summary: [weapon.rangeText, weapon.propertiesText, weapon.mastery ? `Mastery: ${weapon.mastery}` : ''].filter(Boolean).join(' · '), ammunition });
    });
    for (const spell of knownSpells(source)) {
      const override = spellEntry(spell, source) || {};
      records.push({ ...spell, ...override, id: `spell:${spell.id}`, spellId: spell.id, group: 'Spells', action: spell.time, source: spell.science, summary: override.note || override.desc || spell.desc, prepared: spell.level === 0 || !!override.prepared });
    }
    for (const action of O.actions.filter(entry => entry.level <= D.level(source))) records.push({ ...action, group: 'Occultist', source: `Occultist ${action.level}` });
    for (const action of [
      ['core-dash','Dash','Action','Gain extra movement equal to your Speed.'],['core-disengage','Disengage','Action','Movement does not provoke Opportunity Attacks.'],
      ['core-dodge','Dodge','Action','Attack rolls against you have Disadvantage and you gain Advantage on Dexterity saves.'],['core-help','Help','Action','Assist another creature.'],
      ['core-hide','Hide','Action','Make a Dexterity (Stealth) check while sufficiently concealed.'],['core-ready','Ready','Action','Prepare an action or movement for a trigger.']
    ]) records.push({ id: action[0], name: action[1], action: action[2], summary: action[3], group: 'Core', source: 'Core' });
    return records;
  }

  function renderActions(source) {
    const page = $('#actionsPage'), all = actionRecords(source), filter = source.ui.actionFilter || 'all'; if (!page) return;
    const matches = record => filter === 'all' || (filter === 'attack' ? !!(record.weaponId || /attack|save/i.test(`${record.attack || ''} ${record.summary || ''}`)) : actionKey(record.action) === filter);
    const filters = [['all','ALL'],['attack','ATTACKS'],['action','ACTIONS'],['bonus','BONUS'],['reaction','REACTIONS'],['other','OTHER']].map(([key,label]) => `<button type="button" class="filter-btn ${filter === key ? 'active' : ''}" data-action-filter="${key}">${label}<small>${all.filter(record => key === 'all' || (key === 'attack' ? !!(record.weaponId || /attack|save/i.test(`${record.attack || ''} ${record.summary || ''}`)) : actionKey(record.action) === key)).length}</small></button>`).join('');
    const filtered = all.filter(matches);
    const cards = filtered.map(record => {
      const slot = record.spellId && record.level > 0 ? slots(source).find(entry => entry.level === record.level) : null;
      const resource = record.resourceId ? O.resources.find(entry => entry.id === record.resourceId) : null;
      const used = resource ? Number(classState(source).resources[resource.id]) || 0 : 0;
      const button = record.weaponId ? (record.ammunition ? `<button type="button" class="action-ammo-spend" data-occult-weapon="${esc(record.weaponId)}" ${record.ammunition.total ? '' : 'disabled'}><b>${record.ammunition.total}</b><span>${record.ammunition.total ? 'ATTACK · −1' : 'EMPTY'}</span><small>${esc(record.ammunition.type)}</small></button>` : `<button type="button" class="small-btn primary" data-occult-weapon="${esc(record.weaponId)}">ATTACK</button>`) : record.spellId ? `<button type="button" class="small-btn primary" data-occult-cast="${esc(record.spellId)}" ${record.prepared && (!slot || slot.used < slot.max) ? '' : 'disabled'}>${record.level ? `CAST · L${record.level}` : 'CAST'}</button>` : resource ? `<button type="button" class="small-btn primary" data-occult-resource="${esc(resource.id)}" ${used < resource.max ? '' : 'disabled'}>USE · ${Math.max(0, resource.max - used)}/${resource.max}</button>` : '';
      return `<article class="row-card action-row open"><div class="row-main-wrap"><div class="row-main occult-action-main"><span><strong>${esc(record.name)}</strong><span class="row-meta"><span class="badge ${actionKey(record.action)}">${actionCode(record.action)}</span><span>${esc(record.source || '')}</span>${record.ammunition ? `<span>AMMO · ${esc(record.ammunition.type)}</span>` : ''}</span></span><span class="action-numbers">${record.hit ? `<b>HIT ${esc(record.hit)}</b>` : ''}${record.damage ? `<b>DMG ${esc(record.damage)}</b>` : ''}</span></div>${button}</div><div class="row-detail"><div class="action-summary">${nl(record.summary || record.desc || '')}</div>${record.attack ? `<small>${esc(record.attack)} · ${esc(record.range || '')}</small>` : ''}</div></article>`;
    }).join('') || '<div class="empty">No actions match this filter.</div>';
    page.innerHTML = `<div class="page-intro"><div><span class="eyebrow">PLAY</span><h1>ACTIONS</h1><p>Weapons, spells and Occultist abilities</p></div></div><div class="actions-resource-bar occult-action-resource"><div class="occ-slot-grid">${resourceBar(source)}</div><button type="button" class="tactics-open" data-tactics-open title="Next Move">✦</button></div><div class="action-filter-bar">${filters}</div><div class="action-groups"><section class="action-group"><div class="list">${cards}</div><button type="button" class="small-btn primary top-gap" data-new-action>+ Custom Action</button></section></div>`;
  }

  function renderFeatures(source) {
    const page = $('#featuresPage'); if (!page) return;
    const progression = source.ui.featureView === 'progression';
    const features = O.features.filter(feature => progression || feature.level <= D.level(source));
    page.innerHTML = `<div class="page-intro"><div><span class="eyebrow">OCCULTIST</span><h1>FEATURES</h1><p>${progression ? 'Complete level 1–12 progression' : `Available through level ${D.level(source)}`}</p></div></div><section class="section"><div class="section-head"><h2>Class Features</h2><div class="view-switch"><button type="button" class="filter-btn ${!progression ? 'active' : ''}" data-feature-view="available">AVAILABLE</button><button type="button" class="filter-btn ${progression ? 'active' : ''}" data-feature-view="progression">PROGRESSION 1–12</button></div></div><div class="list feature-tree">${features.map(feature => `<article class="row-card open"><div class="row-main occult-feature-head"><span><small>LEVEL ${feature.level} · ${esc(actionCode(feature.action))}</small><strong>${esc(feature.name)}</strong></span></div><div class="row-detail">${nl(feature.fullText || feature.summary)}</div></article>`).join('')}</div></section>`;
  }

  function scienceChoices(scienceKey, source) {
    return (O.scienceChoices[scienceKey] || []).filter(choice => Number(classState(source).sciences[scienceKey]) >= choice.level).map(choice => `<label>${esc(choice.label)}<select data-occult-choice="${esc(choice.key)}"><option value="">Choose…</option>${choice.options.map(id => { const spell = O.spells.find(entry => entry.id === id); return `<option value="${esc(id)}" ${classState(source).choices.scienceChoices?.[choice.key] === id ? 'selected' : ''}>${esc(spell?.name || id)}</option>`; }).join('')}</select></label>`).join('');
  }

  function renderSciences(source) {
    const page = $('#relicsPage'), cs = classState(source), spent = O.knowledgeSpent(cs), total = progress(source).knowledge; if (!page) return;
    page.classList.add('occultist-sciences-page');
    const sciences = Object.entries(O.sciences).map(([key, science]) => {
      const current = Number(cs.sciences[key]) || 0;
      const options = Array.from({ length: 6 }, (_, level) => {
        const tier = level ? O.scienceLevels[level - 1] : null, disabled = tier && D.level(source) < tier.requiredLevel;
        return `<option value="${level}" ${current === level ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${level ? `Tier ${level} · cost ${O.costToLevel(level)} total · class level ${tier.requiredLevel}` : 'Not studied'}</option>`;
      }).join('');
      const levels = science.levels.slice(0, current).map((level, index) => `<details ${index + 1 === current ? 'open' : ''}><summary><span>Tier ${index + 1}</span><b>${esc(level.title)}</b></summary><div>${level.items.map(item => { const rule=O.scienceAbilities?.[item[0]] || O.spells.find(spell=>spell.name===item[0])?.fullText || item[1]; return `<p><strong>${esc(item[0])}</strong><span>${nl(rule)}</span></p>`; }).join('')}</div></details>`).join('');
      return `<article class="occ-science-card"><div class="occ-science-title"><i>${science.symbol}</i><span><small>${esc(science.focus)}</small><h3>${esc(science.name)}</h3></span></div><label>Knowledge tier<select data-occult-science="${key}">${options}</select></label>${scienceChoices(key, source)}<div class="occ-science-levels">${levels || '<p class="muted">Invest a Knowledge Point to begin this science.</p>'}</div></article>`;
    }).join('');
    page.innerHTML = `<div class="page-intro"><div><span class="eyebrow">OCCULTIST</span><h1>SCIENCES</h1><p>Knowledge and complete science rules</p></div></div><section class="section occ-science-overview"><div class="section-head"><h2>Daily Practice</h2><span class="eyebrow">${preparedCount(source)}/${progress(source).prepared} PREPARED</span></div><div class="occ-slot-grid">${resourceBar(source)}</div><div class="occ-knowledge"><span><small>KNOWLEDGE SPENT</small><b class="${spent > total ? 'danger-text' : ''}">${spent}/${total}</b></span><button type="button" class="small-btn" data-occult-dawn>Mark dawn preparation complete</button><button type="button" class="small-btn" data-occult-energy>Restore slot with HP</button><button type="button" class="small-btn primary" data-jump-page="spellsPage">Open Spells</button></div></section><section class="section"><div class="section-head"><h2>Occult Sciences</h2><small>Tier costs are cumulative.</small></div><div class="occ-science-grid">${sciences}</div></section>${renderAlchemyWorkshop(source)}`;
  }

  function spellDefinition(spell, source) { return spellEntry(spell, source)?.definition || spell; }
  function renderSpellCard(spell, source) {
    const definition=spellDefinition(spell,source), entry=spellEntry(spell,source), prepared=!definition.level || !!entry?.prepared;
    return `<details class="spell-row ${prepared?'prepared':''}"><summary><span class="spell-prepared-mark">${prepared?'◆':'◇'}</span><span class="spell-name"><small>${definition.level?`LEVEL ${definition.level}`:'CANTRIP'} · ${esc(definition.school||'Universal')}</small><b>${esc(definition.name)}</b></span><span class="spell-quick"><b>${esc(definition.time||'Action')}</b><small>${esc(definition.range||'Self')}</small></span></summary><div class="spell-detail"><div class="spell-facts"><span><small>COMPONENTS</small><b>${esc(definition.components||'—')}</b></span><span><small>DURATION</small><b>${esc(definition.duration||'Instantaneous')}</b></span><span><small>ATTACK / SAVE</small><b>${esc(definition.attack||'—')}</b></span>${definition.damage?`<span><small>DAMAGE</small><b>${esc(definition.damage)}</b></span>`:''}</div><p>${nl(definition.fullText||definition.desc||'No rules text supplied.')}</p>${definition.upcast?`<p class="spell-upcast"><b>At Higher Levels.</b> ${nl(definition.upcast)}</p>`:''}<div class="spell-actions">${definition.level?`<button type="button" class="small-btn ${prepared?'primary':''}" data-occult-prepare="${esc(definition.id)}">${prepared?'PREPARED':'PREPARE'}</button>`:'<span class="chip brass">CANTRIP</span>'}<button type="button" class="small-btn primary" data-occult-cast="${esc(definition.id)}" ${prepared?'':'disabled'}>CAST</button>${entry?.added?`<button type="button" class="small-btn ghost" data-occult-forget="${esc(definition.id)}">REMOVE</button>`:''}<small>${esc(definition.source||'Occultist')}</small></div></div></details>`;
  }

  function renderSpells(source) {
    const page=$('#spellsPage'); if(!page) return;
    page.classList.add('occultist-spells-page');
    const schools=[...new Set(knownSpells(source).map(spell=>spell.school).filter(Boolean))].sort();
    const filtered=knownSpells(source).filter(spell=>{
      const entry=spellEntry(spell,source), definition=spellDefinition(spell,source), needle=ui.spellQuery.toLowerCase();
      return (!needle || `${definition.name} ${definition.school} ${definition.desc} ${definition.fullText}`.toLowerCase().includes(needle)) && (ui.spellLevel==='all'||Number(definition.level)===Number(ui.spellLevel)) && (ui.spellSchool==='all'||definition.school===ui.spellSchool) && (ui.spellView!=='prepared'||!definition.level||entry?.prepared);
    });
    const grouped=[...new Set(filtered.map(spell=>Number(spellDefinition(spell,source).level)||0))].sort((a,b)=>a-b).map(level=>`<section class="spell-level-group"><div class="spell-level-head"><h2>${level?`Level ${level}`:'Cantrips'}</h2><span>${filtered.filter(spell=>(Number(spellDefinition(spell,source).level)||0)===level).length}</span></div>${filtered.filter(spell=>(Number(spellDefinition(spell,source).level)||0)===level).map(spell=>renderSpellCard(spell,source)).join('')}</section>`).join('');
    page.innerHTML=`<div class="page-intro spells-intro"><div><span class="eyebrow">OCCULTIST</span><h1>SPELLS</h1><p>Known spells, preparation and casting</p></div><button type="button" class="primary" data-spell-library-open>+ ADD SPELL</button></div><section class="spellcasting-summary"><div><small>ABILITY</small><b>INT ${signed(D.mod('INT',source))}</b></div><div><small>SAVE DC</small><b>${D.spellDC(source)}</b></div><div><small>ATTACK</small><b>${signed(D.spellAttack(source))}</b></div><div><small>PREPARED</small><b>${preparedCount(source)}/${progress(source).prepared}</b></div></section><div class="occ-slot-grid spells-slots">${resourceBar(source)}</div><div class="spell-toolbar"><input id="occSpellSearch" value="${esc(ui.spellQuery)}" placeholder="Search spells…"><select id="occSpellLevel"><option value="all">All levels</option>${[0,1,2,3].map(level=>`<option value="${level}" ${ui.spellLevel==level?'selected':''}>${level?`Level ${level}`:'Cantrip'}</option>`).join('')}</select><select id="occSpellSchool"><option value="all">All schools</option>${schools.map(school=>`<option ${ui.spellSchool===school?'selected':''}>${esc(school)}</option>`).join('')}</select><div class="view-switch"><button type="button" class="filter-btn ${ui.spellView==='known'?'active':''}" data-spell-view="known">KNOWN</button><button type="button" class="filter-btn ${ui.spellView==='prepared'?'active':''}" data-spell-view="prepared">PREPARED</button></div></div><div class="spell-list">${grouped||'<div class="empty">No spells match these filters.</div>'}</div>`;
  }

  function renderAlchemyWorkshop(source) {
    const cs=classState(source); if(Number(cs.sciences.alchymie)<3) return '';
    const used=Number(cs.resources.experiment)||0, results=O.potionResults||[], recipes=Homebrew?.potionRecipes?.()||[], projects=cs.potionCrafting.projects||[];
    return `<section class="section alchemy-workshop"><div class="section-head"><div><span class="eyebrow">ALCHYMIE III</span><h2>Potion Workshop</h2></div><button type="button" class="small-btn" data-new-potion-recipe>+ RECIPE</button></div><div class="experiment-card"><div><h3>Experiment pro každý den</h3><p>Choose results to exclude. Each exclusion automatically costs 1d4 + 1 HP; then one remaining result is rolled.</p></div><div class="experiment-results">${results.map(result=>`<button type="button" class="${ui.experimentExcluded.has(result.roll)?'excluded':''}" data-potion-exclude="${result.roll}"><b>${result.roll}</b><span>${esc(result.name)}</span></button>`).join('')}</div><button type="button" class="primary" data-occult-experiment ${used>=1?'disabled':''}>${used?'USED TODAY':`BREW RANDOM · ${ui.experimentExcluded.size} EXCLUDED`}</button></div><div class="potion-project-grid"><div><h3>Saved Recipes</h3>${recipes.map(recipe=>`<article class="potion-recipe"><span><b>${esc(recipe.name)}</b><small>${recipe.timeMinutes} min · ${recipe.costGp} GP · makes ${recipe.quantity}</small></span><button type="button" class="small-btn" data-potion-start="${esc(recipe.libraryId)}">START</button><p>${nl(recipe.effect||recipe.description)}</p></article>`).join('')||'<p class="muted">Create a reusable recipe. It becomes available to every character.</p>'}</div><div><h3>Active Batches</h3>${projects.map(project=>`<article class="potion-project"><b>${esc(project.recipe?.name||'Potion')}</b><progress max="${Math.max(1,project.totalMinutes)}" value="${project.progressMinutes}"></progress><small>${project.progressMinutes}/${project.totalMinutes} min</small><div><button type="button" class="small-btn" data-potion-progress="${project.id}" data-minutes="10">+10 MIN</button><button type="button" class="small-btn primary" data-potion-progress="${project.id}" data-minutes="60">+1 HOUR</button><button type="button" class="icon-btn" data-potion-cancel="${project.id}">×</button></div></article>`).join('')||'<p class="muted">No potion is currently brewing.</p>'}</div></div></section>`;
  }

  function patchHudAndPages(source) {
    $('#topClass').textContent = `${source.character.race || 'Species'} • Occultist ${D.level(source)} • PB ${signed(D.pb(source))}`;
    const hud = $('#hudCool')?.closest('button');
    if (hud) { hud.querySelector('span').textContent = 'SLOTS'; const values = slots(source); $('#hudCool').textContent = `${values.reduce((sum, slot) => sum + slot.max - slot.used, 0)}/${values.reduce((sum, slot) => sum + slot.max, 0)}`; hud.setAttribute('aria-label', 'Open Actions and spell slots'); }
    document.querySelectorAll('#pageDots .page-dot').forEach(dot => { if (dot.dataset.pageDot === 'relicsPage') { dot.setAttribute('aria-label', 'SCIENCES'); const label = dot.querySelector('span'); if (label) label.textContent = 'SCIENCES'; } });
    if (source.ui.pageId === 'relicsPage' && $('#pageTitle')) $('#pageTitle').textContent = 'SCIENCES';
  }

  function render() {
    if (!active()) return;
    const source = S.get();
    patchHudAndPages(source); patchCharacter(source); renderActions(source); renderFeatures(source); renderSciences(source); renderSpells(source);
  }

  function classOptions(selected = '') { return window.CharacterClassRegistry.list().map(definition => `<button type="button" class="class-choice ${selected === definition.id ? 'active' : ''}" data-create-class="${definition.id}"><i>${definition.sigil}</i><span><b>${esc(definition.name)}</b><small>${definition.maxLevel} levels · ${definition.hitDie} Hit Die</small></span></button>`).join(''); }
  function ensureClassDialog() {
    if ($('#classCreateDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="classCreateDialog" class="sheet-dialog class-create-dialog"><form method="dialog"><div class="dialog-head"><strong>New Character</strong><button value="cancel" class="icon-btn">×</button></div><p class="muted">Class is fixed for this character. Create another profile to play a different class.</p><label>Character name<input id="newCharacterName" value="New Character" autocomplete="off"></label><div class="class-choice-grid">${classOptions()}</div></form></dialog>`);
  }

  function ensureOccultistDialogs() {
    if ($('#spellLibraryDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="spellLibraryDialog" class="sheet-dialog spell-library-dialog"><form method="dialog"><div class="dialog-head"><strong>Add Spell</strong><button value="cancel" class="icon-btn">×</button></div><div class="spell-library-toolbar"><input id="spellCatalogSearch" placeholder="Search SRD and Homebrew spells…" autocomplete="off"><select id="spellCatalogLevel"><option value="all">All levels</option>${Array.from({length:10},(_,level)=>`<option value="${level}">${level?`Level ${level}`:'Cantrip'}</option>`).join('')}</select></div><button type="button" class="small-btn primary" data-homebrew-spell-new>+ CREATE HOMEBREW SPELL</button><div id="spellCatalogResults" class="spell-catalog-results"><div class="empty">Loading spell catalogue…</div></div></form></dialog>
      <dialog id="homebrewSpellDialog" class="sheet-dialog"><form method="dialog" id="homebrewSpellForm"><div class="dialog-head"><strong>Homebrew Spell</strong><button value="cancel" class="icon-btn">×</button></div><input id="hbSpellLibraryId" type="hidden"><label>Name<input id="hbSpellName" required></label><div class="form-grid two"><label>Level<select id="hbSpellLevel">${Array.from({length:10},(_,level)=>`<option value="${level}">${level?`Level ${level}`:'Cantrip'}</option>`).join('')}</select></label><label>School<input id="hbSpellSchool" value="Universal"></label><label>Casting time<input id="hbSpellTime" value="Action"></label><label>Range<input id="hbSpellRange" value="Self"></label><label>Components<input id="hbSpellComponents" placeholder="V, S, M"></label><label>Duration<input id="hbSpellDuration" value="Instantaneous"></label><label>Attack / save<input id="hbSpellAttack" placeholder="DEX save"></label><label>Damage / effect<input id="hbSpellDamage" placeholder="2d6 Fire"></label></div><label>Complete rules text<textarea id="hbSpellDescription" rows="7" required></textarea></label><label>At Higher Levels<textarea id="hbSpellUpcast" rows="3"></textarea></label><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">SAVE & LEARN</button></menu></form></dialog>
      <dialog id="potionRecipeDialog" class="sheet-dialog"><form method="dialog" id="potionRecipeForm"><div class="dialog-head"><strong>Potion Recipe</strong><button value="cancel" class="icon-btn">×</button></div><label>Name<input id="potionRecipeName" required></label><div class="form-grid two"><label>Time (minutes)<input id="potionRecipeTime" type="number" min="0" value="60"></label><label>Cost (GP)<input id="potionRecipeCost" type="number" min="0" step="0.01" value="0"></label><label>Yield<input id="potionRecipeYield" type="number" min="1" value="1"></label></div><label>Ingredients (one per line)<textarea id="potionRecipeIngredients" rows="4" placeholder="2x Healing herb&#10;1x Glass vial"></textarea></label><label>Effect / complete rules<textarea id="potionRecipeEffect" rows="6" required></textarea></label><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">SAVE RECIPE</button></menu></form></dialog>`);
  }

  async function renderSpellCatalog() {
    const host=$('#spellCatalogResults'); if(!host||!SpellCatalog) return;
    host.innerHTML='<div class="empty">Loading spell catalogue…</div>';
    const query=$('#spellCatalogSearch')?.value||'', level=$('#spellCatalogLevel')?.value||'all';
    const results=(await SpellCatalog.search(query,{level})).slice(0,80), known=new Set(knownSpells(S.get()).map(spell=>spell.id));
    host.innerHTML=results.map(spell=>`<article class="spell-catalog-row"><span><small>${spell.level?`LEVEL ${spell.level}`:'CANTRIP'} · ${esc(spell.school)} · ${esc(spell.source)}</small><b>${esc(spell.name)}</b><small>${esc(spell.time)} · ${esc(spell.range)}</small></span><button type="button" class="small-btn ${known.has(spell.id)?'ghost':'primary'}" data-add-spell="${esc(spell.id)}" ${known.has(spell.id)?'disabled':''}>${known.has(spell.id)?'KNOWN':'ADD'}</button></article>`).join('')||'<div class="empty">No matching spells.</div>';
  }

  function builderHtml(source) {
    const c = source.character, cs = classState(source), background = Origin.background(source), selected = new Set(cs.choices.classSkills || []);
    const option = (value, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(value)}</option>`;
    return `<div class="builder-status ${D.choiceRequirements(source).length ? 'warning' : 'complete'}">${D.choiceRequirements(source).length ? `Missing: ${esc(D.choiceRequirements(source).join(' • '))}` : 'Required choices complete ✓'}</div><section class="builder-block"><h3>Occultist Identity</h3><div class="form-grid two"><label>Name<input id="occBuilderName" value="${esc(c.name)}"></label><label>Level<select id="occBuilderLevel">${Array.from({length:12},(_,i)=>option(String(i+1),String(D.level(source))))}</select></label><label>Species<select id="occBuilderSpecies"><option value="${esc(c.origin.species || c.race)}">${esc(c.origin.species || c.race || 'Choose…')}</option>${Origin.SPECIES.filter(item => item.name !== (c.origin.species || c.race)).map(item => option(item.name,'')).join('')}</select></label><label>Class<input value="Occultist" readonly></label></div></section><section class="builder-block"><h3>Final Ability Scores</h3><div class="builder-abilities">${S.A.map(ability => `<label>${ability}<input type="number" min="1" max="30" value="${D.ability(ability,source)}" data-occ-builder-ability="${ability}"></label>`).join('')}</div><label class="check-label"><input id="occBuilderHpAuto" type="checkbox" ${c.hp.auto !== false ? 'checked' : ''}> Automatic Max HP</label><label>Manual Max HP<input id="occBuilderHpMax" type="number" min="1" value="${D.hpMax(source)}"></label></section><section class="builder-block"><h3>${esc(Origin.BACKGROUND.name)}</h3><div class="builder-choice-fields"><label>Skill 1<select id="occBgSkill0"><option value="">Choose…</option>${Origin.SKILLS.map(skill=>option(skill,background.skills?.[0]||'')).join('')}</select></label><label>Skill 2<select id="occBgSkill1"><option value="">Choose…</option>${Origin.SKILLS.map(skill=>option(skill,background.skills?.[1]||'')).join('')}</select></label><label>Origin feat<select id="occBgFeat"><option value="">Choose…</option>${Object.keys(Origin.BACKGROUND.feats).map(feat=>option(feat,background.feat||'')).join('')}</select></label><label>Tool<input id="occBgTool" value="${esc(background.tool||'')}"></label></div></section><section class="builder-block"><h3>Occultist Proficiencies</h3><p class="muted">Choose exactly 3 class skills.</p><div class="class-skill-picker">${O.skills.map(skill=>`<label><input type="checkbox" data-occ-class-skill="${esc(skill)}" ${selected.has(skill)?'checked':''}><span>${esc(skill)}</span></label>`).join('')}</div>${D.level(source)>=2?`<div class="builder-choice-fields"><label>Student mystiky language<input id="occMysticLanguage" value="${esc(cs.choices.mysticLanguage||'')}"></label><label>Student mystiky skill<select id="occMysticSkill"><option value="">Choose…</option>${['Arcana','History','Insight','Medicine','Religion'].map(skill=>option(skill,cs.choices.mysticSkill||'')).join('')}</select></label></div>`:''}</section>`;
  }

  function renderBuilder() {
    if (!active() || !$('#builderBody')) return;
    const activeTab = $('#builderDialog [data-builder-tab].active')?.dataset.builderTab || 'setup';
    if (activeTab !== 'setup') return;
    $('#builderBody').innerHTML = builderHtml(S.get()); $('#builderSave').hidden = false;
  }

  function saveBuilder(event) {
    event.preventDefault(); event.stopPropagation();
    const source = S.get(), background = Origin.background(source);
    C.saveBuilder({
      name: $('#occBuilderName').value, level: $('#occBuilderLevel').value, species: $('#occBuilderSpecies').value,
      abilities: Object.fromEntries([...document.querySelectorAll('[data-occ-builder-ability]')].map(input => [input.dataset.occBuilderAbility, Number(input.value)])), hpAuto: $('#occBuilderHpAuto').checked, hpMax: $('#occBuilderHpMax').value,
      classSkills: [...document.querySelectorAll('[data-occ-class-skill]:checked')].map(input => input.dataset.occClassSkill), mysticLanguage: $('#occMysticLanguage')?.value || '', mysticSkill: $('#occMysticSkill')?.value || '',
      speciesChoices: source.character.origin.speciesChoices, background: { ...background, skills: [$('#occBgSkill0').value,$('#occBgSkill1').value], feat: $('#occBgFeat').value, tool: $('#occBgTool').value }
    });
    $('#builderDialog').close(); toast('Occultist setup saved.');
  }

  function renderLevelUp() {
    const source = S.get(), target = D.level(source) + 1; if (target > O.maxLevel) { toast('Occultist is already at maximum level.', 'warn'); return; }
    const features = O.features.filter(feature => feature.level === target);
    $('#levelUpWizard').innerHTML = `<div class="level-up-progress"><span>${D.level(source)} → ${target}</span><i style="--progress:100%"></i></div><div class="level-up-screen"><small>OCCULTIST LEVEL UP</small><h2>Level ${target}</h2><div class="level-up-stats"><div><span>MAX HP</span><small>${D.hpMax(source)}</small><i>→</i><b>${O.hpMax(target,D.mod('CON',source))}</b></div><div><span>KNOWLEDGE</span><small>${progress(source).knowledge}</small><i>→</i><b>${O.progressionAt(target).knowledge}</b></div><div><span>PREPARED</span><small>${progress(source).prepared}</small><i>→</i><b>${O.progressionAt(target).prepared}</b></div></div>${features.map(feature=>`<article class="occ-level-feature"><small>NEW FEATURE</small><h3>${esc(feature.name)}</h3><p>${nl(feature.summary)}</p></article>`).join('')||'<p>No named class feature at this level; progression values still increase.</p>'}${target===2?`<div class="builder-choice-fields"><label>Student mystiky language<input id="levelMysticLanguage" value="${esc(classState(source).choices.mysticLanguage||'')}"></label><label>Student mystiky skill<select id="levelMysticSkill"><option value="">Choose…</option>${['Arcana','History','Insight','Medicine','Religion'].map(skill=>`<option>${skill}</option>`).join('')}</select></label></div>`:''}</div><menu class="level-up-nav"><button type="button" class="ghost" value="cancel" onclick="this.closest('dialog').close()">Cancel</button><button type="button" class="primary" data-occult-level-finish="${target}">Apply level ${target}</button></menu>`;
    $('#levelUpDialog').showModal();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-roster-new')) { event.preventDefault(); event.stopPropagation(); ensureClassDialog(); $('#newCharacterName').value = 'New Character'; $('#classCreateDialog').showModal(); return; }
    if (button.dataset.createClass) { event.preventDefault(); const name = $('#newCharacterName').value.trim() || 'New Character'; $('#classCreateDialog').close(); $('#charactersDialog')?.close(); Roster.create(name, button.dataset.createClass); toast(`${name} created.`); return; }
    if (!active()) return;
    if (button.hasAttribute('data-spell-library-open')) { ensureOccultistDialogs(); $('#spellLibraryDialog').showModal(); renderSpellCatalog(); return; }
    if (button.hasAttribute('data-homebrew-spell-new')) { $('#spellLibraryDialog')?.close(); $('#homebrewSpellForm').reset(); $('#hbSpellSchool').value='Universal'; $('#hbSpellTime').value='Action'; $('#hbSpellRange').value='Self'; $('#hbSpellDuration').value='Instantaneous'; $('#homebrewSpellDialog').showModal(); return; }
    if (button.dataset.addSpell) { SpellCatalog.get(button.dataset.addSpell).then(spell=>{ const result=C.learnOccultistSpell(spell); if(result.ok){toast(`${spell.name} added to the spellbook.`);renderSpellCatalog();} else toast('That spell is already known.','warn'); }); return; }
    if (button.dataset.occultForget) { C.forgetOccultistSpell(button.dataset.occultForget); toast('Spell removed from this character.'); return; }
    if (button.dataset.spellView) { ui.spellView=button.dataset.spellView; renderSpells(S.get()); return; }
    if (button.dataset.potionExclude) { const roll=Number(button.dataset.potionExclude); ui.experimentExcluded.has(roll)?ui.experimentExcluded.delete(roll):ui.experimentExcluded.add(roll); if(ui.experimentExcluded.size>=6)ui.experimentExcluded.delete(roll); renderSciences(S.get()); return; }
    if (button.hasAttribute('data-occult-experiment')) { const result=C.craftOccultistExperiment([...ui.experimentExcluded]); if(result.ok){ui.experimentExcluded.clear();toast(`${result.result.name} brewed · ${result.hpCost} HP spent.`);}else toast(result.reason==='hp'?'Not enough HP for the excluded results.':'Experiment is unavailable.','warn'); return; }
    if (button.hasAttribute('data-new-potion-recipe')) { ensureOccultistDialogs(); $('#potionRecipeForm').reset(); $('#potionRecipeTime').value=60; $('#potionRecipeCost').value=0; $('#potionRecipeYield').value=1; $('#potionRecipeDialog').showModal(); return; }
    if (button.dataset.potionStart) { const recipe=Homebrew?.potionRecipes().find(entry=>entry.libraryId===button.dataset.potionStart); const result=C.startPotionProject(recipe,recipe?.quantity||1); toast(result.ok?`${recipe.name} batch started.`:'Recipe could not be started.',result.ok?'':'warn'); return; }
    if (button.dataset.potionProgress) { const result=C.progressPotionProject(button.dataset.potionProgress,button.dataset.minutes); if(result.ok)toast(result.complete?'Potion finished and added to Gear.':'Brewing time recorded.'); return; }
    if (button.dataset.potionCancel) { C.cancelPotionProject(button.dataset.potionCancel); toast('Potion batch cancelled.'); return; }
    if (button.id === 'builderBtn' || button.hasAttribute('data-open-builder') || button.dataset.builderTab === 'setup') setTimeout(renderBuilder);
    if (button.hasAttribute('data-level-up-open')) { event.preventDefault(); event.stopPropagation(); renderLevelUp(); return; }
    if (button.dataset.occultLevelFinish) { const selections = {}; if ($('#levelMysticLanguage')) selections.mysticLanguage = $('#levelMysticLanguage').value; if ($('#levelMysticSkill')) selections.mysticSkill = $('#levelMysticSkill').value; const result = C.levelUp(button.dataset.occultLevelFinish,selections); if (result.ok) { $('#levelUpDialog').close(); toast(`Occultist level ${result.to} applied.`); } return; }
    if (button.dataset.occultWeapon) { const result = C.executeAction({ name:'Attack', weaponId:button.dataset.occultWeapon, spendAmmo:!!D.weaponAttacks(S.get()).find(weapon=>weapon.id===button.dataset.occultWeapon)?.ammunitionType }); toast(result.ok ? (result.ammunition ? `Attack used 1 ${result.ammunition.type}.` : 'Attack ready.') : 'No carried ammunition.', result.ok?'':'warn'); return; }
    if (button.dataset.occultCast) { const result = C.castOccultistSpell(button.dataset.occultCast); toast(result.ok ? `${result.spell.name} cast${result.slot?` · level ${result.slot} slot used`:''}.` : result.reason==='prepared'?'Prepare this spell at dawn first.':'No spell slot available.', result.ok?'':'warn'); return; }
    if (button.dataset.occultResource) { const result=C.useOccultistResource(button.dataset.occultResource,1); toast(result.ok?'Use recorded.':'No uses remaining.',result.ok?'':'warn'); return; }
    if (button.dataset.occultSlot) { C.adjustOccultistSlot(button.dataset.occultSlot,button.dataset.delta); return; }
    if (button.hasAttribute('data-occult-dawn')) { C.completeOccultistDawn(); toast('Dawn preparation recorded.'); return; }
    if (button.hasAttribute('data-occult-energy')) { const used=slots(S.get()).filter(slot=>slot.used>0); if(!used.length){toast('All spell slots are already available.','warn');return;} const level=Number(prompt(`Restore which slot level? Available: ${used.map(slot=>slot.level).join(', ')}`,String(used[0].level))); if(!used.some(slot=>slot.level===level))return; const formula={1:'1d4+1',2:'1d6+2',3:'1d10+3'}[level]; const cost=Number(prompt(`Roll ${formula}. Enter the HP cost:`,'1')); if(!cost)return; const result=C.restoreOccultistSlotWithHp(level,cost); toast(result.ok?`Level ${level} slot restored for ${cost} HP.`:'This would reduce you to 0 HP, so it cannot be used.',result.ok?'':'warn'); return; }
  }, true);

  document.addEventListener('change', event => {
    if (!active()) return;
    const target=event.target;
    if(target.dataset.occultScience){const result=C.setOccultistScience(target.dataset.occultScience,target.value);if(!result.ok){toast(result.reason==='knowledge'?'Not enough Knowledge Points.':'This tier needs a higher class level.','warn');render();}}
    if(target.dataset.occultChoice) C.setOccultistChoice(target.dataset.occultChoice,target.value);
    if(target.dataset.occultPrepare){ /* buttons only */ }
    if(target.id==='occSpellLevel'){ui.spellLevel=target.value;renderSpells(S.get());}
    if(target.id==='occSpellSchool'){ui.spellSchool=target.value;renderSpells(S.get());}
    if(target.id==='spellCatalogLevel') renderSpellCatalog();
  }, true);
  document.addEventListener('input',event=>{
    const target=event.target;
    if(target.id==='occSpellSearch'){ui.spellQuery=target.value;const position=target.selectionStart;renderSpells(S.get());const next=$('#occSpellSearch');next?.focus();next?.setSelectionRange(position,position);}
    if(target.id==='spellCatalogSearch') renderSpellCatalog();
  },true);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-occult-prepare]');if(!button||!active())return;const result=C.toggleOccultistSpell(button.dataset.occultPrepare);if(!result.ok)toast('Prepared spell limit is full.','warn');},true);
  document.addEventListener('submit', event => {
    if (!active()) return;
    if (event.target.id === 'builderForm' && $('#occBuilderName')) { saveBuilder(event); return; }
    if (event.target.id === 'homebrewSpellForm') {
      event.preventDefault(); event.stopPropagation();
      const spell=Homebrew.saveSpell({libraryId:$('#hbSpellLibraryId').value||undefined,name:$('#hbSpellName').value,level:$('#hbSpellLevel').value,school:$('#hbSpellSchool').value,time:$('#hbSpellTime').value,range:$('#hbSpellRange').value,components:$('#hbSpellComponents').value,duration:$('#hbSpellDuration').value,attack:$('#hbSpellAttack').value,damage:$('#hbSpellDamage').value,desc:$('#hbSpellDescription').value,upcast:$('#hbSpellUpcast').value,classes:['Occultist']});
      if(spell){C.learnOccultistSpell(spell);$('#homebrewSpellDialog').close();toast(`${spell.name} saved globally and learned.`);} return;
    }
    if (event.target.id === 'potionRecipeForm') {
      event.preventDefault(); event.stopPropagation();
      const ingredients=$('#potionRecipeIngredients').value.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>{const match=line.match(/^(\d+)\s*x?\s*(.+)$/i);return {name:match?match[2]:line,quantity:match?Number(match[1]):1};});
      const recipe=Homebrew.savePotionRecipe({name:$('#potionRecipeName').value,timeMinutes:$('#potionRecipeTime').value,costGp:$('#potionRecipeCost').value,quantity:$('#potionRecipeYield').value,ingredients,effect:$('#potionRecipeEffect').value});
      if(recipe){$('#potionRecipeDialog').close();renderSciences(S.get());toast(`${recipe.name} recipe saved globally.`);} return;
    }
  }, true);
  document.addEventListener('click', event => { if (event.target.closest('#charactersBtn')) setTimeout(() => { document.querySelectorAll('.roster-card').forEach(card => { const open=card.querySelector('[data-roster-switch]'), id=open?.dataset.rosterSwitch || Roster.activeId(); const profile=Roster.list().find(item=>item.id===id); const small=card.querySelector('small'); if(profile&&small) small.textContent=`Level ${profile.level} ${window.CharacterClassRegistry.get(profile.classKey)?.name||''} · ${profile.race||''}`; }); }, 0); });

  S.subscribe(() => setTimeout(render, 0));
  ensureClassDialog(); ensureOccultistDialogs(); setTimeout(render, 0);
  window.CharacterOccultistUIV10 = { render, renderBuilder };
})();
