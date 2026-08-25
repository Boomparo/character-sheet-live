(function(){
  const T=window.TreasureHunterDataV7s;if(!T)return;
  // Canonical labels from Treasure Hunter v8 final EN. IDs remain stable so saves migrate cleanly.
  const N={
    'ancient-languages':'Ancient Languages','drivers-license':"Driver's License",'specialized-expertise':'Specialized Expertise','conversational-tourist':'Conversational Tourist','born-stunt-performer':'Born Stunt Performer','cool-die':'Cool Die',
    'whip-master':'Whip Master','object-manipulation':'Object Manipulation','swing':'Swing','towing':'Towing','weapon-mastery':'Weapon Mastery','indy-slide':'Indy Slide','indy-get-up':'Indy Get-Up',
    'cool-points':"Treasure Hunter's Cool",'narrow-escape':'Narrow Escape','snatch-item':'Snatch Item','attack-slide':'Attack Slide','precision-slide':'Precision Slide','line-attack':'Line Attack','when-going-tough':'When the Going Gets Tough',
    'treasure-hunter-subclass':'Treasure Hunter Subclass','adventurers-rope':"Adventurer's Rope",'rope-snare':'Rope Snare','rope-pull':'Rope Pull','rope-takedown':'Rope Takedown','quick-rope':'Quick Rope',
    'asi-4':'Ability Score Improvement','catch-fall':'Catch a Fall','extra-attack':'Extra Attack','eye-traps':'Eye for Traps','seasoned-traveler':'Seasoned Traveler','evasion':'Evasion','improved-slide':'Improved Slide','asi-8':'Ability Score Improvement','daring-strike':'Daring Strike',
    'relic-arsenal':'Relic Arsenal','conserving-charges':'Conserving Charges','not-dead-yet':"I'm Not Dead Yet",'improved-attack-slide':'Improved Attack Slide','asi-12':'Ability Score Improvement','not-a-chance':'Not a Chance','improved-daring':'Improved Daring Strike',
    'master-relics':'Master of Relics','forced-awakening':'Forced Awakening','improved-narrow-escape':'Improved Narrow Escape','second-wind':'Second Wind','asi-16':'Ability Score Improvement','legendary-slide':'Legendary Slide','superior-daring':'Superior Daring Strike',
    'always-on-guard':'Always on Guard','ill-find-a-way':"I'll Find a Way",'find-way':"I'll Find a Way",'epic-boon':'Epic Boon','epic-boon-19':'Epic Boon','at-right-moment':'At the Right Moment','free-trick':'Free Trick',
    'curio-collection':'Curio Collection','initial-collection':'Initial Collection','prepared-relics':'Prepared Relics and Reserve','bag-full-secrets':'Bag Full of Secrets','expert-identification':'Expert Identification','know-not-touch':'I Know What Not to Touch','relic-connoisseur':'Relic Connoisseur','another-piece':'Another Piece from the Collection','intelligent-use':'Intelligent Use','familiar-premonition':'Familiar Premonition'
  };
  (T.features||[]).forEach(f=>{if(N[f.id])f.name=N[f.id]});
  T.canonicalFeatureNames=N;
})();
