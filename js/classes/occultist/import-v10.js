(function () {
  'use strict';
  const S = window.CharacterState;
  if (!S) return;
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const item = (id, name, weight, extra = {}) => ({ id, name, weight, quantity: 1, location: 'carried', modifiers: [], ...extra });
  const KNOWN_ITEMS = {
    rations: () => item('rations','Rations (1 day)',2,{isConsumable:true}),
    waterskin: () => item('waterskin','Waterskin',5),
    backpack: () => item('backpack','Backpack',5,{itemType:'container',isContainer:true,capacity:'30 lb.',capacityWeight:30,location:'back'})
  };

  function convert(payload = {}) {
    const next = S.fresh(), c = next.character, occult = next.classes.occultist;
    c.classKey = 'occultist'; c.name = String(payload.name || 'Imported Occultist'); c.level = Math.max(1,Math.min(12,number(payload.level,1)));
    c.race = String(payload.race || payload.species || ''); c.origin.species = c.race; c.size = String(payload.size || '');
    const baseAbilities = payload.pointBuy && typeof payload.pointBuy === 'object' ? payload.pointBuy : payload.abilities || {};
    for (const ability of S.A) c.abilities[ability] = Math.max(1,Math.min(30,number(baseAbilities[ability],10)));
    c.hp = { current:Math.max(0,number(payload.hpCurrent,payload.hp?.current || 10)), max:Math.max(1,number(payload.hpMax,payload.hp?.max || 10)), temp:Math.max(0,number(payload.hpTemp,payload.hp?.temp)), auto:payload.hpAuto !== false };
    c.speed = Math.max(0,number(payload.speed,30)); c.initiativeBonus = number(payload.initiativeMisc); c.inspiration = !!payload.inspiration;
    c.deathSaves = { successes:Math.max(0,number(payload.deathSuccess)),failures:Math.max(0,number(payload.deathFail)) };
    c.hitDice.d10.spent = Math.max(0,number(payload.hitDiceSpent)); c.portrait = String(payload.portrait || payload.image || '');
    c.conditions = unique(Object.entries(payload.conditions || {}).filter(([,enabled])=>enabled).map(([name])=>name).concat(payload.customConditions || []));
    c.exhaustion = Math.max(0,number(payload.exhaustion));
    c.damageDefenses = { ...c.damageDefenses, ...(payload.defenses || {}) };
    c.origin.background = { ...c.origin.background, name:'Lukyho univerzální background', skills:unique([payload.bgSkill1,payload.bgSkill2]).slice(0,2), tool:String(payload.bgTool||''), secondary:String(payload.bgOtherProf||''), feat:String(payload.bgFeat === 'Resilient' && payload.ac === 14 ? 'Defence' : payload.bgFeat || ''), abilityMode:'+1/+1/+1', abilityChoices:['DEX','CON','INT'], resilientAbility:String(payload.featConfig?.resilientAbility||''), skilledChoices:payload.featConfig?.skilled || [], luckUsed:number(payload.featConfig?.luckyUsed) };
    c.bio = { ...c.bio, background:String(payload.background||''), alignment:String(payload.alignment||''), age:String(payload.age||''), height:String(payload.height||''), weight:String(payload.weight||''), eyes:String(payload.eyes||''), hair:String(payload.hair||''), appearance:String(payload.appearance||''), personality:String(payload.personality||''), flaws:String(payload.flaw||''), backstory:String(payload.backstory||''), notes:String(payload.notes||''), allies:String(payload.relationships||'') };
    c.proficiencies.languages = (payload.languages || []).map(language => typeof language === 'string' ? language : `${language.name}${language.level ? ` (${language.level})` : ''}`);
    c.skills = Object.fromEntries(Object.entries(payload.profs || {}).filter(([key,value])=>key.startsWith('skill:')&&number(value)>0).map(([key,value])=>[key.slice(6),Math.min(2,number(value))]));

    occult.sciences = { ...occult.sciences, ...(payload.sciences || {}) };
    occult.slotsUsed = { ...occult.slotsUsed, ...(payload.slotsUsed || {}) };
    occult.resources = { ...occult.resources, ...(payload.resources || {}) };
    occult.choices.classSkills = unique(payload.classSkillChoices?.occultist || payload.classSkills).slice(0,3);
    occult.choices.mysticLanguage = String(payload.mysticLanguage || '');
    occult.choices.scienceChoices = { ...occult.choices.scienceChoices, ...(payload.scienceChoices || {}) };
    occult.spells = (payload.spells || []).map(spell => {
      const snapshot=S.clone(spell), id=spell.id || spell.libraryId;
      const builtIn=window.OccultistDataV10?.spells?.some(definition=>definition.id===id);
      return { ...snapshot, id, prepared:!Number(spell.level)||!!spell.prepared, added:!builtIn, definition:builtIn?undefined:{...snapshot,id} };
    }).filter(spell=>spell.id);
    occult.ritualNotes = String(payload.ritualNotes || '');

    c.gear.weapons = (payload.weapons || []).map((weapon,index) => weapon.id === 'dagger' ? item(`weapon-dagger-${index+1}`,'Dagger',1,{itemType:'weapon',location:'equipped',equipped:true,damage:'1d4',damageType:'Piercing',properties:['Finesse','Light','Thrown (20/60)'],rangeText:'20/60 ft.',category:'Simple Melee Weapon'}) : item(`weapon-${weapon.id||index+1}`,weapon.name||weapon.id||'Imported weapon',number(weapon.weight,1),{itemType:'weapon',location:weapon.equipped?'equipped':'carried',...S.clone(weapon)}));
    c.gear.armor = (payload.armors || []).map((armor,index) => armor.id === 'studded' ? item(`armor-studded-${index+1}`,'Studded Leather',13,{itemType:'armor',location:armor.donned?'worn':'carried',worn:!!armor.donned,armorBase:12,armorCategory:'Light Armor'}) : item(`armor-${armor.id||index+1}`,armor.name||armor.id||'Imported armor',number(armor.weight),{itemType:'armor',location:armor.donned?'worn':'carried',...S.clone(armor)}));
    const imported = (payload.items || payload.inventory || []).map((raw,index) => {
      if (typeof raw === 'string') return item(`imported-item-${index+1}`,raw,1,{weightEstimated:true});
      if (KNOWN_ITEMS[raw.id]) { const known=KNOWN_ITEMS[raw.id](); known.quantity=Math.max(1,number(raw.qty,1)); return known; }
      const name=String(raw.name||raw.id||'Imported item').trim(), estimates={ 'Hooded lantern':2, 'Sada 7 krystalů':1, 'Astrologická mapa':1 };
      const supplied=number(raw.weight,-1), estimated=supplied<=0, weight=estimated?(estimates[name]||1):supplied;
      return item(raw.id||`imported-item-${index+1}`,name,weight,{quantity:Math.max(1,number(raw.qty,1)),description:String(raw.desc||''),weightEstimated:estimated});
    });
    let backpack=imported.find(entry=>entry.id==='backpack'||/^backpack$/i.test(entry.name));
    if(!backpack){backpack=KNOWN_ITEMS.backpack();imported.unshift(backpack);}
    for(const entry of imported){const raw=(payload.items||[]).find(source=>source&&typeof source==='object'&&(source.id===entry.id||source.name===entry.name));if(entry!==backpack&&/^backpack$/i.test(String(raw?.location||''))){entry.containerId=backpack.id;entry.location=backpack.location;}}
    c.gear.inventory=imported;
    c.gear.currencyWallets.generic={g:Math.max(0,number(payload.gp)),s:Math.max(0,number(payload.sp)),c:Math.max(0,number(payload.cp))};
    c.gear.money={gp:Math.max(0,number(payload.gp)),ep:Math.max(0,number(payload.ep)),sp:Math.max(0,number(payload.sp)),cp:Math.max(0,number(payload.cp)),pp:Math.max(0,number(payload.pp))};
    next.campaign.npcs=(payload.npcs||[]).map((npc,index)=>({id:npc.id||`import-npc-${index+1}`,name:String(npc.name||'NPC'),profession:String(npc.profession||''),nationality:String(npc.nationality||''),location:String(npc.location||''),notes:String(npc.notes||''),image:String(npc.image||npc.portrait||''),thumbnail:String(npc.thumbnail||''),relations:[],createdAt:new Date(index*1000).toISOString(),updatedAt:new Date(index*1000).toISOString()}));
    return S.normalize(next,{skipAbilityMigration:true});
  }
  window.OccultistLegacyImportV10={convert};
})();
