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
  const state=()=>S.get();
  const level=()=>Math.max(1,Math.min(20,Number(state().character.level)||1));
  const pb=()=>T.pb(level());
  const ability=a=>Number(state().character.abilities?.[a])||10;
  const mod=a=>S.modifier(ability(a));
  const conditions=()=>Array.isArray(state().character.conditions)?state().character.conditions:[];
  const exhaustion=()=>Math.max(0,Math.min(6,Number(state().character.exhaustion)||0));
  function armorFormula(){return ARMOR[state().character.armorFormula]||ARMOR.leather}
  function armorClass(){const c=state().character;if(c.acMode==='manual')return Math.max(0,Number(c.acManual??c.ac)||0);const f=armorFormula(),dex=f.dex?(f.cap==null?mod('DEX'):Math.min(f.cap,mod('DEX'))):0;return Math.max(0,f.base+dex+(Number(c.acBonus)||0))}
  function armorBreakdown(){const c=state().character;if(c.acMode==='manual')return{value:armorClass(),label:'Manual AC',parts:[['Manual AC',armorClass()]]};const f=armorFormula(),raw=mod('DEX'),dex=f.dex?(f.cap==null?raw:Math.min(f.cap,raw)):0,bonus=Number(c.acBonus)||0;const parts=[['Armor',`${f.name}: ${f.base}`]];if(f.dex)parts.push(['DEX',`${raw>=0?'+':''}${raw}${f.cap!=null?` (max +${f.cap})`:''}`]);if(bonus)parts.push(['Other bonus',`${bonus>=0?'+':''}${bonus}`]);return{value:armorClass(),label:f.name,parts}}
  function initiative(){return mod('DEX')+(Number(state().character.initiativeBonus)||0)+R.exhaustionPenalty(exhaustion())}
  function saveMod(a){if(R.saveAutoFails(conditions(),a)||exhaustion()>=6)return null;return mod(a)+(T.saves.includes(a)?pb():0)+R.exhaustionPenalty(exhaustion())}
  function whipRopeDC(){return 8+pb()+mod('DEX')}
  function relicDC(){return 8+pb()+mod('INT')}
  function hitDice(){const spent=Math.max(0,Math.min(level(),Number(state().character.hitDice?.d10?.spent)||0));return{die:'d10',total:level(),spent,available:level()-spent}}
  function fixedInitiative(){const c=R.fixedInitiativeMode(conditions());if(c.locked)return c;const relic=(state().classes?.treasureHunter?.relics||[]).find(x=>typeof x==='object'&&x.id==='silent-pocket-watch'&&x.prepared);return relic?{mode:'advantage',locked:true,sources:['Tiché kapesní hodinky']}:{mode:'normal',locked:false,sources:[]}}
  function fixedSave(a){return R.fixedSaveMode(conditions(),a)}
  function fixedSkill(){return R.fixedSkillMode(conditions())}
  window.V7SDerived={ARMOR,state,level,pb,ability,mod,armorClass,armorBreakdown,initiative,saveMod,whipRopeDC,relicDC,hitDice,fixedInitiative,fixedSave,fixedSkill};
})();