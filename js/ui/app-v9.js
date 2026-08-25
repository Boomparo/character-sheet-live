(function () {
  'use strict';

  const S = window.CharacterState;
  const D = window.CharacterDerived;
  const C = window.CharacterCommands;
  const T = window.TreasureHunterDataV7s;
  const Relics = window.TreasureHunterRelicsV7s || [];
  const Rules = window.DND2024Rules;
  const Origin = window.CharacterOrigin;
  const Roster = window.CharacterRoster;
  const Catalog = window.V7SItemCatalog;
  const Cropper = window.V7SPortraitCropper;
  if (!S || !D || !C || !T || !Rules || !Origin) return;

  const PAGES = ['characterPage', 'actionsPage', 'skillsPage', 'featuresPage', 'relicsPage', 'gearPage', 'npcsPage'];
  const TITLES = ['CHARACTER', 'ACTIONS', 'SKILLS', 'FEATURES', 'RELICS', 'GEAR', 'NPC / BIO'];
  const BIO_FIELDS = [
    ['background', 'Background'], ['alignment', 'Alignment'], ['age', 'Age'], ['height', 'Height'],
    ['weight', 'Weight'], ['eyes', 'Eyes'], ['hair', 'Hair'], ['skin', 'Skin'], ['faith', 'Faith'],
    ['personality', 'Personality'], ['ideals', 'Ideals'], ['bonds', 'Bonds'], ['flaws', 'Flaws'],
    ['appearance', 'Appearance'], ['backstory', 'Backstory'], ['allies', 'Allies'], ['notes', 'Notes']
  ];
  const LONG_BIO = new Set(['personality', 'ideals', 'bonds', 'flaws', 'appearance', 'backstory', 'allies', 'notes']);
  const LOCATION_LABELS = {
    equipped: 'Equipped', worn: 'Worn', carried: 'Carried', backpack: 'Backpack',
    back: 'On back', ground: 'On ground', storage: 'Storage'
  };
  const FEATURE_PARENT = {
    'ancient-languages': 'adventurer-through-and-through', 'drivers-license': 'adventurer-through-and-through',
    'specialized-expertise': 'adventurer-through-and-through', 'conversational-tourist': 'adventurer-through-and-through',
    'born-stunt-performer': 'adventurer-through-and-through', 'cool-die': 'adventurer-through-and-through',
    'object-manipulation': 'whip-master', swing: 'whip-master', towing: 'swing',
    'indy-slide': 'indy-maneuvers', 'indy-get-up': 'indy-maneuvers',
    'narrow-escape': 'cool-points', 'snatch-item': 'cool-points',
    'attack-slide': 'indy-slide',
    'precision-slide': 'attack-slide', 'line-attack': 'attack-slide',
    'rope-snare': 'adventurers-rope', 'rope-pull': 'adventurers-rope', 'rope-takedown': 'adventurers-rope', 'quick-rope': 'adventurers-rope',
    'initial-collection': 'curiosity-collection', 'prepared-relics-reserve': 'curiosity-collection',
    'bag-full-secrets': 'prepared-relics-reserve', 'preparing-relics': 'prepared-relics-reserve',
    'handling-relics': 'prepared-relics-reserve', 'using-relics': 'prepared-relics-reserve',
    'magical-bond': 'prepared-relics-reserve', 'bags-protection': 'prepared-relics-reserve',
    'expert-identification': 'curiosity-collection', 'know-not-to-touch': 'curiosity-collection',
    'another-piece-collection': 'relic-connoisseur', 'intelligent-use': 'relic-connoisseur', 'familiar-premonition': 'relic-connoisseur',
    'forced-awakening': 'master-relics', 'improved-narrow-escape': 'against-all-odds', 'second-wind': 'against-all-odds',
    'always-on-guard': 'unstoppable-adventurer', 'find-a-way': 'unstoppable-adventurer',
    'at-right-moment': 'wealth-and-glory', 'free-trick': 'wealth-and-glory'
  };
  const ATTACK_FEATURES = new Set([
    'whip-master', 'object-manipulation', 'snatch-item', 'attack-slide', 'precision-slide', 'line-attack',
    'adventurers-rope', 'rope-snare', 'rope-pull', 'rope-takedown', 'quick-rope', 'extra-attack',
    'daring-strike', 'improved-daring', 'superior-daring', 'legendary-slide', 'at-right-moment'
  ]);

  const local = {
    featureSearch: '', catalogQuery: '', catalogRarity: 'all', catalogKind: 'all',
    hpAmount: 1, pendingPortrait: '', pendingNpcImage: '', activeNpcId: '', activeItemId: '',
    builderTab: 'setup', catalogItems: [], scrollTimer: 0, scrollRaf: 0
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const nl = value => esc(value).replace(/\n/g, '<br>');
  const state = () => S.get();
  const actionCode = value => ({ Action: 'A', 'Bonus Action': 'BA', Reaction: 'R', Free: 'FREE', Other: 'OTHER', Resource: 'RESOURCE', Passive: 'PASSIVE' }[value] || String(value || 'OTHER').toUpperCase());
  const actionFilterKey = value => value === 'Action' ? 'action' : value === 'Bonus Action' ? 'bonus' : value === 'Reaction' ? 'reaction' : 'other';

  function pageIntro(label, description) { return `<div class="page-intro"><span>${esc(label)}</span><small>${esc(description)}</small></div>`; }
  function section(title, body, aside = '') { return `<section class="section"><div class="section-head"><h2>${esc(title)}</h2>${aside}</div>${body}</section>`; }
  function stat(label, value, classes = '', attributes = '') { return `<div class="stat ${classes}" ${attributes}><span>${esc(label)}</span><b>${esc(value)}</b></div>`; }
  function rollIndicator(result) {
    if (!result || !['advantage', 'disadvantage'].includes(result.mode)) return '';
    const title = result.locked && result.sources?.length ? `Forced by ${result.sources.join(', ')}` : result.mode;
    return `<span class="roll-indicator ${result.mode}" title="${esc(title)}" aria-label="${esc(title)}">${result.mode === 'advantage' ? 'A' : 'D'}</span>`;
  }
  function toast(message, type = 'success') {
    const host = $('#toastHost');
    if (!host) return;
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.textContent = message;
    host.appendChild(element);
    setTimeout(() => element.remove(), 2400);
  }
  function showDialog(id) { const dialog = $(id); if (dialog && !dialog.open) dialog.showModal(); }
  function closeDialog(id) { const dialog = $(id); if (dialog?.open) dialog.close(); }

  function renderTop() {
    const source = state();
    const health = D.hp(source);
    const total = T.coolTotal(D.level(source));
    const used = Math.min(total, Number(source.classes.treasureHunter.coolUsed) || 0);
    $('#topName').textContent = source.character.name || 'Unnamed Character';
    $('#topClass').textContent = `${source.character.race || 'Species'} • Treasure Hunter ${D.level(source)} • PB ${S.signed(D.pb(source))}`;
    $('#hudHp').textContent = `${health.current}/${health.max}${health.temp ? ` +${health.temp}` : ''}`;
    $('#hudAc').textContent = D.armorClass(source);
    $('#hudCool').textContent = `${Math.max(0, total - used)}/${total}`;
  }

  function renderCharacter() {
    const source = state();
    const c = source.character;
    const health = D.hp(source);
    const coolTotal = T.coolTotal(D.level(source));
    const coolUsed = Math.min(coolTotal, Number(source.classes.treasureHunter.coolUsed) || 0);
    const coolLeft = Math.max(0, coolTotal - coolUsed);
    const initMode = D.effectiveRollMode('initiative', '', source);
    const missing = [...Origin.originIncomplete(source), ...D.choiceRequirements(source)];
    const abilityCards = S.A.map(ability => {
      const save = D.saveMod(ability, source);
      const mode = D.effectiveRollMode('save', ability, source);
      return `<button type="button" class="ability" data-stat-detail="save:${ability}"><span class="abbr">${ability}</span><span class="mod">${S.signed(D.mod(ability, source))}</span><span class="score">${D.ability(ability, source)}</span><span class="save ${D.isSaveProficient(ability, source) ? 'prof' : ''}">${D.isSaveProficient(ability, source) ? '●' : '○'} ${save == null ? 'FAIL' : S.signed(save)}</span>${rollIndicator(mode)}</button>`;
    }).join('');
    const coolDots = Array.from({ length: coolTotal }, (_, index) => `<button type="button" class="cool-dot ${index < coolLeft ? 'filled' : ''}" data-cool-adjust="${index < coolLeft ? 1 : -1}" aria-label="${index < coolLeft ? 'Spend' : 'Restore'} Cool Point"></button>`).join('');
    const conditionChips = c.conditions.map(condition => `<span class="chip accent">${esc(Rules.conditionName(condition))}<button type="button" data-condition-remove="${esc(condition)}" aria-label="Remove ${esc(condition)}">×</button></span>`).join('');
    const conditionOptions = Object.keys(Rules.CONDITIONS).filter(condition => !c.conditions.includes(condition)).map(condition => `<option value="${esc(condition)}">${esc(Rules.conditionName(condition))}</option>`).join('');
    const defenses = D.damageDefenses(source);
    const defenseRows = [
      ['resistance', 'Resistances', defenses.resistances], ['immunity', 'Immunities', defenses.immunities],
      ['vulnerability', 'Vulnerabilities', defenses.vulnerabilities], ['conditionImmunity', 'Condition Immunities', defenses.conditionImmunities]
    ].map(([key, label, values]) => `<div class="defense-line"><b>${label}</b><div class="condition-strip">${values.map(value => `<span class="chip">${esc(value)}<button type="button" data-defense-remove="${key}:${esc(value)}">×</button></span>`).join('') || '<span class="muted">—</span>'}</div></div>`).join('');
    const damageOptions = Rules.DAMAGE_TYPES.map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join('');
    const conditionImmunityOptions = Object.keys(Rules.CONDITIONS).map(key => `<option value="${esc(key)}">${esc(Rules.conditionName(key))}</option>`).join('');
    const species = Origin.species(source);
    const originTraits = species?.mechanicsAvailable ? species.traits.map(([name, text]) => `<details class="proficiency"><summary>${esc(name)}</summary><div class="prof-body">${esc(text)}</div></details>`).join('') : '<p class="muted">No complete mechanical species pack was supplied. The sheet does not invent missing mechanics.</p>';
    const background = Origin.background(source);
    const feat = Origin.BACKGROUND.feats[background.feat];
    const luck = background.feat === 'Lucky' ? (() => {
      const max = D.pb(source), left = Math.max(0, max - (Number(background.luckUsed) || 0));
      return section('Lucky', `<p class="muted">${esc(feat.description)}</p><div class="cool-dots">${Array.from({ length: max }, (_, i) => `<button type="button" class="cool-dot ${i < left ? 'filled' : ''}" data-luck-adjust="${i < left ? 1 : -1}"></button>`).join('')}</div>`, `<span class="eyebrow">${left}/${max}</span>`);
    })() : '';

    $('#characterPage').innerHTML = `${pageIntro('CHARACTER', 'Combat overview and canonical stats')}
      ${missing.length ? `<button type="button" class="choice-warning" data-open-builder><b>Setup incomplete</b><span>${esc(missing.slice(0, 4).join(' • '))}${missing.length > 4 ? ` • +${missing.length - 4} more` : ''}</span></button>` : ''}
      <section class="section character-hero">
        ${c.portrait ? `<img class="hero-portrait" src="${esc(c.portrait)}" alt="">` : '<div class="hero-portrait placeholder">♟</div>'}
        <div class="hero-copy"><div class="eyebrow">${esc(c.race || 'SPECIES')} • TREASURE HUNTER ${D.level(source)}</div><h1>${esc(c.name || 'Unnamed Character')}</h1><p>Occult Collector • ${esc(c.size || species?.size || '')}</p><div class="hero-actions"><button class="small-btn" type="button" data-open-edit>Quick edit</button><button class="small-btn primary" type="button" data-open-builder>Character Builder</button></div></div>
      </section>
      ${section('Combat', `<div class="stat-grid hero-stats">
        ${stat('HP', `${health.current}/${health.max}`, 'hp-stat', 'data-open-hp role="button" tabindex="0"')}
        ${stat('TEMP', health.temp, health.temp ? 'temp-active' : '')}
        ${stat('AC', D.armorClass(source), '', 'data-stat-detail="ac" role="button" tabindex="0"')}
        <button type="button" class="stat" data-stat-detail="initiative"><span>INIT</span><span class="stat-value-row"><b>${S.signed(D.initiative(source))}</b>${rollIndicator(initMode)}</span></button>
        ${stat('SPEED', `${D.speed(source)} ft.`)}${stat('WHIP DC', D.whipRopeDC(source), 'compact')}${stat('RELIC DC', D.relicDC(source), 'compact')}${stat('PB', S.signed(D.pb(source)), 'compact')}
      </div><div class="hero-actions"><button class="small-btn" type="button" data-rest="short">Short Rest</button><button class="small-btn" type="button" data-rest="long">Long Rest</button><button class="small-btn ${c.inspiration ? 'primary' : ''}" type="button" data-inspiration>Inspiration</button></div>`)}
      ${section('Cool Points', `<div class="resource-row"><div><div class="cool-dots">${coolDots || '<span class="muted">Available at level 2</span>'}</div><small class="muted">Cool Die ${T.coolDie(D.level(source))}</small></div><b>${coolLeft}/${coolTotal}</b></div>`)}
      ${luck}
      ${section('Abilities & Saves', `<div class="ability-grid">${abilityCards}</div><small class="muted top-gap">A/D is shown only when active. A forced state is locked to its condition or relic.</small>`)}
      ${section('Conditions', `<div class="condition-strip">${conditionChips || '<span class="muted">No active conditions.</span>'}${c.exhaustion ? `<span class="chip brass">Exhaustion ${c.exhaustion}</span>` : ''}</div><div class="inline-form top-gap"><select id="conditionSelect"><option value="">Add condition…</option>${conditionOptions}</select><button type="button" class="small-btn" data-condition-add>+</button></div><div class="tiny-controls top-gap"><button type="button" data-exhaustion-adjust="-1">Exhaustion −</button><button type="button" data-exhaustion-adjust="1">Exhaustion +</button></div>`)}
      ${section('Defenses', `${defenseRows}<div class="inline-form top-gap"><select id="defenseKind"><option value="resistance">Resistance</option><option value="immunity">Immunity</option><option value="vulnerability">Vulnerability</option><option value="conditionImmunity">Condition Immunity</option></select><select id="defenseValue">${damageOptions}</select><button type="button" class="small-btn" data-defense-add>+</button></div><template id="damageDefenseOptions">${damageOptions}</template><template id="conditionDefenseOptions">${conditionImmunityOptions}</template>`)}
      ${section('Origin', `<article class="origin-feature-card"><div><small>SPECIES</small><b>${esc(species?.name || 'Not selected')}</b></div>${originTraits}</article>${background.feat ? `<article class="origin-feature-card top-gap"><div><small>BACKGROUND FEAT</small><b>${esc(background.feat)}</b></div><p class="muted">${esc(feat?.description || '')}</p></article>` : ''}`)}
    `;
  }

  function coreActions() {
    return [
      ['core-attack', 'Attack', 'Action', 'Make one attack with a weapon or Unarmed Strike. Extra Attack can increase the number of attacks.', true],
      ['core-grapple', 'Grapple', 'Action', 'Replace one attack with an Unarmed Strike that attempts to Grapple a creature.', true],
      ['core-shove', 'Shove', 'Action', 'Replace one attack with an Unarmed Strike that pushes a creature or knocks it Prone.', true],
      ['core-dash', 'Dash', 'Action', 'Gain extra movement equal to your Speed for the current turn.'],
      ['core-disengage', 'Disengage', 'Action', 'Your movement does not provoke Opportunity Attacks for the rest of the turn.'],
      ['core-dodge', 'Dodge', 'Action', 'Attack rolls against you have Disadvantage if you can see the attacker, and you make Dexterity saves with Advantage.'],
      ['core-help', 'Help', 'Action', 'Assist another creature with a check or attack.'],
      ['core-hide', 'Hide', 'Action', 'Make a Dexterity (Stealth) check while sufficiently obscured or behind cover.'],
      ['core-influence', 'Influence', 'Action', 'Attempt to influence another creature through roleplay and an appropriate ability check.'],
      ['core-magic', 'Magic', 'Action', 'Cast a spell, use a magic item, or activate a magical feature that requires the Magic action.'],
      ['core-ready', 'Ready', 'Action', 'Choose a trigger and prepare an Action or movement as a Reaction.'],
      ['core-search', 'Search', 'Action', 'Use Wisdom to find something concealed.'],
      ['core-study', 'Study', 'Action', 'Use Intelligence to recall or discover relevant knowledge.'],
      ['core-utilize', 'Utilize', 'Action', 'Use a nonmagical object that requires an action.']
    ].map(([id, name, action, summary, attack]) => ({ id, name, action, summary, source: 'Core', group: 'core', isAttack: !!attack }));
  }

  function allActionRecords() {
    const source = state();
    const records = [];
    D.weaponAttacks(source).forEach(weapon => records.push({
      id: `weapon:${weapon.id}`, name: weapon.name, action: 'Action', source: 'Weapon', group: 'weapons',
      summary: [weapon.mastery ? `Mastery: ${weapon.mastery}` : '', weapon.description || ''].filter(Boolean).join('\n'),
      hit: S.signed(weapon.hit), damage: weapon.damage, isAttack: true
    }));
    (source.character.spells || []).forEach(spell => records.push({ ...spell, id: `spell:${spell.id}`, source: spell.source || 'Spell', group: 'spells', isAttack: !!spell.isAttack }));
    for (const entry of source.classes.treasureHunter.relics || []) {
      if (!entry.prepared) continue;
      const relic = Relics.find(item => item.id === entry.relicId);
      if (!relic || relic.action === 'Passive') continue;
      records.push({
        id: `relic:${entry.instanceId}`, name: relic.name, action: relic.action, source: 'Relic', group: 'relics',
        summary: relic.fullText || relic.summary, resource: { kind: 'relic', instanceId: entry.instanceId, used: entry.used, max: D.relicMax(entry, source) },
        isAttack: /attack|útok/i.test(relic.fullText || '')
      });
    }
    T.features.filter(feature => feature.level <= D.level(source) && feature.action !== 'Passive' && feature.action !== 'Resource').forEach(feature => records.push({
      id: feature.id, name: feature.name, action: feature.action, source: `Treasure Hunter ${feature.level}`, group: 'treasure',
      summary: feature.fullText || feature.summary, cost: Number(feature.cost) || 0, parentId: feature.parentId || FEATURE_PARENT[feature.id] || '',
      featureId: feature.id, uses: feature.uses || 0, isAttack: ATTACK_FEATURES.has(feature.id)
    }));
    records.push(...D.originActions(source));
    records.push(...coreActions());
    (source.character.customActions || []).forEach(action => records.push({ ...action, group: action.group || 'custom', source: action.source || 'Custom' }));
    return records;
  }

  function recordMatchesActionFilter(record, filter, records) {
    if (filter === 'all') return true;
    if (filter === 'attack') {
      if (record.isAttack) return true;
      let parent = record.parentId;
      while (parent) {
        const found = records.find(item => item.id === parent);
        if (found?.isAttack) return true;
        parent = found?.parentId;
      }
      return records.some(item => item.parentId === record.id && recordMatchesActionFilter(item, filter, records));
    }
    return actionFilterKey(record.action) === filter;
  }

  function actionResource(record) {
    if (record.resource?.kind === 'relic' && record.resource.max) {
      const left = Math.max(0, record.resource.max - Number(record.resource.used || 0));
      return `<div class="charge-row"><span>${left}/${record.resource.max} charges</span><div>${Array.from({ length: record.resource.max }, (_, index) => `<button type="button" class="charge-dot ${index < left ? 'filled' : ''}" data-relic-use="${esc(record.resource.instanceId)}" data-delta="${index < left ? 1 : -1}"></button>`).join('')}</div></div>`;
    }
    if (record.uses) {
      const used = Number(state().classes.treasureHunter.featureUses?.[record.featureId]) || 0;
      return `<div class="charge-row"><span>${Math.max(0, record.uses - used)}/${record.uses} uses</span><button type="button" class="small-btn" data-feature-use="${esc(record.featureId)}" data-delta="${used < record.uses ? 1 : -1}">${used < record.uses ? 'Use' : 'Restore'}</button></div>`;
    }
    return '';
  }

  function actionCard(record, depth = 0) {
    const source = state();
    const open = source.ui.openActions.includes(record.id);
    const favorite = source.ui.favoriteActions.includes(record.id);
    const roll = record.isAttack ? rollIndicator(D.effectiveRollMode('attack', '', source)) : '';
    return `<article class="row-card action-row ${open ? 'open' : ''} depth-${Math.min(depth, 3)}">
      <div class="row-main-wrap"><button type="button" class="row-main" data-action-toggle="${esc(record.id)}"><span><strong>${esc(record.name)}</strong><span class="row-meta"><span class="badge ${actionFilterKey(record.action)}">${esc(actionCode(record.action))}</span><span>${esc(record.source || '')}</span>${record.cost ? `<span>${record.cost} Cool</span>` : ''}</span></span><span class="action-numbers">${record.hit ? `<b>HIT ${esc(record.hit)}</b>` : ''}${record.damage ? `<b>DMG ${esc(record.damage)}</b>` : ''}${roll}<i>›</i></span></button><button type="button" class="favorite ${favorite ? 'on' : ''}" data-action-favorite="${esc(record.id)}" aria-label="Favorite">★</button></div>
      <div class="row-detail">${nl(record.summary || 'No additional rules text.')}${actionResource(record)}<div class="detail-actions">${record.cost || record.resource ? `<button type="button" class="small-btn primary" data-action-use="${esc(record.id)}">Use</button>` : ''}${record.custom ? `<button type="button" class="small-btn danger" data-custom-action-remove="${esc(record.id)}">Delete</button>` : ''}</div></div>
    </article>`;
  }

  function renderActionTree(records) {
    const byParent = new Map();
    records.forEach(record => {
      const parent = records.some(item => item.id === record.parentId) ? record.parentId : '';
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(record);
    });
    const render = (parent, depth) => (byParent.get(parent) || []).map(record => `${actionCard(record, depth)}${render(record.id, depth + 1)}`).join('');
    return render('', 0);
  }

  function renderActions() {
    const source = state();
    const records = allActionRecords();
    const filter = source.ui.actionFilter;
    const favoriteIds = source.ui.favoriteActions;
    const groups = [
      ['favorites', 'Favorites'], ['weapons', 'Weapons'], ['spells', 'Spells'], ['relics', 'Relics'],
      ['treasure', 'Treasure Hunter'], ['core', 'Core'], ['custom', 'Custom']
    ];
    let body = '';
    if (filter === 'all') {
      for (const [key, label] of groups) {
        const groupRecords = key === 'favorites' ? records.filter(record => favoriteIds.includes(record.id)) : records.filter(record => record.group === key);
        if (!groupRecords.length && key !== 'custom') continue;
        body += `<section class="action-group"><h3>${esc(label)}</h3><div class="list">${groupRecords.length ? renderActionTree(groupRecords) : '<div class="empty">No custom actions yet.</div>'}</div>${key === 'custom' ? '<button type="button" class="small-btn primary top-gap" data-new-action>+ Custom Action</button>' : ''}</section>`;
      }
    } else {
      const filtered = records.filter(record => recordMatchesActionFilter(record, filter, records));
      body = `<section class="action-group"><div class="list">${filtered.length ? renderActionTree(filtered) : '<div class="empty">No matching actions.</div>'}</div></section>`;
    }
    const filters = [['all', 'ALL'], ['attack', 'ATTACKS'], ['action', 'ACTIONS'], ['bonus', 'BONUS'], ['reaction', 'REACTIONS'], ['other', 'OTHER']].map(([key, label]) => `<button type="button" class="filter-btn ${filter === key ? 'active' : ''}" data-action-filter="${key}">${label}</button>`).join('');
    $('#actionsPage').innerHTML = `${pageIntro('ACTIONS', 'Fast gameplay actions')}${section('Filter', `<div class="filters">${filters}</div>`)}${body}`;
  }

  function renderSkills() {
    const source = state();
    const rows = Object.entries(D.SKILLS).map(([name, ability]) => {
      const status = D.skillStatus(name, source);
      const mode = D.effectiveRollMode('skill', name, source);
      return `<div class="skill-row"><button type="button" class="prof-dot ${status === 2 ? 'expert' : status === 1 ? 'prof' : ''}" data-skill-edit="${esc(name)}" aria-label="Edit ${esc(name)} proficiency">${status === 2 ? '◆' : status === 1 ? '●' : '○'}</button><button type="button" class="skill-name" data-stat-detail="skill:${esc(name)}">${esc(name)}</button><span class="skill-ability">${ability}</span><span class="skill-mod">${S.signed(D.skillMod(name, source))}</span>${rollIndicator(mode)}</div>`;
    }).join('');
    const lists = D.proficiencyLists(source);
    const details = (label, values) => `<details class="proficiency"><summary>${esc(label)}</summary><div class="prof-body">${esc(values.join(' • ') || '—')}</div></details>`;
    $('#skillsPage').innerHTML = `${pageIntro('SKILLS', 'Skills and proficiencies')}${section('Skills', rows)}${section('Proficiencies', `${details('Armor', lists.armor)}${details('Weapons', lists.weapons)}${details('Tools', lists.tools)}${details('Vehicles', lists.vehicles)}${details('Languages', lists.languages)}${details('Senses', lists.senses)}`)}`;
  }

  function choiceOptions(definition, selected, source) {
    if (definition.type === 'select') return (T[definition.source] || []).map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    if (definition.type === 'skill') return Object.keys(D.SKILLS).filter(name => D.skillStatus(name, source) > 0).map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    if (definition.type === 'weapon') {
      const weapons = [...new Set([...D.weaponAttacks(source).map(weapon => weapon.name), 'Club', 'Dagger', 'Handaxe', 'Javelin', 'Mace', 'Quarterstaff', 'Spear', 'Light Crossbow', 'Shortbow', 'Sling', 'Rapier', 'Scimitar', 'Shortsword', 'Whip', 'Hand Crossbow', 'Heavy Crossbow', 'Longbow', 'Pistol', 'Musket', 'Revolver', 'Rifle', 'Shotgun'])];
      return weapons.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    }
    return '';
  }

  function featureChoices(feature, source) {
    const definitions = T.choiceDefinitions?.[feature.id] || [];
    const selectedChoices = source.classes.treasureHunter.choices;
    if (!definitions.length) return '';
    return `<div class="feature-choices"><div class="eyebrow">REQUIRED CHOICES</div>${definitions.map(definition => {
      const raw = selectedChoices[definition.key];
      const values = Array.isArray(raw) ? raw : [raw || ''];
      return `<div class="choice-field"><b>${esc(definition.label)}</b>${Array.from({ length: definition.count }, (_, index) => {
        const selected = values[index] || '';
        if (['select', 'skill', 'weapon'].includes(definition.type)) return `<select data-feature-choice="${esc(definition.key)}" data-choice-index="${index}"><option value="">Choose…</option>${choiceOptions(definition, selected, source)}</select>`;
        return `<input data-feature-choice="${esc(definition.key)}" data-choice-index="${index}" value="${esc(selected)}" placeholder="${esc(definition.placeholder || '')}">`;
      }).join('')}</div>`;
    }).join('')}</div>`;
  }

  function featureCard(feature, depth = 0) {
    const source = state();
    const open = source.ui.openFeatures.includes(feature.id);
    const favorite = source.ui.favoriteFeatures.includes(feature.id);
    const used = Number(source.classes.treasureHunter.featureUses?.[feature.id]) || 0;
    return `<article class="row-card feature-card ${open ? 'open' : ''} depth-${Math.min(depth, 3)} ${feature.level > D.level(source) ? 'locked' : ''}">
      <div class="row-main-wrap"><button type="button" class="row-main" data-feature-toggle="${esc(feature.id)}"><span><strong>${esc(feature.name)}</strong><span class="row-meta"><span>Level ${feature.level}</span>${feature.kind === 'subclass' ? '<span>Occult Collector</span>' : ''}<span class="badge">${esc(actionCode(feature.action))}</span>${feature.cost ? `<span>${feature.cost} Cool</span>` : ''}</span></span><span>›</span></button><button type="button" class="favorite ${favorite ? 'on' : ''}" data-feature-favorite="${esc(feature.id)}">★</button></div>
      <div class="row-detail">${nl(feature.fullText || feature.summary)}${featureChoices(feature, source)}${feature.uses ? `<div class="charge-row"><span>${Math.max(0, feature.uses - used)}/${feature.uses} uses</span><button type="button" class="small-btn" data-feature-use="${esc(feature.id)}" data-delta="${used < feature.uses ? 1 : -1}">${used < feature.uses ? 'Use' : 'Restore'}</button></div>` : ''}</div>
    </article>`;
  }

  function featureMatches(feature, source) {
    const query = local.featureSearch.trim().toLowerCase();
    if (query && !`${feature.name} ${feature.summary} ${feature.fullText || ''}`.toLowerCase().includes(query)) return false;
    const filter = source.ui.featureFilter;
    if (filter === 'active') return feature.action !== 'Passive' || feature.uses;
    if (filter === 'passive') return feature.action === 'Passive' && !feature.uses;
    if (filter === 'subclass') return feature.kind === 'subclass';
    return true;
  }

  function renderFeatureTree(features) {
    const ids = new Set(features.map(feature => feature.id));
    const children = new Map();
    features.forEach(feature => {
      const parentId = feature.parentId || FEATURE_PARENT[feature.id];
      const parent = ids.has(parentId) ? parentId : '';
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(feature);
    });
    for (const values of children.values()) values.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const render = (parent, depth) => (children.get(parent) || []).map(feature => `${featureCard(feature, depth)}${render(feature.id, depth + 1)}`).join('');
    return render('', 0);
  }

  function renderFeatures() {
    const source = state();
    const missing = D.choiceRequirements(source);
    const progression = source.ui.featureView === 'progression';
    let features = T.features.filter(feature => progression || feature.level <= D.level(source)).filter(feature => featureMatches(feature, source));
    const favorite = new Set(source.ui.favoriteFeatures);
    features = features.sort((a, b) => (favorite.has(b.id) ? 1 : 0) - (favorite.has(a.id) ? 1 : 0) || a.level - b.level || a.name.localeCompare(b.name));
    const filters = [['all', 'ALL'], ['active', 'ACTIVE'], ['passive', 'PASSIVE'], ['subclass', 'SUBCLASS']].map(([key, label]) => `<button type="button" class="filter-btn ${source.ui.featureFilter === key ? 'active' : ''}" data-feature-filter="${key}">${label}</button>`).join('');
    $('#featuresPage').innerHTML = `${pageIntro('FEATURES', progression ? 'Complete level 1–20 progression' : `Available through level ${D.level(source)}`)}
      ${missing.length ? `<button type="button" class="choice-warning" data-open-builder><b>Required choices missing</b><span>${esc(missing.join(' • '))}</span></button>` : ''}
      ${section('Library', `<input id="featureSearch" class="search-inline" value="${esc(local.featureSearch)}" placeholder="Search features…"><div class="filters top-gap">${filters}</div><div class="view-switch top-gap"><button type="button" class="filter-btn ${!progression ? 'active' : ''}" data-feature-view="available">AVAILABLE</button><button type="button" class="filter-btn ${progression ? 'active' : ''}" data-feature-view="progression">PROGRESSION 1–20</button></div>`)}
      ${section('Features', `<div class="list feature-tree">${features.length ? renderFeatureTree(features) : '<div class="empty">Nothing found.</div>'}</div>`, `<span class="eyebrow">LEVEL ${D.level(source)}</span>`)}`;
  }

  function renderRelics() {
    const source = state();
    const level = D.level(source);
    const limits = T.relicLimit(level);
    const entries = source.classes.treasureHunter.relics.map(entry => ({ entry, definition: Relics.find(relic => relic.id === entry.relicId) })).filter(item => item.definition);
    entries.sort((a, b) => Number(b.entry.prepared) - Number(a.entry.prepared) || a.definition.level - b.definition.level || a.definition.name.localeCompare(b.definition.name));
    const prepared = entries.filter(item => item.entry.prepared).length;
    const reserve = entries.length - prepared;
    const openIds = source.ui.openRelics;
    const cards = entries.map(({ entry, definition }) => {
      const open = openIds.includes(entry.instanceId);
      const max = D.relicMax(entry, source);
      const left = Math.max(0, max - Number(entry.used || 0));
      const charges = max ? `<div class="charge-row"><span>${left}/${max} charges</span><div>${Array.from({ length: max }, (_, index) => `<button type="button" class="charge-dot ${index < left ? 'filled' : ''}" data-relic-use="${esc(entry.instanceId)}" data-delta="${index < left ? 1 : -1}" aria-label="${index < left ? 'Use' : 'Restore'} charge"></button>`).join('')}</div></div>` : '';
      const resistanceChoice = definition.choice === 'damageResistance' ? `<label>Chosen resistance<select data-relic-choice="${esc(entry.instanceId)}" data-choice-key="selectedDamageType"><option value="">Choose damage type…</option>${Rules.DAMAGE_TYPES.filter(([key]) => !['Bludgeoning', 'Piercing', 'Slashing', 'Force', 'Radiant'].includes(key)).map(([key, label]) => `<option value="${key}" ${entry.selectedDamageType === key ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>` : '';
      return `<article class="relic-card ${entry.prepared ? 'prepared' : ''} ${open ? 'open' : ''}">
        <div class="relic-top"><button type="button" class="relic-title" data-relic-toggle="${esc(entry.instanceId)}"><span><small>${entry.prepared ? 'PREPARED' : 'RESERVE'} • LEVEL ${definition.level}</small><b>${esc(definition.name)}</b></span><i>›</i></button><button type="button" class="small-btn ${entry.prepared ? 'primary' : ''}" data-relic-prepare="${esc(entry.instanceId)}">${entry.prepared ? 'Prepared' : 'Prepare'}</button></div>
        ${charges}<div class="relic-detail">${nl(definition.fullText || definition.summary)}${resistanceChoice}<div class="detail-actions"><button type="button" class="small-btn danger" data-relic-remove="${esc(entry.instanceId)}">Remove from collection</button></div></div>
      </article>`;
    }).join('') || '<div class="empty">No relics in the collection.</div>';
    const available = Relics.filter(relic => relic.level <= level && !entries.some(item => item.definition.id === relic.id)).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const options = available.map(relic => `<option value="${esc(relic.id)}">${esc(relic.name)} • level ${relic.level}</option>`).join('');
    $('#relicsPage').innerHTML = `${pageIntro('RELICS', 'Occult Collector collection and shared charges')}
      ${section('Capacity', `<div class="stat-grid">${stat('PREP', `${prepared}/${limits[0]}`, 'compact')}${stat('RESERVE', `${reserve}/${limits[1]}`, 'compact')}${stat('TOTAL', `${entries.length}/${limits[2]}`, 'compact')}${stat('RELIC DC', D.relicDC(source), 'compact')}</div>`)}
      ${section('Collection', `<div class="inline-form"><select id="relicSelect" ${entries.length >= limits[2] ? 'disabled' : ''}><option value="">Add relic…</option>${options}</select><button type="button" class="small-btn" data-relic-add ${entries.length >= limits[2] ? 'disabled' : ''}>+</button></div><div class="relic-grid top-gap">${cards}</div>`)}
    `;
  }

  function itemLocationOptions(selected) {
    return Object.entries(LOCATION_LABELS).map(([key, label]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }

  function allGearItems(source = state()) {
    return [
      ...(source.character.gear.weapons || []).map(item => ({ item, collection: 'weapons' })),
      ...(source.character.gear.armor || []).map(item => ({ item, collection: 'armor' })),
      ...(source.character.gear.inventory || []).map(item => ({ item, collection: 'inventory' }))
    ];
  }

  function renderGearItem(record, containers) {
    const source = state();
    const item = record.item;
    const open = source.ui.openItems.includes(item.id);
    const parent = containers.find(container => container.id === item.containerId);
    const fields = item.source === 'SRD 5.2.1' && Catalog ? Catalog.displayFields(item).map(([label, value]) => `<div class="formula-row"><span>${esc(label)}</span><span>${esc(value)}</span></div>`).join('') : '';
    const containerOptions = containers.filter(container => container.id !== item.id).map(container => `<option value="${esc(container.id)}" ${item.containerId === container.id ? 'selected' : ''}>${esc(container.name)}</option>`).join('');
    return `<article class="gear-card ${open ? 'open' : ''}">
      <button type="button" class="row-main" data-item-toggle="${esc(item.id)}"><span><strong>${esc(item.name)}</strong><span class="row-meta"><span>${esc(LOCATION_LABELS[item.location] || item.location)}</span>${parent ? `<span>Stored in ${esc(parent.name)}</span>` : ''}${item.quantity > 1 ? `<span>×${item.quantity}</span>` : ''}${item.rarityLabel || item.rarity ? `<span>${esc(item.rarityLabel || item.rarity)}</span>` : ''}</span></span><span>›</span></button>
      <div class="inventory-detail"><div class="form-grid two"><label>Location<select data-item-field="location" data-item-id="${esc(item.id)}">${itemLocationOptions(item.location)}</select></label><label>Quantity<input type="number" min="1" value="${item.quantity || 1}" data-item-field="quantity" data-item-id="${esc(item.id)}"></label><label>Stored in<select data-item-field="containerId" data-item-id="${esc(item.id)}"><option value="">No container</option>${containerOptions}</select></label><label class="check-label"><input type="checkbox" data-item-field="isContainer" data-item-id="${esc(item.id)}" ${item.isContainer ? 'checked' : ''}> Use as container</label>${item.attunement ? `<label class="check-label"><input type="checkbox" data-item-field="isAttuned" data-item-id="${esc(item.id)}" ${item.isAttuned ? 'checked' : ''}> Attuned</label>` : ''}</div>${fields ? `<div class="formula-list">${fields}</div>` : ''}<p>${nl(item.description || item.notes || '')}</p><div class="detail-actions"><button type="button" class="small-btn" data-item-edit="${esc(item.id)}">Edit</button><button type="button" class="small-btn danger" data-item-remove="${esc(item.id)}">Delete</button></div></div>
    </article>`;
  }

  function renderGear() {
    const source = state();
    const money = source.character.gear.money || {};
    const wallet = [['gp', 'GP', 'G'], ['ep', 'EP', 'E'], ['sp', 'SP', 'S'], ['cp', 'CP', 'C']].map(([key, label, short]) => `<span><b>${Number(money[key]) || 0}</b><i>${short}</i></span>`).join('');
    const records = allGearItems(source);
    const containers = records.map(record => record.item).filter(item => item.isContainer);
    records.sort((a, b) => Object.keys(LOCATION_LABELS).indexOf(a.item.location) - Object.keys(LOCATION_LABELS).indexOf(b.item.location) || String(a.item.name).localeCompare(String(b.item.name)));
    const itemCards = records.map(record => renderGearItem(record, containers)).join('') || '<div class="empty">Inventory is empty.</div>';
    $('#gearPage').innerHTML = `${pageIntro('GEAR', 'Equipment, locations, containers and money')}
      ${section('Money', `<button type="button" class="money-wallet" data-money-open>${wallet}<small>Tap to edit</small></button>`)}
      ${section('Inventory', `<div class="detail-actions"><button type="button" class="small-btn primary" data-open-catalog>+ D&D SRD item</button><button type="button" class="small-btn" data-new-item>+ Custom item</button></div><div class="gear-grid top-gap">${itemCards}</div><div class="catalog-attribution">${esc(Catalog?.attribution || '')}</div>`)}
    `;
  }

  function renderNpcs() {
    const source = state();
    const tab = source.ui.socialTab;
    const npcs = [...(source.campaign.npcs || [])].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    const cards = npcs.map(npc => `<article class="npc-card tile"><button type="button" class="npc-photo-button" data-npc-open="${esc(npc.id)}">${npc.image ? `<img class="npc-photo" src="${esc(npc.image)}" alt="">` : '<div class="npc-photo npc-placeholder">♟</div>'}</button><div class="npc-info"><div class="eyebrow">${esc(npc.tag || 'NPC')}${npc.location ? ` • ${esc(npc.location)}` : ''}</div><h3>${esc(npc.name)}</h3><p>${esc(npc.notes || '')}</p><div class="npc-actions"><button type="button" class="favorite ${npc.favorite ? 'on' : ''}" data-npc-favorite="${esc(npc.id)}">★</button><button type="button" class="small-btn" data-npc-open="${esc(npc.id)}">Open</button></div></div></article>`).join('') || '<div class="empty">No NPCs yet.</div>';
    const bio = source.character.bio || {};
    const bioRows = BIO_FIELDS.map(([key, label]) => `<div class="${LONG_BIO.has(key) ? 'wide' : ''}"><span>${esc(label)}</span><p>${nl(bio[key] || '—')}</p></div>`).join('');
    $('#npcsPage').innerHTML = `${pageIntro('NPC / BIO', 'Contacts and character biography')}
      <div class="social-tabs"><button type="button" class="${tab === 'npcs' ? 'active' : ''}" data-social-tab="npcs">NPCs</button><button type="button" class="${tab === 'bio' ? 'active' : ''}" data-social-tab="bio">BIO</button></div>
      ${tab === 'npcs' ? section('NPCs', `<button type="button" class="small-btn primary" data-new-npc>+ NPC</button><div class="npc-grid top-gap">${cards}</div>`) : section('Character Bio', `<button type="button" class="small-btn" data-bio-edit>Edit Bio</button><div class="bio-grid top-gap">${bioRows}</div>`)}
    `;
  }

  function renderAll() {
    renderTop();
    renderCharacter();
    renderActions();
    renderSkills();
    renderFeatures();
    renderRelics();
    renderGear();
    renderNpcs();
    updatePageChrome();
  }

  function currentPageIndex() {
    const pager = $('#pager');
    return Math.max(0, Math.min(PAGES.length - 1, Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth))));
  }
  function updatePageChrome(index = currentPageIndex()) {
    $('#pageTitle').textContent = TITLES[index];
    $$('#pageDots .page-dot').forEach((dot, dotIndex) => dot.classList.toggle('active', index === dotIndex));
  }
  function setPage(index, smooth = true, save = true) {
    const next = Math.max(0, Math.min(PAGES.length - 1, Number(index) || 0));
    const pager = $('#pager');
    const adjacent = Math.abs(next - currentPageIndex()) === 1;
    pager.scrollTo({ left: pager.clientWidth * next, behavior: smooth && adjacent ? 'smooth' : 'auto' });
    updatePageChrome(next);
    if (save && state().ui.page !== next) C.setUi('page', next);
  }
  function initDots() {
    $('#pageDots').innerHTML = PAGES.map((page, index) => `<button type="button" class="page-dot" data-page-dot="${index}" aria-label="${TITLES[index]}"></button>`).join('');
  }
  function onPagerScroll() {
    if (local.scrollRaf) return;
    local.scrollRaf = requestAnimationFrame(() => {
      local.scrollRaf = 0;
      const index = currentPageIndex();
      updatePageChrome(index);
      clearTimeout(local.scrollTimer);
      local.scrollTimer = setTimeout(() => { if (state().ui.page !== index) C.setUi('page', index); }, 160);
    });
  }

  function ensureDialogs() {
    $('#hpDialog').innerHTML = `<form method="dialog"><div class="dialog-head"><strong>Hit Points</strong><button value="cancel" class="icon-btn" aria-label="Close">×</button></div><div class="hp-status"><div><span>CURRENT</span><b id="hpCurrent">0</b></div><div><span>MAX</span><b id="hpMax">0</b></div><div><span>TEMP</span><b id="hpTempRead">0</b></div></div><div class="hp-picker-label">Amount</div><div class="hp-picker-row"><button type="button" id="hpMinus">−</button><input id="hpAmountInput" type="number" min="0" max="999" inputmode="numeric" value="1"><button type="button" id="hpPlus">+</button></div><div id="hpAmountWheel" class="hp-amount-wheel" aria-label="Scrollable damage or healing amount">${Array.from({ length: 100 }, (_, index) => `<button type="button" data-hp-wheel="${index + 1}">${index + 1}</button>`).join('')}</div><label>Damage Type<select id="hpDamageType"><option value="">No type / ignore defenses</option></select></label><div class="hp-actions"><button type="button" id="hpDamage" class="damage">Damage</button><button type="button" id="hpHeal" class="heal">Heal</button></div><label class="temp-row"><span>Temporary HP</span><input id="hpTemp" type="number" min="0" inputmode="numeric"></label></form>`;
    $('#editDialog').innerHTML = `<form method="dialog" id="editForm"><div class="dialog-head"><strong>Quick Character Edit</strong><button value="cancel" class="icon-btn" aria-label="Close">×</button></div><div id="portraitPreview" class="portrait-preview"><span>No portrait</span></div><label>Portrait<input id="editPortrait" type="file" accept="image/*"></label><div class="form-grid two"><label>Name<input id="editName" autocomplete="off"></label><label>Species<input id="editRace" readonly></label></div><label>Level<select id="editLevel"></select></label><label class="check-label"><input id="editHpAuto" type="checkbox"> Auto Max HP from level, CON and Tough</label><div class="form-grid two"><label>Manual Max HP<input id="editHpMax" type="number" min="1"></label><label>AC Mode<select id="editAcMode"><option value="auto">Automatic</option><option value="manual">Manual</option></select></label><label>Manual AC<input id="editAc" type="number" min="0"></label><label>Base Speed<input id="editSpeed" type="number" min="0" step="5"></label><label>Initiative Bonus<input id="editInitBonus" type="number"></label></div><small class="muted">Automatic AC is 10 + DEX while unarmored. Active armor, shields, items, relics and the Defence feat are calculated centrally.</small><div class="ability-editor" id="abilityEditor"></div><menu><button value="cancel" class="ghost">Cancel</button><button id="saveEdit" type="submit" class="primary">Save</button></menu></form>`;
    $('#actionDialog').innerHTML = `<form method="dialog" id="actionForm"><div class="dialog-head"><strong>Custom Action</strong><button value="cancel" class="icon-btn">×</button></div><label>Name<input id="customActionName" required></label><div class="form-grid two"><label>Action Type<select id="customActionType"><option>Action</option><option>Bonus Action</option><option>Reaction</option><option>Free</option><option>Other</option></select></label><label>Group<select id="customActionGroup"><option value="custom">Custom</option><option value="spells">Spell</option></select></label></div><label>Damage / Roll<input id="customActionDamage" placeholder="Optional, e.g. 2d6 Fire"></label><label>Rules / Notes<textarea id="customActionNotes" rows="6"></textarea></label><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">Add Action</button></menu></form>`;
    $('#npcDialog').innerHTML = `<form method="dialog" id="npcForm"><div class="dialog-head"><strong>NPC</strong><button value="cancel" class="icon-btn">×</button></div><input id="npcId" type="hidden"><div id="npcImagePreview" class="portrait-preview"><span>No portrait</span></div><label>Name<input id="npcName" required></label><div class="form-grid two"><label>Tag<input id="npcTag" placeholder="ALLY / CONTACT…"></label><label>Location<input id="npcLocation"></label></div><label>Portrait / Camera<input id="npcImage" type="file" accept="image/*" capture="environment"></label><label>Notes<textarea id="npcNotes" rows="7"></textarea></label><menu><button type="button" id="npcDeleteBtn" class="danger">Delete NPC</button><span class="menu-spacer"></span><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">Save NPC</button></menu></form>`;
    $('#charactersDialog form').insertAdjacentHTML('afterbegin', '<div class="roster-toolbar"><button type="button" class="small-btn" data-export-character>Export Character</button><button type="button" class="small-btn" data-export-roster>Export All</button><button type="button" class="small-btn" data-import-open>Import JSON</button></div>');

    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="builderDialog" class="sheet-dialog builder-dialog"><form method="dialog" id="builderForm"><div class="dialog-head"><strong>Character Builder</strong><button value="cancel" class="icon-btn">×</button></div><div class="builder-tabs"><button type="button" data-builder-tab="setup">LEVEL 1 SETUP</button><button type="button" data-builder-tab="progression">PROGRESSION</button><button type="button" data-builder-tab="data">JSON DATA</button></div><div id="builderBody"></div><menu><button value="cancel" class="ghost">Close</button><button id="builderSave" type="submit" class="primary">Save Setup</button></menu></form></dialog>
      <dialog id="bioDialog" class="sheet-dialog"><form method="dialog" id="bioForm"><div class="dialog-head"><strong>Character Bio</strong><button value="cancel" class="icon-btn">×</button></div><div id="bioFields"></div><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">Save Bio</button></menu></form></dialog>
      <dialog id="moneyDialog" class="sheet-dialog"><form method="dialog" id="moneyForm"><div class="dialog-head"><strong>Money</strong><button value="cancel" class="icon-btn">×</button></div><div class="money-edit-grid"><label>GP<input id="moneyGp" type="number" min="0" inputmode="numeric"></label><label>EP<input id="moneyEp" type="number" min="0" inputmode="numeric"></label><label>SP<input id="moneySp" type="number" min="0" inputmode="numeric"></label><label>CP<input id="moneyCp" type="number" min="0" inputmode="numeric"></label></div><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">Save</button></menu></form></dialog>
      <dialog id="itemEditDialog" class="sheet-dialog"><form method="dialog" id="itemEditForm"><div class="dialog-head"><strong id="itemEditTitle">Item</strong><button value="cancel" class="icon-btn">×</button></div><input id="itemEditId" type="hidden"><label>Name<input id="itemEditName" required></label><div class="form-grid two"><label>Location<select id="itemEditLocation">${itemLocationOptions('backpack')}</select></label><label>Quantity<input id="itemEditQuantity" type="number" min="1" value="1"></label></div><label class="check-label"><input id="itemEditContainer" type="checkbox"> Use as container</label><label>Notes<textarea id="itemEditNotes" rows="6"></textarea></label><menu><button value="cancel" class="ghost">Cancel</button><button type="submit" class="primary">Save Item</button></menu></form></dialog>
      <dialog id="statDialog" class="sheet-dialog"><form method="dialog"><div class="dialog-head"><strong id="statTitle">Stat</strong><button value="cancel" class="icon-btn">×</button></div><div id="statBody"></div></form></dialog>
      <dialog id="importDialog" class="sheet-dialog import-dialog"><form method="dialog"><div class="dialog-head"><strong>Import Character Data</strong><button value="cancel" class="icon-btn">×</button></div><label>JSON file<input id="importFile" type="file" accept="application/json,.json"></label><textarea id="importText" rows="14" spellcheck="false" placeholder="Paste complete character JSON…"></textarea><div id="importReport" class="import-report">V9/V7 character, roster, Character Craft and simple character JSON are supported.</div><menu><button value="cancel" class="ghost">Cancel</button><button type="button" id="applyImport" class="primary">Import</button></menu></form></dialog>
    `);
  }

  function setHpAmount(value, scroll = false) {
    local.hpAmount = Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
    $('#hpAmountInput').value = local.hpAmount;
    $$('#hpAmountWheel [data-hp-wheel]').forEach(button => button.classList.toggle('selected', Number(button.dataset.hpWheel) === local.hpAmount));
    if (scroll && local.hpAmount >= 1 && local.hpAmount <= 100) {
      const selected = $(`#hpAmountWheel [data-hp-wheel="${local.hpAmount}"]`);
      selected?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }

  function openHp() {
    const health = D.hp(state());
    $('#hpCurrent').textContent = health.current;
    $('#hpMax').textContent = health.max;
    $('#hpTempRead').textContent = health.temp;
    $('#hpTemp').value = health.temp;
    $('#hpDamageType').innerHTML = '<option value="">No type / ignore defenses</option>' + Rules.DAMAGE_TYPES.map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join('');
    setHpAmount(1);
    showDialog('#hpDialog');
    requestAnimationFrame(() => setHpAmount(1, true));
  }

  function openEdit() {
    const source = state();
    const c = source.character;
    local.pendingPortrait = c.portrait || '';
    $('#editName').value = c.name || '';
    $('#editRace').value = c.race || '';
    $('#editLevel').innerHTML = Array.from({ length: 20 }, (_, index) => `<option value="${index + 1}" ${index + 1 === D.level(source) ? 'selected' : ''}>Level ${index + 1}</option>`).join('');
    $('#editHpAuto').checked = c.hp.auto !== false;
    $('#editHpMax').value = D.hpMax(source);
    $('#editHpMax').disabled = c.hp.auto !== false;
    $('#editAcMode').value = c.acMode;
    $('#editAc').value = c.acManual;
    $('#editAc').disabled = c.acMode !== 'manual';
    $('#editSpeed').value = c.speed;
    $('#editInitBonus').value = c.initiativeBonus || 0;
    $('#abilityEditor').innerHTML = S.A.map(ability => `<label>${ability}<input type="number" min="1" max="30" value="${D.ability(ability, source)}" data-edit-ability="${ability}"></label>`).join('');
    $('#portraitPreview').innerHTML = local.pendingPortrait ? `<img src="${esc(local.pendingPortrait)}" alt="">` : '<span>No portrait</span>';
    $('#editPortrait').value = '';
    showDialog('#editDialog');
  }

  function builderOption(value, selected, label = value) { return `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`; }
  function builderAbilityChoices(background) {
    const count = background.abilityMode === '+1/+1/+1' ? 3 : 2;
    return Array.from({ length: count }, (_, index) => `<label>${background.abilityMode === '+1/+1/+1' ? '+1' : index === 0 ? '+2' : '+1'} ability<select data-builder-origin-ability="${index}"><option value="">Choose…</option>${S.A.map(ability => builderOption(ability, background.abilityChoices?.[index] || '')).join('')}</select></label>`).join('');
  }
  function builderFeatExtra(background) {
    if (background.feat === 'Resilient') return `<label>Resilient ability<select id="builderResilient"><option value="">Choose…</option>${S.A.map(ability => builderOption(ability, background.resilientAbility || '')).join('')}</select></label>`;
    if (background.feat === 'Skilled') return Array.from({ length: 3 }, (_, index) => `<label>Skilled choice ${index + 1}<input data-builder-skilled="${index}" value="${esc(background.skilledChoices?.[index] || '')}" placeholder="Skill or tool"></label>`).join('');
    return '';
  }

  function renderBuilderSetup() {
    const source = state();
    const c = source.character;
    const choices = D.choices(source);
    const origin = c.origin;
    const background = Origin.background(source);
    const selectedClassSkills = new Set(choices.classSkills || []);
    const missing = [...Origin.originIncomplete(source), ...D.choiceRequirements(source)];
    const species = Origin.species(source);
    const speciesChoices = species?.id === 'city_goblin_lukys_campaign' ? `<div id="builderSpeciesChoices" class="builder-choice-fields"><label>City Goblin skill 1<select id="builderSpeciesSkill0"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, origin.speciesChoices?.skills?.[0] || '')).join('')}</select></label><label>City Goblin skill 2<select id="builderSpeciesSkill1"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, origin.speciesChoices?.skills?.[1] || '')).join('')}</select></label><label>Simple Weapon<select id="builderSpeciesWeapon"><option value="">Choose…</option>${Origin.SIMPLE_WEAPONS.map(weapon => builderOption(weapon, origin.speciesChoices?.simpleWeapon || '')).join('')}</select></label></div>` : '<div id="builderSpeciesChoices"></div>';
    $('#builderBody').innerHTML = `<div class="builder-status ${missing.length ? 'warning' : 'complete'}">${missing.length ? `Missing: ${esc(missing.join(' • '))}` : 'Required choices complete ✓'}</div>
      <section class="builder-block"><h3>Identity</h3><div class="form-grid two"><label>Name<input id="builderName" value="${esc(c.name)}"></label><label>Level<select id="builderLevel">${Array.from({ length: 20 }, (_, index) => builderOption(String(index + 1), String(D.level(source)), `Level ${index + 1}`)).join('')}</select></label><label>Species<select id="builderSpecies"><option value="">Choose species…</option>${Origin.SPECIES.map(item => builderOption(item.name, origin.species || c.race)).join('')}</select></label><label>Background<select disabled><option>${esc(Origin.BACKGROUND.name)}</option></select></label></div>${species && !species.mechanicsAvailable ? '<div class="origin-note warning">No complete mechanical source was supplied for this species. No mechanics will be invented.</div>' : ''}${speciesChoices}</section>
      <section class="builder-block"><h3>Final Ability Scores</h3><small class="muted">Enter final values after origin bonuses. The canonical base values are derived when saving.</small><div class="builder-abilities">${S.A.map(ability => `<label>${ability}<input type="number" min="1" max="30" value="${D.ability(ability, source)}" data-builder-ability="${ability}"></label>`).join('')}</div><label class="check-label"><input id="builderHpAuto" type="checkbox" ${c.hp.auto !== false ? 'checked' : ''}> Automatic Max HP</label><label>Manual Max HP<input id="builderHpMax" type="number" min="1" value="${D.hpMax(source)}" ${c.hp.auto !== false ? 'disabled' : ''}></label></section>
      <section class="builder-block"><h3>${esc(Origin.BACKGROUND.name)}</h3><div class="builder-choice-fields"><label>Skill 1<select id="builderBgSkill0"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, background.skills?.[0] || '')).join('')}</select></label><label>Skill 2<select id="builderBgSkill1"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, background.skills?.[1] || '')).join('')}</select></label><label>Tool / Kit / Supplies<input id="builderBgTool" value="${esc(background.tool || '')}"></label><label>Instrument / Game / Vehicle<input id="builderBgSecondary" value="${esc(background.secondary || '')}"></label><label>Ability boosts<select id="builderAbilityMode"><option value="+2/+1" ${background.abilityMode !== '+1/+1/+1' ? 'selected' : ''}>+2 / +1</option><option value="+1/+1/+1" ${background.abilityMode === '+1/+1/+1' ? 'selected' : ''}>+1 / +1 / +1</option></select></label><label>Origin feat<select id="builderFeat"><option value="">Choose…</option>${Object.keys(Origin.BACKGROUND.feats).map(feat => builderOption(feat, background.feat || '')).join('')}</select></label></div><div id="builderAbilityChoices" class="builder-choice-fields">${builderAbilityChoices(background)}</div><div id="builderFeatExtra" class="builder-choice-fields">${builderFeatExtra(background)}</div><div id="builderFeatInfo" class="origin-note ${background.feat ? '' : 'warning'}">${background.feat ? `<b>${esc(background.feat)}</b><span>${esc(Origin.BACKGROUND.feats[background.feat]?.description || '')}</span>` : 'Choose the background feat.'}</div></section>
      <section class="builder-block"><h3>Treasure Hunter — Level 1</h3><p class="muted">Choose exactly 3 class skills. These are the same canonical choices displayed in Features.</p><div class="class-skill-picker">${T.classSkills.map(skill => `<label><input type="checkbox" data-builder-class-skill="${esc(skill)}" ${selectedClassSkills.has(skill) ? 'checked' : ''}>${esc(skill)}</label>`).join('')}</div><div class="builder-choice-fields"><label>Starodávný jazyk 1<select id="builderLanguage0"><option value="">Choose…</option>${T.ancientLanguages.map(value => builderOption(value, choices.ancientLanguages?.[0] || '')).join('')}</select></label><label>Starodávný jazyk 2<select id="builderLanguage1"><option value="">Choose…</option>${T.ancientLanguages.map(value => builderOption(value, choices.ancientLanguages?.[1] || '')).join('')}</select></label><label>Starodávný jazyk 3<select id="builderLanguage2"><option value="">Choose…</option>${T.ancientLanguages.map(value => builderOption(value, choices.ancientLanguages?.[2] || '')).join('')}</select></label><label>Vehicle 1<input id="builderVehicle0" value="${esc(choices.vehicles?.[0] || '')}"></label><label>Vehicle 2<input id="builderVehicle1" value="${esc(choices.vehicles?.[1] || '')}"></label><label>Expertise<select id="builderExpertise"><option value="">Choose proficient skill…</option>${Object.keys(D.SKILLS).map(skill => builderOption(skill, choices.expertise || '')).join('')}</select></label><label>Weapon Mastery 1<input id="builderMastery0" value="${esc(choices.weaponMasteries?.[0] || '')}"></label><label>Weapon Mastery 2<input id="builderMastery1" value="${esc(choices.weaponMasteries?.[1] || '')}"></label></div></section>
      <section class="builder-block"><h3>Starting Equipment Choices</h3><div class="form-grid two"><label>Finesse / melee weapon<input id="builderStartMelee" value="${esc(choices.startingMelee || '')}"></label><label>Ranged weapon / firearm<input id="builderStartRanged" value="${esc(choices.startingRanged || '')}"></label></div><small class="muted">Leather Armor, Whip, Thieves’ Tools, Navigator’s Tools and Explorer’s Pack are fixed class equipment.</small></section>`;
  }

  function renderBuilderProgression() {
    const source = state();
    $('#builderBody').innerHTML = `<div class="progression-list">${Array.from({ length: 20 }, (_, index) => {
      const level = index + 1;
      const features = T.features.filter(feature => feature.level === level);
      const choiceCount = features.reduce((count, feature) => count + (T.choiceDefinitions?.[feature.id]?.length || 0), 0);
      return `<section class="progression-level ${level <= D.level(source) ? 'reached' : ''}"><b>LEVEL ${level}</b><div>${features.map(feature => `<span>${esc(feature.name)}</span>`).join('') || '<span>—</span>'}</div>${choiceCount ? '<i>CHOICE</i>' : ''}</section>`;
    }).join('')}</div>`;
  }

  function renderBuilderData() {
    $('#builderBody').innerHTML = `<div class="builder-data"><p class="muted">Export contains the complete canonical character state. Paste a full V9/V7, Character Craft, roster or simple character JSON to import it.</p><textarea id="builderJson" rows="18" spellcheck="false">${esc(JSON.stringify(state(), null, 2))}</textarea><div class="detail-actions"><button type="button" class="small-btn" data-builder-copy-json>Copy</button><button type="button" class="small-btn" data-export-character>Download</button><button type="button" class="small-btn primary" data-builder-import-json>Import pasted JSON</button></div></div>`;
  }

  function renderBuilder() {
    $$('#builderDialog [data-builder-tab]').forEach(button => button.classList.toggle('active', button.dataset.builderTab === local.builderTab));
    $('#builderSave').hidden = local.builderTab !== 'setup';
    if (local.builderTab === 'progression') renderBuilderProgression();
    else if (local.builderTab === 'data') renderBuilderData();
    else renderBuilderSetup();
  }
  function openBuilder(tab = 'setup') { local.builderTab = tab; renderBuilder(); showDialog('#builderDialog'); }

  function collectBuilder() {
    return {
      name: $('#builderName').value, level: $('#builderLevel').value, species: $('#builderSpecies').value,
      speciesChoices: { skills: [$('#builderSpeciesSkill0')?.value || '', $('#builderSpeciesSkill1')?.value || ''], simpleWeapon: $('#builderSpeciesWeapon')?.value || '' },
      background: {
        skills: [$('#builderBgSkill0').value, $('#builderBgSkill1').value], tool: $('#builderBgTool').value.trim(), secondary: $('#builderBgSecondary').value.trim(),
        feat: $('#builderFeat').value, abilityMode: $('#builderAbilityMode').value,
        abilityChoices: $$('[data-builder-origin-ability]').map(element => element.value), resilientAbility: $('#builderResilient')?.value || '',
        skilledChoices: $$('[data-builder-skilled]').map(element => element.value.trim()), luckUsed: Origin.background(state()).luckUsed || 0
      },
      abilities: Object.fromEntries($$('[data-builder-ability]').map(input => [input.dataset.builderAbility, Number(input.value) || 10])),
      hpAuto: $('#builderHpAuto').checked, hpMax: $('#builderHpMax').value,
      classSkills: $$('[data-builder-class-skill]:checked').map(input => input.dataset.builderClassSkill),
      ancientLanguages: [$('#builderLanguage0').value, $('#builderLanguage1').value, $('#builderLanguage2').value],
      vehicles: [$('#builderVehicle0').value.trim(), $('#builderVehicle1').value.trim()], expertise: $('#builderExpertise').value,
      weaponMasteries: [$('#builderMastery0').value.trim(), $('#builderMastery1').value.trim()],
      startingMelee: $('#builderStartMelee').value.trim(), startingRanged: $('#builderStartRanged').value.trim()
    };
  }

  function openStatDetail(specifier) {
    const [kind, key = ''] = String(specifier || '').split(':');
    const source = state();
    let title = 'Stat', body = '', rollKind = '', rollKey = key;
    if (kind === 'ac') {
      const breakdown = D.armorBreakdown(source);
      title = `Armor Class ${breakdown.value}`;
      body = `<div class="formula-list">${breakdown.parts.map(([label, value]) => `<div class="formula-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div>`;
    } else if (kind === 'initiative') {
      title = `Initiative ${S.signed(D.initiative(source))}`; rollKind = 'initiative';
      body = `<div class="formula-list"><div class="formula-row"><span>DEX</span><b>${S.signed(D.mod('DEX', source))}</b></div><div class="formula-row"><span>Other modifiers</span><b>${S.signed(D.initiative(source) - D.mod('DEX', source))}</b></div></div>`;
    } else if (kind === 'save') {
      title = `${key} Save ${D.saveMod(key, source) == null ? 'AUTO FAIL' : S.signed(D.saveMod(key, source))}`; rollKind = 'save';
      body = `<div class="formula-list"><div class="formula-row"><span>Ability</span><b>${S.signed(D.mod(key, source))}</b></div><div class="formula-row"><span>Proficient</span><b>${D.isSaveProficient(key, source) ? 'Yes' : 'No'}</b></div></div>`;
    } else if (kind === 'skill') {
      title = `${key} ${S.signed(D.skillMod(key, source))}`; rollKind = 'skill';
      body = `<label>Manual proficiency<select data-skill-status="${esc(key)}"><option value="0" ${D.skillStatus(key, source) === 0 ? 'selected' : ''}>Not proficient</option><option value="1" ${D.skillStatus(key, source) === 1 ? 'selected' : ''}>Proficient</option><option value="2" ${D.skillStatus(key, source) === 2 ? 'selected' : ''}>Expertise</option></select></label>`;
    }
    if (rollKind) {
      const effective = D.effectiveRollMode(rollKind, rollKey, source);
      const manual = rollKind === 'initiative' ? source.character.rollModes.initiative : source.character.rollModes[rollKind === 'save' ? 'saves' : 'skills']?.[rollKey] || 'normal';
      body += effective.locked ? `<div class="locked-roll"><b>${rollIndicator(effective)} Forced roll state</b><span>${esc(effective.sources.join(', '))}. Remove or change the source to unlock it.</span></div>` : `<label>Manual roll mode<select data-roll-mode="${rollKind}" data-roll-key="${esc(rollKey)}"><option value="normal" ${manual === 'normal' ? 'selected' : ''}>Normal</option><option value="advantage" ${manual === 'advantage' ? 'selected' : ''}>Advantage</option><option value="disadvantage" ${manual === 'disadvantage' ? 'selected' : ''}>Disadvantage</option></select></label>`;
    }
    $('#statTitle').textContent = title;
    $('#statBody').innerHTML = body;
    showDialog('#statDialog');
  }

  function openMoney() {
    const money = state().character.gear.money;
    $('#moneyGp').value = money.gp || 0; $('#moneyEp').value = money.ep || 0; $('#moneySp').value = money.sp || 0; $('#moneyCp').value = money.cp || 0;
    showDialog('#moneyDialog');
  }
  function findGearItem(id) { return allGearItems().find(record => record.item.id === id)?.item || null; }
  function openItemEditor(id = '') {
    const item = id ? findGearItem(id) : null;
    local.activeItemId = item?.id || '';
    $('#itemEditTitle').textContent = item ? 'Edit Item' : 'Custom Item';
    $('#itemEditId').value = item?.id || '';
    $('#itemEditName').value = item?.name || '';
    $('#itemEditLocation').value = item?.location || 'backpack';
    $('#itemEditQuantity').value = item?.quantity || 1;
    $('#itemEditContainer').checked = !!item?.isContainer;
    $('#itemEditNotes').value = item?.notes || item?.description || '';
    showDialog('#itemEditDialog');
  }

  function openNpc(id = '') {
    const npc = state().campaign.npcs.find(item => item.id === id) || {};
    local.activeNpcId = npc.id || '';
    local.pendingNpcImage = npc.image || '';
    $('#npcId').value = npc.id || '';
    $('#npcName').value = npc.name || '';
    $('#npcTag').value = npc.tag || '';
    $('#npcLocation').value = npc.location || '';
    $('#npcNotes').value = npc.notes || '';
    $('#npcImage').value = '';
    $('#npcImagePreview').innerHTML = local.pendingNpcImage ? `<img src="${esc(local.pendingNpcImage)}" alt="">` : '<span>No portrait</span>';
    $('#npcDeleteBtn').hidden = !npc.id;
    showDialog('#npcDialog');
  }
  function openBio() {
    const bio = state().character.bio || {};
    $('#bioFields').innerHTML = `<div class="bio-form">${BIO_FIELDS.map(([key, label]) => `<label>${esc(label)}${LONG_BIO.has(key) ? `<textarea rows="${key === 'backstory' ? 7 : 3}" data-bio-field="${key}">${esc(bio[key] || '')}</textarea>` : `<input data-bio-field="${key}" value="${esc(bio[key] || '')}">`}</label>`).join('')}</div>`;
    showDialog('#bioDialog');
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  }

  function parseBackgroundSelections(description = '') {
    const selected = { skills: [], tool: '', secondary: '', abilityChoices: [], abilityMode: '+2/+1' };
    const skills = description.match(/Skills?:\s*([^\n.]+)/i);
    if (skills) selected.skills = skills[1].split(/,| and /i).map(value => value.trim()).filter(Boolean).slice(0, 2);
    const tool = description.match(/Tool:\s*([^\n.]+)/i); if (tool) selected.tool = tool[1].trim();
    const secondary = description.match(/(?:Vehicle|Instrument|Game(?: Set)?):\s*([^\n.]+)/i); if (secondary) selected.secondary = secondary[1].trim();
    const ability = description.match(/Ability Scores?:\s*([^\n.]+)/i);
    const map = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' };
    const bonuses = [];
    if (ability) for (const match of ability[1].matchAll(/\+(\d)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/gi)) {
      const normalized = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      if (map[normalized]) bonuses.push([map[normalized], Number(match[1])]);
    }
    selected.abilityMode = bonuses.some(([, bonus]) => bonus === 2) ? '+2/+1' : '+1/+1/+1';
    selected.abilityChoices = bonuses.sort((a, b) => b[1] - a[1]).map(([key]) => key);
    return selected;
  }

  function inferCharacterCraftLevel(payload) {
    for (const candidate of [payload.level, payload.characterLevel, payload.levelNumber]) {
      const value = Number(candidate); if (value >= 1 && value <= 20) return value;
    }
    for (const classEntry of Array.isArray(payload.class) ? payload.class : []) {
      const direct = Number(classEntry.level); if (direct >= 1 && direct <= 20) return direct;
      const levels = Object.keys(classEntry.hpGainedPerLevel || {}).map(Number).filter(Number.isFinite);
      if (levels.length) return Math.max(...levels);
    }
    return 1;
  }

  function importedItems(payload) {
    const items = payload.inventory || payload.items || payload.equipment;
    if (!Array.isArray(items)) return [];
    return items.map((source, index) => {
      if (typeof source === 'string') return { id: `import-item-${index + 1}`, name: source, quantity: 1, location: 'backpack', modifiers: [] };
      return {
        ...S.clone(source), id: source.id || source.uid || `import-item-${index + 1}`,
        name: source.name || source.itemName || 'Imported item', quantity: Number(source.quantity) || 1,
        location: S.ITEM_LOCATIONS.includes(source.location) ? source.location : 'backpack', modifiers: Array.isArray(source.modifiers) ? source.modifiers : []
      };
    });
  }

  function importCharacterCraft(payload) {
    const next = S.fresh();
    const c = next.character;
    c.name = payload.name || 'Imported Character';
    c.level = inferCharacterCraftLevel(payload);
    const abilityMap = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA', STR: 'STR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'WIS', CHA: 'CHA' };
    const finalAbilities = {};
    for (const [key, value] of Object.entries(payload.attributes || payload.abilities || {})) if (abilityMap[key] && Number.isFinite(Number(value))) finalAbilities[abilityMap[key]] = Number(value);
    const species = typeof payload.species === 'string' ? { name: payload.species } : (payload.species || {});
    if (species.name) {
      c.race = species.name;
      c.origin.species = species.name;
      c.origin.speciesChoices.skills = Array.isArray(species.skillProficiencies) ? species.skillProficiencies.slice(0, 2) : [];
      c.origin.speciesChoices.simpleWeapon = Array.isArray(species.proficiency) ? species.proficiency.find(value => Origin.SIMPLE_WEAPONS.includes(value)) || '' : '';
    }
    const background = typeof payload.background === 'string' ? { name: payload.background, description: '' } : (payload.background || {});
    if (background.name) {
      const parsed = parseBackgroundSelections(background.description || '');
      const rawFeat = (Array.isArray(background.features) && background.features[0]?.name) || String(background.name).split(' - ').pop();
      c.origin.background = { ...c.origin.background, ...parsed, feat: Object.prototype.hasOwnProperty.call(Origin.BACKGROUND.feats, rawFeat) ? rawFeat : '', name: Origin.BACKGROUND.name };
      c.bio.background = background.name;
    }
    const bonuses = Origin.abilityBonuses(next);
    for (const ability of S.A) c.abilities[ability] = Math.max(1, Math.min(30, Number(finalAbilities[ability] ?? 10) - Number(bonuses[ability] || 0)));
    const hpPerLevel = Array.isArray(payload.class) ? payload.class[0]?.hpGainedPerLevel : null;
    if (hpPerLevel && typeof hpPerLevel === 'object') {
      const total = Object.values(hpPerLevel).reduce((sum, value) => sum + (Number(value) || 0), 0);
      if (total > 0) c.hp = { current: total, max: total, temp: 0, auto: false };
    } else if (payload.hp && typeof payload.hp === 'object') {
      c.hp.current = Number(payload.hp.current) || c.hp.current;
      c.hp.max = Number(payload.hp.max || payload.maxHp) || c.hp.max;
      c.hp.temp = Number(payload.hp.temp) || 0;
      c.hp.auto = payload.hp.auto !== false;
    }
    if (typeof payload.image === 'string') c.portrait = payload.image;
    c.gear.inventory = importedItems(payload);
    if (payload.bio && typeof payload.bio === 'object') c.bio = { ...c.bio, ...payload.bio };
    if (payload.treasureHunter && typeof payload.treasureHunter === 'object') next.classes.treasureHunter = { ...next.classes.treasureHunter, ...S.clone(payload.treasureHunter) };
    if (Array.isArray(payload.relics)) next.classes.treasureHunter.relics = S.clone(payload.relics);
    return S.normalize(next);
  }

  function importSimple(payload) {
    const next = S.fresh();
    const c = next.character;
    c.name = payload.name || '';
    c.level = Math.max(1, Math.min(20, Number(payload.level) || 1));
    c.race = payload.species || payload.race || '';
    c.origin.species = c.race;
    for (const ability of S.A) if (payload.abilities?.[ability] != null) c.abilities[ability] = Number(payload.abilities[ability]) || 10;
    if (payload.hp && typeof payload.hp === 'object') c.hp = { ...c.hp, ...payload.hp };
    if (payload.skills && typeof payload.skills === 'object') c.skills = { ...payload.skills };
    if (payload.gear && typeof payload.gear === 'object') c.gear = { ...c.gear, ...S.clone(payload.gear) };
    if (payload.bio && typeof payload.bio === 'object') c.bio = { ...c.bio, ...payload.bio };
    if (payload.treasureHunter && typeof payload.treasureHunter === 'object') next.classes.treasureHunter = { ...next.classes.treasureHunter, ...S.clone(payload.treasureHunter) };
    return S.normalize(next);
  }

  function parseImport(text) {
    const payload = JSON.parse(text);
    if (payload && Array.isArray(payload.profiles)) return { kind: 'roster', data: payload };
    if (payload?.character && payload?.classes) return { kind: 'native', data: payload };
    if (payload?.name && (payload.species || payload.attributes) && (Array.isArray(payload.class) || payload.background)) return { kind: 'character-craft', data: importCharacterCraft(payload) };
    if (payload?.format || payload?.name || payload?.abilities) return { kind: 'simple', data: importSimple(payload) };
    throw new Error('JSON format not recognized.');
  }

  function applyImportText(text) {
    const parsed = parseImport(text);
    if (parsed.kind === 'roster') {
      if (!Roster?.importAll(parsed.data)) throw new Error('Roster could not be imported.');
    } else {
      if (parsed.kind === 'character-craft' || parsed.kind === 'simple') parsed.data.campaign = S.clone(state().campaign);
      S.replace(parsed.data, `import:${parsed.kind}`);
      S.flush();
      Roster?.saveCurrent();
    }
    return parsed.kind;
  }

  function openImport() {
    $('#importText').value = '';
    $('#importFile').value = '';
    $('#importReport').textContent = 'Paste JSON or choose a file.';
    showDialog('#importDialog');
  }

  async function renderCatalogResults() {
    const host = $('#itemResults');
    if (!host || !Catalog) return;
    const request = (local.catalogRequest || 0) + 1;
    local.catalogRequest = request;
    host.innerHTML = '<div class="empty">Loading D&D SRD 5.2.1 items…</div>';
    try {
      const items = await Catalog.search(local.catalogQuery, { rarity: local.catalogRarity, kind: local.catalogKind });
      if (request !== local.catalogRequest) return;
      local.catalogItems = items.slice(0, 180);
      host.innerHTML = local.catalogItems.map(item => `<article class="catalog-item"><div><strong>${esc(item.name)}</strong><small>${esc(item.kind)} • ${esc(item.rarityLabel || item.rarity)} • ${esc(item.category)}</small></div><button type="button" class="small-btn" data-catalog-add="${esc(item.id)}">Add</button></article>`).join('') || '<div class="empty">No matching items.</div>';
    } catch (error) {
      host.innerHTML = `<div class="empty">Catalog unavailable. You can still add a custom item.<br>${esc(error.message)}</div>`;
    }
  }
  function openCatalog() {
    local.catalogQuery = '';
    local.catalogRarity = 'all';
    local.catalogKind = 'all';
    $('#itemSearch').value = '';
    $('#itemRarity').value = 'all';
    $('#itemKind').value = 'all';
    showDialog('#itemDialog');
    renderCatalogResults();
  }

  function renderRoster() {
    if (!Roster) return;
    const active = Roster.activeId();
    const profiles = Roster.list();
    $('#rosterList').innerHTML = profiles.map(profile => `<article class="roster-card ${profile.id === active ? 'active' : ''}">${profile.portrait ? `<img src="${esc(profile.portrait)}" alt="">` : '<div class="roster-placeholder">♟</div>'}<div><strong>${esc(profile.name)}</strong><small>Level ${profile.level} ${esc(profile.race || '')}</small><div class="detail-actions">${profile.id === active ? '<span class="chip brass">Current</span>' : `<button type="button" class="small-btn primary" data-roster-switch="${esc(profile.id)}">Open</button>`}<button type="button" class="small-btn" data-roster-duplicate="${esc(profile.id)}">Duplicate</button>${profiles.length > 1 ? `<button type="button" class="small-btn danger" data-roster-delete="${esc(profile.id)}">Delete</button>` : ''}</div></div></article>`).join('');
    showDialog('#charactersDialog');
  }

  function renderGlobalSearch() {
    const query = $('#globalSearch').value.trim().toLowerCase();
    if (!query) { $('#globalSearchResults').innerHTML = ''; return; }
    const source = state();
    const results = [];
    T.features.filter(feature => feature.level <= D.level(source)).forEach(feature => { if (`${feature.name} ${feature.summary}`.toLowerCase().includes(query)) results.push({ type: 'FEATURE', title: feature.name, page: 3 }); });
    Relics.filter(relic => relic.level <= D.level(source)).forEach(relic => { if (`${relic.name} ${relic.summary}`.toLowerCase().includes(query)) results.push({ type: 'RELIC', title: relic.name, page: 4 }); });
    allGearItems(source).forEach(({ item }) => { if (`${item.name} ${item.description || ''}`.toLowerCase().includes(query)) results.push({ type: 'ITEM', title: item.name, page: 5 }); });
    source.campaign.npcs.forEach(npc => { if (`${npc.name} ${npc.notes || ''}`.toLowerCase().includes(query)) results.push({ type: 'NPC', title: npc.name, page: 6 }); });
    $('#globalSearchResults').innerHTML = results.slice(0, 40).map(result => `<button type="button" class="search-result" data-search-jump="${result.page}"><small>${result.type}</small><strong>${esc(result.title)}</strong></button>`).join('') || '<div class="empty">Nothing found.</div>';
  }

  function refreshBuilderSpecies() {
    const name = $('#builderSpecies').value;
    const selected = Origin.SPECIES.find(species => species.name === name);
    const box = $('#builderSpeciesChoices');
    if (!box) return;
    box.innerHTML = selected?.id === 'city_goblin_lukys_campaign' ? `<div class="builder-choice-fields"><label>City Goblin skill 1<select id="builderSpeciesSkill0"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, '')).join('')}</select></label><label>City Goblin skill 2<select id="builderSpeciesSkill1"><option value="">Choose…</option>${Origin.SKILLS.map(skill => builderOption(skill, '')).join('')}</select></label><label>Simple Weapon<select id="builderSpeciesWeapon"><option value="">Choose…</option>${Origin.SIMPLE_WEAPONS.map(weapon => builderOption(weapon, '')).join('')}</select></label></div>` : selected && !selected.mechanicsAvailable ? '<div class="origin-note warning">No complete mechanical source was supplied for this species. No mechanics will be invented.</div>' : '';
  }
  function refreshBuilderAbilities() {
    const mode = $('#builderAbilityMode').value;
    const previous = $$('[data-builder-origin-ability]').map(select => select.value);
    $('#builderAbilityChoices').innerHTML = builderAbilityChoices({ abilityMode: mode, abilityChoices: previous });
  }
  function refreshBuilderFeat() {
    const feat = $('#builderFeat').value;
    const previous = Origin.background(state());
    $('#builderFeatExtra').innerHTML = builderFeatExtra({ ...previous, feat });
    $('#builderFeatInfo').classList.toggle('warning', !feat);
    $('#builderFeatInfo').innerHTML = feat ? `<b>${esc(feat)}</b><span>${esc(Origin.BACKGROUND.feats[feat]?.description || '')}</span>` : 'Choose the background feat.';
  }

  function actionById(id) { return allActionRecords().find(record => record.id === id); }
  function useAction(id) {
    const record = actionById(id);
    if (!record) return;
    if (record.resource?.kind === 'relic') {
      const left = Math.max(0, record.resource.max - Number(record.resource.used || 0));
      if (!left) { toast('No charges remaining.', 'warn'); return; }
    }
    if (record.uses) {
      const used = Number(state().classes.treasureHunter.featureUses?.[record.featureId]) || 0;
      if (used >= record.uses) { toast('No uses remaining.', 'warn'); return; }
    }
    if (record.cost && !C.spendCool(record.cost)) { toast('Not enough Cool Points.', 'warn'); return; }
    if (record.resource?.kind === 'relic') C.adjustRelicUse(record.resource.instanceId, 1);
    if (record.uses) C.toggleFeatureUse(record.featureId, 1);
    toast(`${record.name} used.`);
  }

  function onClick(event) {
    const hpTarget = event.target.closest('[data-open-hp]');
    if (hpTarget) { event.preventDefault(); openHp(); return; }
    const button = event.target.closest('button');
    if (!button) return;

    if (button.id === 'prevPage') { setPage(currentPageIndex() - 1); return; }
    if (button.id === 'nextPage') { setPage(currentPageIndex() + 1); return; }
    if (button.dataset.pageDot != null) { setPage(Number(button.dataset.pageDot)); return; }
    if (button.id === 'editBtn' || button.hasAttribute('data-open-builder')) { openBuilder(); return; }
    if (button.hasAttribute('data-open-edit')) { openEdit(); return; }
    if (button.id === 'charactersBtn') { renderRoster(); return; }
    if (button.id === 'searchBtn') { $('#globalSearch').value = ''; $('#globalSearchResults').innerHTML = ''; showDialog('#searchDialog'); setTimeout(() => $('#globalSearch').focus(), 0); return; }

    if (button.id === 'hpMinus') { setHpAmount(Number($('#hpAmountInput').value) - 1, true); return; }
    if (button.id === 'hpPlus') { setHpAmount(Number($('#hpAmountInput').value) + 1, true); return; }
    if (button.dataset.hpWheel) { setHpAmount(button.dataset.hpWheel, false); return; }
    if (button.id === 'hpDamage' || button.id === 'hpHeal') {
      setHpAmount($('#hpAmountInput').value);
      C.setTempHp($('#hpTemp').value);
      if (button.id === 'hpDamage') {
        const result = C.applyDamage(local.hpAmount, $('#hpDamageType').value);
        const defense = result.steps.length ? ` (${result.steps.join(' → ')})` : '';
        toast(`${result.applied} damage${defense}; ${result.absorbed} absorbed by Temp HP.`);
      } else {
        const result = C.heal(local.hpAmount);
        toast(`${result.healed} HP healed.`);
      }
      closeDialog('#hpDialog');
      return;
    }

    if (button.hasAttribute('data-inspiration')) { C.toggleInspiration(); return; }
    if (button.dataset.coolAdjust) { C.adjustCool(button.dataset.coolAdjust); return; }
    if (button.dataset.luckAdjust) { C.adjustLuck(button.dataset.luckAdjust); return; }
    if (button.dataset.rest) { if (confirm(`${button.dataset.rest === 'long' ? 'Long' : 'Short'} Rest?`)) { C.rest(button.dataset.rest); toast(`${button.dataset.rest === 'long' ? 'Long' : 'Short'} Rest completed.`); } return; }
    if (button.hasAttribute('data-condition-add')) { const value = $('#conditionSelect').value; if (value && !C.addCondition(value)) toast('Condition is blocked by immunity.', 'warn'); return; }
    if (button.dataset.conditionRemove) { C.removeCondition(button.dataset.conditionRemove); return; }
    if (button.dataset.exhaustionAdjust) { C.adjustExhaustion(button.dataset.exhaustionAdjust); return; }
    if (button.hasAttribute('data-defense-add')) { const kind = $('#defenseKind').value, value = $('#defenseValue').value; if (value) C.addDefense(kind, value); return; }
    if (button.dataset.defenseRemove) { const separator = button.dataset.defenseRemove.indexOf(':'); C.removeDefense(button.dataset.defenseRemove.slice(0, separator), button.dataset.defenseRemove.slice(separator + 1)); return; }
    if (button.dataset.statDetail) { openStatDetail(button.dataset.statDetail); return; }

    if (button.dataset.actionFilter) { C.setUi('actionFilter', button.dataset.actionFilter); return; }
    if (button.dataset.actionToggle) { C.toggleOpen('action', button.dataset.actionToggle); return; }
    if (button.dataset.actionFavorite) { C.toggleFavorite('action', button.dataset.actionFavorite); return; }
    if (button.dataset.actionUse) { useAction(button.dataset.actionUse); return; }
    if (button.hasAttribute('data-new-action')) { $('#actionForm').reset(); showDialog('#actionDialog'); return; }
    if (button.dataset.customActionRemove) { if (confirm('Delete this custom action?')) C.removeCustomAction(button.dataset.customActionRemove); return; }
    if (button.dataset.featureUse) { C.toggleFeatureUse(button.dataset.featureUse, button.dataset.delta); return; }

    if (button.dataset.skillEdit) { openStatDetail(`skill:${button.dataset.skillEdit}`); return; }
    if (button.dataset.featureFilter) { C.setUi('featureFilter', button.dataset.featureFilter); return; }
    if (button.dataset.featureView) { C.setUi('featureView', button.dataset.featureView); return; }
    if (button.dataset.featureToggle) { C.toggleOpen('feature', button.dataset.featureToggle); return; }
    if (button.dataset.featureFavorite) { C.toggleFavorite('feature', button.dataset.featureFavorite); return; }

    if (button.hasAttribute('data-relic-add')) { const result = C.addRelic($('#relicSelect').value); if (!result.ok) toast(result.reason === 'capacity' ? 'Relic collection is full.' : 'Relic cannot be added.', 'warn'); return; }
    if (button.dataset.relicToggle) { C.toggleOpen('relic', button.dataset.relicToggle); return; }
    if (button.dataset.relicPrepare) { const result = C.toggleRelicPrepared(button.dataset.relicPrepare); if (!result.ok) toast('Prepared relic limit is full.', 'warn'); return; }
    if (button.dataset.relicUse) { C.adjustRelicUse(button.dataset.relicUse, button.dataset.delta); return; }
    if (button.dataset.relicRemove) { if (confirm('Remove this relic from the collection?')) C.removeRelic(button.dataset.relicRemove); return; }

    if (button.hasAttribute('data-money-open')) { openMoney(); return; }
    if (button.hasAttribute('data-open-catalog')) { openCatalog(); return; }
    if (button.hasAttribute('data-new-item')) { openItemEditor(); return; }
    if (button.dataset.itemToggle) { C.toggleOpen('item', button.dataset.itemToggle); return; }
    if (button.dataset.itemEdit) { openItemEditor(button.dataset.itemEdit); return; }
    if (button.dataset.itemRemove) { if (confirm('Delete this item?')) C.removeItem(button.dataset.itemRemove); return; }
    if (button.dataset.catalogAdd) {
      const item = local.catalogItems.find(candidate => candidate.id === button.dataset.catalogAdd);
      if (item) { C.addItem(Catalog.cloneForInventory(item)); toast(`${item.name} added.`); }
      return;
    }

    if (button.dataset.socialTab) { C.setUi('socialTab', button.dataset.socialTab); return; }
    if (button.hasAttribute('data-new-npc')) { openNpc(); return; }
    if (button.dataset.npcOpen) { openNpc(button.dataset.npcOpen); return; }
    if (button.dataset.npcFavorite) { C.toggleNpcFavorite(button.dataset.npcFavorite); return; }
    if (button.hasAttribute('data-bio-edit')) { openBio(); return; }
    if (button.id === 'npcDeleteBtn') {
      const id = $('#npcId').value;
      if (id && confirm('Delete this NPC? This cannot be undone.')) { C.deleteNpc(id); closeDialog('#npcDialog'); toast('NPC deleted.'); }
      return;
    }

    if (button.dataset.builderTab) { local.builderTab = button.dataset.builderTab; renderBuilder(); return; }
    if (button.hasAttribute('data-builder-copy-json')) {
      const text = $('#builderJson').value;
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast('JSON copied.')).catch(() => toast('Copy failed.', 'warn'));
      else { $('#builderJson').select(); document.execCommand('copy'); toast('JSON copied.'); }
      return;
    }
    if (button.hasAttribute('data-builder-import-json')) {
      try { const kind = applyImportText($('#builderJson').value); closeDialog('#builderDialog'); toast(`${kind} JSON imported.`); }
      catch (error) { toast(error.message, 'warn'); }
      return;
    }
    if (button.hasAttribute('data-export-character')) { downloadJson(`${(state().character.name || 'character').replace(/[^a-z0-9_-]+/gi, '_')}.json`, state()); return; }
    if (button.hasAttribute('data-export-roster')) { downloadJson('character-sheet-v9-roster.json', Roster?.exportAll() || { current: state() }); return; }
    if (button.hasAttribute('data-import-open')) { openImport(); return; }
    if (button.id === 'applyImport') {
      try { const kind = applyImportText($('#importText').value); $('#importReport').textContent = `${kind} import complete.`; closeDialog('#importDialog'); toast(`${kind} JSON imported.`); }
      catch (error) { $('#importReport').innerHTML = `<b>Cannot import</b><p>${esc(error.message)}</p>`; }
      return;
    }

    if (button.hasAttribute('data-roster-new')) { Roster?.create(); closeDialog('#charactersDialog'); toast('New character created.'); return; }
    if (button.dataset.rosterSwitch) { Roster?.switchTo(button.dataset.rosterSwitch); closeDialog('#charactersDialog'); return; }
    if (button.dataset.rosterDuplicate) { Roster?.duplicate(button.dataset.rosterDuplicate); closeDialog('#charactersDialog'); toast('Character duplicated.'); return; }
    if (button.dataset.rosterDelete) { if (confirm('Delete this character?')) { Roster?.remove(button.dataset.rosterDelete); renderRoster(); } return; }
    if (button.dataset.searchJump != null) { closeDialog('#searchDialog'); setPage(Number(button.dataset.searchJump)); return; }
  }

  function onChange(event) {
    const target = event.target;
    if (target.id === 'defenseKind') {
      $('#defenseValue').innerHTML = target.value === 'conditionImmunity' ? $('#conditionDefenseOptions').innerHTML : $('#damageDefenseOptions').innerHTML;
      return;
    }
    if (target.dataset.featureChoice) { C.setChoice(target.dataset.featureChoice, target.value, Number(target.dataset.choiceIndex)); return; }
    if (target.dataset.relicChoice) { C.setRelicChoice(target.dataset.relicChoice, target.dataset.choiceKey, target.value); return; }
    if (target.dataset.itemField) { C.updateItem(target.dataset.itemId, { [target.dataset.itemField]: target.type === 'checkbox' ? target.checked : target.dataset.itemField === 'quantity' ? Math.max(1, Number(target.value) || 1) : target.value }); return; }
    if (target.dataset.rollMode) { C.setRollMode(target.dataset.rollMode, target.dataset.rollKey || '', target.value); closeDialog('#statDialog'); return; }
    if (target.dataset.skillStatus) { C.setSkillManual(target.dataset.skillStatus, target.value); closeDialog('#statDialog'); return; }
    if (target.id === 'editHpAuto') { $('#editHpMax').disabled = target.checked; return; }
    if (target.id === 'editAcMode') { $('#editAc').disabled = target.value !== 'manual'; return; }
    if (target.id === 'builderHpAuto') { $('#builderHpMax').disabled = target.checked; return; }
    if (target.id === 'builderSpecies') { refreshBuilderSpecies(); return; }
    if (target.id === 'builderAbilityMode') { refreshBuilderAbilities(); return; }
    if (target.id === 'builderFeat') { refreshBuilderFeat(); return; }
    if (target.id === 'itemRarity') { local.catalogRarity = target.value; renderCatalogResults(); return; }
    if (target.id === 'itemKind') { local.catalogKind = target.value; renderCatalogResults(); return; }
    if (target.id === 'editPortrait') {
      const file = target.files?.[0]; if (!file) return;
      const done = result => { local.pendingPortrait = result; $('#portraitPreview').innerHTML = `<img src="${esc(result)}" alt="">`; };
      if (Cropper) Cropper.open(file, done); else S.imageToThumb(file).then(done).catch(() => toast('Portrait could not be read.', 'warn'));
      return;
    }
    if (target.id === 'npcImage') {
      const file = target.files?.[0]; if (!file) return;
      const done = result => { local.pendingNpcImage = result; $('#npcImagePreview').innerHTML = `<img src="${esc(result)}" alt="">`; };
      if (Cropper) Cropper.open(file, done); else S.imageToThumb(file).then(done).catch(() => toast('NPC portrait could not be read.', 'warn'));
      return;
    }
    if (target.id === 'importFile') {
      const file = target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { $('#importText').value = String(reader.result || ''); $('#importReport').textContent = 'File loaded. Tap Import to validate and apply.'; };
      reader.readAsText(file);
    }
  }

  function onInput(event) {
    const target = event.target;
    if (target.id === 'featureSearch') {
      local.featureSearch = target.value;
      const position = target.selectionStart;
      renderFeatures();
      const next = $('#featureSearch'); next.focus(); next.setSelectionRange(position, position);
      return;
    }
    if (target.id === 'globalSearch') { renderGlobalSearch(); return; }
    if (target.id === 'itemSearch') {
      local.catalogQuery = target.value;
      clearTimeout(local.catalogTimer);
      local.catalogTimer = setTimeout(renderCatalogResults, 180);
      return;
    }
    if (target.id === 'hpAmountInput') { setHpAmount(target.value); }
  }

  function onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!['editForm', 'actionForm', 'npcForm', 'bioForm', 'moneyForm', 'itemEditForm', 'builderForm'].includes(form.id)) return;
    event.preventDefault();
    if (form.id === 'editForm') {
      C.saveQuickCharacter({
        name: $('#editName').value, level: $('#editLevel').value, portrait: local.pendingPortrait,
        hpAuto: $('#editHpAuto').checked, hpMax: $('#editHpMax').value, acMode: $('#editAcMode').value,
        acManual: $('#editAc').value, speed: $('#editSpeed').value, initiativeBonus: $('#editInitBonus').value,
        abilities: Object.fromEntries($$('[data-edit-ability]').map(input => [input.dataset.editAbility, input.value]))
      });
      closeDialog('#editDialog'); toast('Character updated.'); return;
    }
    if (form.id === 'actionForm') {
      C.addCustomAction({ name: $('#customActionName').value, action: $('#customActionType').value, group: $('#customActionGroup').value, damage: $('#customActionDamage').value, summary: $('#customActionNotes').value });
      closeDialog('#actionDialog'); toast('Custom action added.'); return;
    }
    if (form.id === 'npcForm') {
      C.saveNpc({ id: $('#npcId').value, name: $('#npcName').value, tag: $('#npcTag').value, location: $('#npcLocation').value, notes: $('#npcNotes').value, image: local.pendingNpcImage });
      closeDialog('#npcDialog'); toast('NPC saved.'); return;
    }
    if (form.id === 'bioForm') {
      C.saveBio(Object.fromEntries($$('[data-bio-field]').map(field => [field.dataset.bioField, field.value])));
      closeDialog('#bioDialog'); toast('Bio saved.'); return;
    }
    if (form.id === 'moneyForm') {
      C.setMoney({ gp: $('#moneyGp').value, ep: $('#moneyEp').value, sp: $('#moneySp').value, cp: $('#moneyCp').value });
      closeDialog('#moneyDialog'); return;
    }
    if (form.id === 'itemEditForm') {
      const values = { name: $('#itemEditName').value, location: $('#itemEditLocation').value, quantity: $('#itemEditQuantity').value, isContainer: $('#itemEditContainer').checked, notes: $('#itemEditNotes').value };
      if ($('#itemEditId').value) C.updateItem($('#itemEditId').value, values); else C.addItem(values, values.location);
      closeDialog('#itemEditDialog'); toast('Item saved.'); return;
    }
    if (form.id === 'builderForm' && local.builderTab === 'setup') {
      const payload = collectBuilder();
      C.saveBuilder(payload);
      closeDialog('#builderDialog');
      const missing = [...Origin.originIncomplete(state()), ...D.choiceRequirements(state())];
      toast(missing.length ? `Saved. Still missing: ${missing.join(' • ')}` : 'Character setup saved.', missing.length ? 'warn' : 'success');
    }
  }

  function bind() {
    initDots();
    $('#pager').addEventListener('scroll', onPagerScroll, { passive: true });
    $('#hpAmountWheel').addEventListener('scroll', () => {
      clearTimeout(local.hpWheelTimer);
      local.hpWheelTimer = setTimeout(() => setHpAmount(Math.max(1, Math.min(100, Math.round($('#hpAmountWheel').scrollTop / 34) + 1))), 70);
    }, { passive: true });
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-hp][role="button"]')) { event.preventDefault(); openHp(); }
    });
    window.addEventListener('pagehide', () => { S.flush(); Roster?.saveCurrent(); });
  }

  function initialize() {
    ensureDialogs();
    bind();
    S.subscribe(() => renderAll());
    C.reconcileDerived();
    renderAll();
    requestAnimationFrame(() => setPage(state().ui.page, false, false));
  }

  document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
