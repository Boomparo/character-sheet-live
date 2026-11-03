(function () {
  'use strict';
  // Presentation-only translations. IDs, selections and the authored source records remain unchanged.
  const treasure = {
    'ancient-languages': ['Ancient Languages', `You know three ancient languages chosen from Latin, Old Celtic, Old Germanic, Ancient Greek, Egyptian, Hebrew, Arabic, Persian, Akkadian (including Babylonian and Assyrian), Sanskrit, Mandarin, Nahuatl, Mayan languages and Quechua.

You have Advantage on Intelligence (History) checks about a culture whose ancient language you know. For example, Quechua grants Advantage on History checks about the Inca Empire, its culture, customs and artifacts.`],
    'drivers-license': ["Driver's License", 'Gain proficiency with two types of vehicles of your choice.'],
    'specialized-expertise': ['Specialized Expertise', 'Choose one skill in which you are proficient. Gain Expertise in that skill.'],
    'conversational-tourist': ['Conversational Tourist', 'Using gestures, expressions and a few universal words, you can convey a simple idea to a creature with Intelligence 8 or higher even when you share no language, and understand its simple reply. The DM may require a Charisma check for more complex communication.'],
    'born-stunt-performer': ['Born Stunt Performer', `Use Dexterity instead of Strength to determine your jump distance and height. You may also use Dexterity instead of Strength for ability checks involving jumping, climbing or balance.

Running Long Jump: up to your Dexterity score in feet. Standing Long Jump: half that distance. Running High Jump: 3 + your Dexterity modifier in feet, minimum 0. Standing High Jump: half that height.`],
    'cool-die': ['Cool Die', 'Some Treasure Hunter features use your Cool die: 1d6 at levels 1–4, 1d8 at levels 5–9, 1d10 at levels 10–15 and 1d12 at levels 16–20.'],
    'whip-master': ['Whip Master', `Your whip is both a weapon and a versatile adventuring tool. Its weapon damage die is 1d6. Whenever you can make an attack, you may make it with your whip. Whenever you would make a whip attack, you may replace it with one of this feature's tricks.

The whip retains its other properties, and you can use its Mastery property. Simply holding a whip does not grant an additional attack.`],
    'object-manipulation': ['Object Manipulation', `Replace a whip attack by pulling an object within 15 ft. An unattended Tiny object can be pulled into your free hand, to your feet, or up to 15 ft. toward you.

This trick deals no damage. It cannot affect an object firmly attached to a body or magically bonded to its holder.`],
    swing: ['Swing', `Instead of using Indy's Slide, use a Bonus Action to catch a suitable stationary or moving object you can see within 15 ft. with your whip or rope, then swing from it or let it pull you. This counts as your use of Indy's Slide for the round.

If this movement occurs during your turn and you have Attack Slide, you can interrupt it with attacks made as part of the Attack action. Movement outside your turn grants no additional attacks.

Opportunity Attacks provoked by this movement have Disadvantage. You must hold the whip or rope in at least one hand. In difficult circumstances, the DM may require a Dexterity (Acrobatics) check or a whip attack roll against a DM-set DC.

When catching a stationary object, move safely in a straight line up to twice the distance between you and that object. This movement does not spend your Speed.`],
    towing: ['Towing', `When a suitable moving object, such as a wagon, leaves your 15-ft. reach and you have not used Indy's Slide this round, use your Reaction to catch it with a whip or rope and be pulled along. This counts as your use of Indy's Slide for the round.

While attached, move with the object whenever it moves. The connection lasts until the end of your next turn. During that turn, a Bonus Action extends it until the end of the following turn; this also counts as using Indy's Slide. You can extend the tow repeatedly.

If the object turns sharply or changes direction significantly, make a Dexterity saving throw against a DM-set DC. On a failure, release it. You also release it if you spend your Speed to move, let go of the whip or rope, or become Incapacitated.`],
    'weapon-mastery': ['Weapon Mastery', 'Choose two weapon types with which you are proficient. You can use their Mastery properties. Whenever you finish a Long Rest, you can replace one chosen weapon type with another.'],
    'indy-slide': ["Indy's Slide", `Once per round, use a Bonus Action to move up to 15 ft. in a straight line without spending your Speed.

• You cannot change direction during the slide.
• You can pass through the space of a creature of your size or larger if there is physically enough room beneath or around it.
• Opportunity Attacks provoked by this movement have Disadvantage.
• You become Prone after the slide.
• Until you gain Attack Slide, you cannot attack during this movement.
• End in a valid unoccupied space you can occupy.
• You cannot use Indy's Slide while your Speed is 0.`],
    'indy-get-up': ["Indy's Get-Up", 'While Prone, use a Bonus Action to stand without spending your Speed. When circumstances allow, you can also use this to get out of a bed, seat or similar position.'],
    'cool-points': ['Cool Points', 'Your courage, improvisation and extraordinary luck are represented by Cool Points. Your maximum equals your Treasure Hunter level. Recover all spent Cool Points when you finish a Short Rest or Long Rest.'],
    'narrow-escape': ['Narrow Escape', `When an attack roll hits you, but before its damage is resolved, use your Reaction and spend 1 Cool Point. Gain Temporary HP equal to 1 Cool die + your Treasure Hunter level + your Proficiency Bonus.

After resolving the attack, you can immediately move up to 5 ft. without provoking Opportunity Attacks.`],
    'snatch-item': ['Snatch Item', `When you hit a creature with a whip attack, spend 1 Cool Point and choose an object it holds. The target makes a Strength saving throw against your Whip DC, with Advantage if it holds the object in two hands.

On a failure, pull the object into your free hand or to your feet. The attack deals its normal damage regardless of the save. This cannot affect a worn, firmly attached or magically bonded object.`],
    'attack-slide': ['Attack Slide', `During Indy's Slide, you can interrupt the movement with attacks from your Attack action, making each attack at a different point along the slide.

When starting the slide, you can spend 1 Cool Point to choose Precision Slide or Line Attack. Normally you can use only one of these upgrades during a single slide.`],
    'precision-slide': ['Precision Slide', `During Precision Slide, you can make melee and ranged attacks, including firearm attacks.

Once during the slide, before making a weapon attack roll, declare it precise. The roll has Advantage. On a hit, deal additional damage equal to 1 Cool die, of the weapon's damage type.

A creature hit by this attack cannot make Opportunity Attacks against you until the end of your turn.`],
    'line-attack': ['Line Attack', `When taking the Attack action during Attack Slide, replace one attack with Line Attack. You must be able to target at least two different creatures.

Choose up to your Dexterity modifier in creatures, minimum two. Each must be within reach of a melee weapon you hold at some point during the slide. Make a separate attack roll against each, resolving them in the order you pass the targets. A creature can be targeted only once.

The first hit deals normal weapon damage, including the ability modifier and Mastery. Each subsequent hit deals only one roll of the weapon's damage die. Do not add an ability modifier, Mastery, extra damage or other on-hit effects to subsequent hits.

Creatures hit by this attack cannot make Opportunity Attacks against you until the end of your turn.`],
    'when-going-tough': ['When the Going Gets Tough', `When rolling Initiative, you can recover all spent Cool Points. Also roll 1 Cool die and regain that many HP. Cool Points cannot exceed your level-based maximum.

Once used, this feature recharges when you finish a Long Rest.`],
    'treasure-hunter-subclass': ['Treasure Hunter Subclass', 'At level 3, gain a Treasure Hunter subclass. The supplied subclass is Occult Collector. Gain additional subclass features at levels 6, 10 and 14.'],
    'adventurers-rope': ["Adventurer's Rope", `Your rope helps you climb, rappel, catch enemies, pull them closer and cross obstacles. Form a loop in a suitable rope; using it requires at least one free hand.

The rope is not a weapon and has no Mastery property. Rope DC = 8 + Proficiency Bonus + Dexterity modifier.`],
    'rope-snare': ['Rope Snare', `When taking the Attack action, replace one attack by throwing your rope at a Large or smaller creature within 15 ft.

The target makes a Dexterity saving throw against your Rope DC. On a failure, it is Grappled by you, and you hold the end of the rope.

While holding the rope in at least one hand, you can move normally but cannot move more than 20 ft. from the Grappled creature. The Grapple ends if you release the rope, the rope is destroyed, you become Incapacitated, or you move more than 20 ft. away.

The target can use an Action to make a Strength (Athletics) or Dexterity (Acrobatics) check against your Rope DC, ending the Grapple on a success.`],
    'rope-pull': ['Rope Pull', 'Once on each of your turns, without using an action, pull a creature Grappled by your rope. If it is Large or smaller, pull it up to 10 ft. toward you. If it is larger, move yourself up to 10 ft. toward it instead.'],
    'rope-takedown': ['Rope Takedown', 'While a creature is Grappled by your rope, replace one attack by attempting to pull it down. It makes a Strength saving throw against your Rope DC or becomes Prone.'],
    'quick-rope': ['Quick Rope', `When a Large or smaller creature you can see within 15 ft. is about to leave that reach using movement, an Action, Bonus Action or Reaction, use your Reaction immediately before it leaves. You need one free hand and cannot already be holding another creature with the rope.

The target makes a Dexterity saving throw against your Rope DC. On a failure, it is Grappled by you, its movement immediately ends, and it remains in the triggering space. On a success, nothing happens.

Disengage, teleportation and movement that does not provoke Opportunity Attacks do not trigger this Reaction.`],
    'initial-collection': ['Initial Collection', `Choose four relics from the Occult Collector list, meeting their level requirements. Two are prepared; the others form your reserve.

Relics can come from earlier expeditions, a mentor or an introductory adventure. The DM may replace one with a story item with identical mechanics or add unique relics as rewards.

Whenever you gain a Treasure Hunter level, you may replace one subclass-granted relic with another for which you qualify.`],
    'prepared-relics-reserve': ['Prepared Relics and Reserve', 'Relics you can currently use are your prepared relics. Other relics granted by this subclass form your reserve.'],
    'bag-full-secrets': ['Bag Full of Secrets', `This unassuming travel bag also opens into a small extradimensional storage space. Only relics granted by this subclass can enter it. The opening magically adapts to each relic's shape and size. Relics inside weigh nothing and their properties cannot be used.

Prepared relics are physically in the bag unless you hold, wear or place them elsewhere. Reaching for a particular prepared relic finds it immediately. Reserve relics remain inaccessible in the extradimensional space and cannot be removed until prepared.`],
    'preparing-relics': ['Preparing Relics', `Whenever you finish a Long Rest, you may change your prepared relics. Relics no longer prepared disappear into the bag regardless of their location. Newly prepared relics appear physically in the bag and can be removed normally.

Changing preparation does not activate a relic or restore charges or limited uses.`],
    'handling-relics': ['Handling Relics', 'Once on each of your turns, while carrying your Bag Full of Secrets, you may take one relic from it into a free hand or put one relic within reach into the bag without using an action. Each additional interaction that turn requires a Utilize action.'],
    'using-relics': ['Using Relics', `A prepared relic can be used only outside the bag. Unless its description says otherwise, hold it when activating it, or wear it if it is intended to be worn. As part of activating a relic with an ongoing effect, you may place it in an unoccupied space within reach.

A relic needed for a Reaction must be outside the bag before the trigger. Each relic's description specifies its use and restrictions. You can activate only one relic per turn. Spending a charge or limited use always counts as activation unless stated otherwise. Passive properties do not count.

Returning a relic to the bag immediately ends effects requiring its physical presence. Other effects continue for their stated duration.`],
    'magical-bond': ['Magical Bond', `Relics granted by this subclass are magically bonded only to you. Another creature cannot activate their properties, spend their charges or gain their passive benefits even while holding or wearing them. It can still be targeted or affected by their effects.

These relics do not require Attunement or occupy an Attunement slot unless their description says otherwise. The Bag Full of Secrets is also bonded to you; you always know its direction and distance.`],
    'bags-protection': ["Bag's Protection", `A creature reaching into the bag without your permission or instruction makes a Wisdom saving throw against DC 8 + your Proficiency Bonus + your Intelligence modifier.

On a failure, it takes Force damage equal to your Treasure Hunter level in d6 + your Treasure Hunter level, is pushed 10 ft. away and retrieves nothing. On a success, it takes half damage, is not pushed and can complete the interaction. Relic Save DC = 8 + Proficiency Bonus + Intelligence modifier.`],
    'expert-identification': ['Expert Identification', `After 1 hour of focused examination, learn a magic item's ordinary properties, activation method and Attunement requirement. You do not automatically detect a curse.

You may make an Intelligence (Arcana, History or Religion) check against a DM-set DC. A success reveals that the item is cursed, but not the curse's exact nature.`],
    'know-not-to-touch': ['Know Where Not to Touch', 'You have Advantage on saving throws caused by cursed magic items.'],
    'catch-a-fall': ['Catch a Fall', `When you or another creature within 15 ft. starts falling, use your Reaction to try to stop the fall. Use a free hand within 5 ft., or a whip or rope within 15 ft. Make a Dexterity (Acrobatics) check against a DM-set DC.

If catching another creature, also spend 1 Cool Point. On a success, stop the fall; the caught creature hangs 5 ft. below you when caught by hand, or 15 ft. below you when caught by whip or rope. A creature at least one size larger than you may pull you along; the DM may require a Strength (Athletics) check.`],
    'extra-attack': ['Extra Attack', 'When taking the Attack action on your turn, attack twice instead of once. You can replace individual attacks with whip or rope tricks when their conditions are met.'],
    'eye-for-traps': ['Eye for Traps', 'When making an ability check to find, detect or disarm a trap, or a saving throw to avoid its effects, add your Intelligence modifier if the roll does not already include it. After discovering a trap, identify its likely trigger and basic function.'],
    'seasoned-traveler': ['Seasoned Traveler', 'Gain a Climb Speed and Swim Speed equal to your Speed.'],
    'relic-connoisseur': ['Relic Connoisseur', 'Choose two additional relics. You can now have three prepared relics and three reserve relics.'],
    'another-piece-collection': ['Another Piece from the Collection', 'Use an Action to replace one prepared relic with a reserve relic you carry. This does not activate the relic or restore its charges or limited uses.'],
    'intelligent-use': ['Intelligent Use', 'If a magic item uses your spellcasting ability, you may use Intelligence. Its attack modifier is your Intelligence modifier + Proficiency Bonus, and its Save DC is 8 + Intelligence modifier + Proficiency Bonus.'],
    'familiar-premonition': ['Familiar Premonition', 'Once per Long Rest, without using an action, actively sense cursed items within 5 ft. If any are present, you know which items are cursed.'],
    evasion: ['Evasion', 'When an effect allows a Dexterity saving throw for half damage, take no damage on a success and half damage on a failure. You cannot use this feature while Incapacitated.'],
    'improved-slide': ['Improved Slide', "Indy's Slide increases to 20 ft. If you stand normally after sliding during the same turn, standing costs only 10 ft. of Speed rather than half your Speed if that costs less."],
    'daring-strike': ['Daring Strike', `Once on each of your turns when you hit a creature with a weapon attack, deal an extra 1 Cool die of the weapon's damage type if at least one condition applies: you moved at least 10 ft. in a straight line this turn; the attack was made during Indy's Slide or Swing; or the target is Grappled or Prone.`],
    'relic-arsenal': ['Relic Arsenal', 'Choose two additional relics. You can now have four prepared relics and four reserve relics.'],
    'conserving-charges': ['Conserving Charges', 'Whenever activating a magic item or relic would spend one or more charges, roll 1d6. On a 6, no charges are spent.'],
    'not-dead-yet': ['Not Dead Yet', 'If you would drop to 0 HP without being killed outright, you can drop to 1 HP instead. Then move up to 10 ft. without provoking Opportunity Attacks. Once used, this feature recharges on a Short Rest or Long Rest.'],
    'improved-attack-slide': ['Improved Attack Slide', `Attack Slide gains two upgrades.

• For each Line Attack hit after the first, you may roll 1 Cool die instead of the weapon's damage die if that is better.
• After finishing Attack Slide, you may stand once per turn without spending your Speed.`],
    'not-a-chance': ['Not a Chance', 'After failing a saving throw, spend 1 Cool Point, roll 1 Cool die and add the result to the save, potentially turning it into a success. You can use this only once for any particular saving throw.'],
    'improved-daring': ['Improved Daring Strike', 'Daring Strike deals an extra 2 Cool dice instead of 1.'],
    'master-relics': ['Master of Relics', 'Choose two additional relics. You can now have five prepared relics and five reserve relics.'],
    'forced-awakening': ['Forced Awakening', 'Once per Long Rest, activate a relic with no charges or with its limited use already spent. After resolving its effect, take 3 Cool dice of Psychic damage; this damage cannot be reduced in any way. You cannot use that relic again until you finish a Long Rest.'],
    'improved-narrow-escape': ['Improved Narrow Escape', 'When using Narrow Escape, roll 2 Cool dice instead of 1 for its Temporary HP, and move up to half your Speed instead of 5 ft.'],
    'second-wind': ['Second Wind', 'Once per Long Rest, if you start your turn at 0 HP and are not dead, you can use this feature even while Unconscious. Spend 2 Cool Points, regain HP equal to 2 Cool dice + your Treasure Hunter level, and immediately stand without spending your Speed.'],
    'legendary-slide': ['Legendary Slide', "Indy's Slide increases to 30 ft., and you may change direction once by up to 90 degrees. When starting Attack Slide, you may spend 2 Cool Points instead of 1 to use both Precision Slide and Line Attack during that slide. The precise attack may be one of the Line Attack rolls."],
    'superior-daring': ['Superior Daring Strike', 'Daring Strike deals an extra 3 Cool dice instead of 2.'],
    'always-on-guard': ['Always on Guard', 'While you are not Incapacitated, attack rolls against you cannot have Advantage.'],
    'find-a-way': ["I'll Find a Way", 'At the start of your turn, spend 1 Cool Point to end Grappled or Restrained on yourself. Then move up to 10 ft. without provoking Opportunity Attacks.'],
    'epic-boon': ['Epic Boon', 'Gain an Epic Boon feat or another feat for which you qualify.'],
    'at-right-moment': ['At the Right Moment', 'Once per round, when an enemy within 15 ft. becomes Prone or Grappled, misses an attack, or takes a Critical Hit, immediately make one weapon attack against it without using your Reaction.'],
    'free-trick': ['Free Trick', 'The first Treasure Hunter feature on each of your turns that would cost 1 Cool Point costs 0 instead.'],
    'adventurer-through-and-through': ['Adventurer Through and Through', 'Years in archives, ruins and unfamiliar lands have taught you the following skills.'],
    'indy-maneuvers': ["Indy's Maneuvers", "Your cinematic movement includes Indy's Slide and Indy's Get-Up."],
    'curiosity-collection': ['Collection of Curiosities', 'An Occult Collector gathers unusual tools, cursed mementos and objects whose true purpose may have eluded even their original owners.'],
    'against-all-odds': ['Against All Odds', 'Adventure has taught you to keep going when a sensible person would flee.'],
    'unstoppable-adventurer': ['Unstoppable Adventurer', 'At the peak of your career, you remain alert and can escape seemingly hopeless situations.'],
    'wealth-and-glory': ['Wealth and Glory', 'You have become a legend whose survival defies probability.']
  };
  for (const level of [4,8,12,16]) treasure[`asi-${level}`] = ['Ability Score Improvement', 'Gain the Ability Score Improvement feat or another feat for which you qualify.'];

  const exact = new Map();
  function register(record, value) {
    if (!record || !value) return;
    exact.set(record.name, value[0]);
    for (const key of ['fullText','summary','desc']) if (record[key]) exact.set(record[key], value[1]);
  }
  for (const record of window.TreasureHunterDataV7s?.features || []) register(record, treasure[record.id]);
  for(const [source,english] of Object.entries({
    'Lukyho univerzální background':"Luky's Universal Background",'Lukyho homebrew':"Luky's Homebrew",'Starověké jazyky':'Ancient Languages',
    Latina:'Latin','Starokeltština':'Old Celtic','Starý keltský jazyk':'Old Celtic','Starý germánský jazyk':'Old Germanic','Starogermánština':'Old Germanic','Stará řečtina':'Ancient Greek','Egyptština':'Egyptian','Hebrejština':'Hebrew','Arabština':'Arabic','Perština':'Persian','Akkadština':'Akkadian','Sanskrt':'Sanskrit','Mandarínština':'Mandarin','Mayské jazyky':'Mayan languages','Kečuánština':'Quechua',
    'Student mystiky: language':'Student of Mysticism: language','Student mystiky: skill':'Student of Mysticism: skill','Occultist: 3 class skills':'Occultist: 3 class skills',
    'Posilování magické energie':'Magical Energy','Postavení planet':'Planetary Alignment','Třetí oko':'Third Eye','Ladění čaker':'Chakra Tuning','Blokování magie':'Magic Block','Přelévání života':'Life Transfer'
  }))exact.set(source,english);
  const numerals={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12'};
  const numeric=value=>value.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,word=>numerals[word]);
  window.CharacterEnglishRules = { treasure, exact, register, text:value => {const source=String(value ?? ''); return exact.has(source)?numeric(exact.get(source)):source;} };
})();
