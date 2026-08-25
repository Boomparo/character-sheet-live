(function(){
  const S=window.V7SStateV7s,T=window.TreasureHunterDataV7s,R=window.DND2024Rules;
  if(!S||!T||!R)return;
  const ARMOR={
    unarmored:{name:'Unarmored',base:10,dex:true,cap:null},
    padded:{name:'Padded Armor',base:11,dex:true,cap:null},
    leather:{name:'Leather Armor',base:11,dex:true,cap:null},
    studded:{name:'Studded Leather Armor',base:12,dex:true,cap:null},
    hide:{name:'Hide Armor',base:12,dex:true,cap:2},
    chainShirt:{name:'Chain Shirt',base:13,dex:true,cap:2},
    scale:{name:'Scale Mail',base:14,dex:true,cap:2},
    breastplate:{name:'Breastplate',base:14,dex:true,cap:2},
    halfPlate:{name:'Half Plate Armor',base:15,dex:true,cap:2},
    ringMail:{name:'Ring Mail',base:14,dex:false,cap:0},
    chainMail:{name:'Chain Mail',base:16,dex:false,cap:0},
    splint:{name:'Splint Armor',base:17,dex:false,cap:0},
    plate:{name:'Plate Armor',base:18,dex:false,cap:0}
  };
  const ACTIVE_LOCATIONS=new Set(['equipped','worn']);
  const state=()=>S.get();
  const level=()=>Math.max(1,Math.min(20,Number(state().character.level)||1));
  const pb=()=>T.pb(level());
  const ability=a=>Number(state().character.abilities?.[a])||10;
  const mod=a=>S.modifier(ability(a));
  const conditions=()=>Array.isArray(state().character.conditions)?state().character.conditions:[];
  const exhaustion=()=>Math.max(0,Math.min(6,Number(state().character.exhaustion)||0));
  const inventory=()=>Array.isArray(state().character.gear?.inventory)?state().character.gear.inventory:[];
  const activeItems=()=>inventory().filter(it=>it&&typeof it==='object'&&ACTIVE_LOCATIONS.has(it.location)&&(!it.attunement||it.isAttuned));
  const selectedRelics=()=>Array.isArray(state().classes?.treasureHunter?.relics)?state().classes.treasureHunter.relics:[];
  const activeRelics=()=>selectedRelics().filter(x=>x&&typeof x==='object'&&x.prepared).map(x=>({...((T.relics||[]).find(r=>r.id===x.id)||{}),...x}));

  function signed(n){return Number(n)>=0?`+${Number(n)}`:`${Number(n)}`}
  function enhancementFromName(name){const m=String(name||'').match(/(?:^|[,+\s])\+(\d)(?:\b|$)/);return m?Number(m[1]):0}
  function armorKeyFromName(name){const n=String(name||'').toLowerCase();if(n.includes('studded leather'))return'studded';if(n.includes('padded'))return'padded';if(n.includes('leather'))return'leather';if(n.includes('chain shirt'))return'chainShirt';if(n.includes('scale mail'))return'scale';if(n.includes('breastplate'))return'breastplate';if(n.includes('half plate'))return'halfPlate';if(n.includes('ring mail'))return'ringMail';if(n.includes('chain mail'))return'chainMail';if(n.includes('splint'))return'splint';if(n.includes('plate'))return'plate';if(n.includes('hide armor'))return'hide';return''}
  function isShield(item){const raw=item?.raw||{},n=`${item?.name||''} ${item?.category||''} ${raw.armor_category||''}`.toLowerCase();return n.includes('shield')||String(raw.armor_category||'').toLowerCase()==='shield'}
  function armorFormulaFromItem(item){
    if(!item||isShield(item))return null;
    const raw=item.raw||{},ac=raw.armor_class;
    if(ac&&Number.isFinite(Number(ac.base))){return{name:item.name||'Armor',base:Number(ac.base),dex:!!ac.dex_bonus,cap:ac.max_bonus==null?null:Number(ac.max_bonus),enhancement:enhancementFromName(item.name),item}}
    const key=armorKeyFromName(item.name);if(key){const f=ARMOR[key];return{...f,enhancement:enhancementFromName(item.name),item}}
    return null;
  }
  function equippedArmor(){const candidates=activeItems().map(armorFormulaFromItem).filter(Boolean);if(!candidates.length)return{...ARMOR.unarmored,enhancement:0,item:null};return candidates.sort((a,b)=>armorValue(b)-armorValue(a))[0]}
  function armorValue(f){const raw=mod('DEX'),dex=f.dex?(f.cap==null?raw:Math.min(f.cap,raw)):0;return Number(f.base||10)+dex+Number(f.enhancement||0)}

  function genericModifiers(source,type,target='all'){
    const mods=Array.isArray(source?.modifiers)?source.modifiers:[];let total=0;
    mods.forEach(m=>{if(!m||m.type!==type)return;const t=m.target||'all';if(t==='all'||t===target)total+=Number(m.value)||0});return total;
  }
  function protectionBonus(item){const n=String(item?.name||'').toLowerCase();return n.includes('ring of protection')||n.includes('cloak of protection')?1:0}
  function itemAcBonus(){let n=0;activeItems().forEach(it=>{if(isShield(it)){const raw=it.raw||{};n+=Number(raw.armor_class?.base)||2;n+=enhancementFromName(it.name)}n+=protectionBonus(it)+genericModifiers(it,'ac')});return n}
  function itemSaveBonus(a){let n=0;activeItems().forEach(it=>{n+=protectionBonus(it)+genericModifiers(it,'save',a)});return n}
  function itemInitiativeBonus(){return activeItems().reduce((n,it)=>n+genericModifiers(it,'initiative'),0)}
  function itemSpeedBonus(){return activeItems().reduce((n,it)=>n+genericModifiers(it,'speed'),0)}
  function itemDcBonus(target){return activeItems().reduce((n,it)=>n+genericModifiers(it,'dc',target),0)}
  function relicAcBonus(){return activeRelics().reduce((n,r)=>n+(Number(r.acBonus)||0)+genericModifiers(r,'ac'),0)}
  function relicSaveBonus(a){return activeRelics().reduce((n,r)=>n+(Number(r.saveBonus)||0)+genericModifiers(r,'save',a),0)}
  function relicInitiativeBonus(){return activeRelics().reduce((n,r)=>n+(Number(r.initiativeBonus)||0)+genericModifiers(r,'initiative'),0)}
  function relicSpeedBonus(){return activeRelics().reduce((n,r)=>n+(Number(r.bonusSpeed)||0)+(Number(r.speedBonus)||0)+genericModifiers(r,'speed'),0)}
  function relicDcBonus(target){return activeRelics().reduce((n,r)=>n+genericModifiers(r,'dc',target),0)}

  function armorClass(){
    const c=state().character;if(c.acMode==='manual')return Math.max(0,Number(c.acManual??c.ac)||0);
    const f=equippedArmor();return Math.max(0,armorValue(f)+itemAcBonus()+relicAcBonus()+(Number(c.acBonus)||0));
  }
  function armorBreakdown(){
    const c=state().character;if(c.acMode==='manual')return{value:armorClass(),label:'Manual AC',parts:[['Manual AC',armorClass()]]};
    const f=equippedArmor(),raw=mod('DEX'),dex=f.dex?(f.cap==null?raw:Math.min(f.cap,raw)):0,parts=[];
    if(f.item)parts.push(['Armor',`${f.name}: ${f.base}`]);else parts.push(['Base','Unarmored: 10']);
    if(f.dex)parts.push(['DEX',`${signed(raw)}${f.cap!=null?` (max +${f.cap})`:''}`]);
    if(f.enhancement)parts.push(['Armor enhancement',signed(f.enhancement));
    const itemBonus=itemAcBonus();if(itemBonus)parts.push(['Equipped items',signed(itemBonus)]);
    const relicBonus=relicAcBonus();if(relicBonus)parts.push(['Prepared relics',signed(relicBonus)]);
    const misc=Number(c.acBonus)||0;if(misc)parts.push(['Other bonus',signed(misc)]);
    return{value:armorClass(),label:f.item?f.name:'Unarmored',parts};
  }
  function initiative(){return mod('DEX')+(Number(state().character.initiativeBonus)||0)+itemInitiativeBonus()+relicInitiativeBonus()+R.exhaustionPenalty(exhaustion())}
  function saveMod(a){if(R.saveAutoFails(conditions(),a)||exhaustion()>=6)return null;return mod(a)+(T.saves.includes(a)?pb():0)+itemSaveBonus(a)+relicSaveBonus(a)+R.exhaustionPenalty(exhaustion())}
  function whipRopeDC(){return 8+pb()+mod('DEX')+itemDcBonus('whipRope')+relicDcBonus('whipRope')}
  function relicDC(){return 8+pb()+mod('INT')+itemDcBonus('relic')+relicDcBonus('relic')}
  function speed(){if(exhaustion()>=6||R.speedIsZero(conditions()))return 0;return Math.max(0,(Number(state().character.speed)||0)+itemSpeedBonus()+relicSpeedBonus()-R.exhaustionSpeedPenalty(exhaustion()))}
  function speedBreakdown(){const c=state().character,parts=[['Base Speed',`${Number(c.speed)||0} ft.`]],ib=itemSpeedBonus(),rb=relicSpeedBonus(),pen=R.exhaustionSpeedPenalty(exhaustion());if(ib)parts.push(['Equipped items',`${signed(ib)} ft.`]);if(rb)parts.push(['Prepared relics',`${signed(rb)} ft.`]);if(pen)parts.push(['Exhaustion',`−${pen} ft.`]);if(R.speedIsZero(conditions()))parts.push(['Condition','Speed is fixed at 0']);return{value:speed(),parts}}
  function hitDice(){const spent=Math.max(0,Math.min(level(),Number(state().character.hitDice?.d10?.spent)||0));return{die:'d10',total:level(),spent,available:level()-spent}}
  function fixedInitiative(){const c=R.fixedInitiativeMode(conditions());if(c.locked)return c;const relic=activeRelics().find(x=>x.id==='silent-pocket-watch');return relic?{mode:'advantage',locked:true,sources:['Tiché kapesní hodinky']}:{mode:'normal',locked:false,sources:[]}}
  function fixedSave(a){return R.fixedSaveMode(conditions(),a)}
  function fixedSkill(){return R.fixedSkillMode(conditions())}
  function weaponEnhancement(item){return enhancementFromName(item?.name)+genericModifiers(item,'attack')}
  function itemEffects(item){return{active:!!(item&&typeof item==='object'&&ACTIVE_LOCATIONS.has(item.location)&&(!item.attunement||item.isAttuned)),ac:protectionBonus(item)+genericModifiers(item,'ac'),save:protectionBonus(item)+genericModifiers(item,'save'),attack:weaponEnhancement(item)}}

  window.V7SDerived={ARMOR,state,level,pb,ability,mod,inventory,activeItems,activeRelics,equippedArmor,armorClass,armorBreakdown,initiative,saveMod,whipRopeDC,relicDC,speed,speedBreakdown,hitDice,fixedInitiative,fixedSave,fixedSkill,itemEffects,weaponEnhancement,itemAcBonus,itemSaveBonus,relicAcBonus,relicSaveBonus};
})();