(function () {
  'use strict';
  const E = window.CharacterEnglishRules, O = window.OccultistDataV10;
  if (!E || !O) return;
  const features = {
    'occult-spellcasting':['Spellcasting', `You can use occult implements as a spellcasting focus and can cast rituals. Recover spent spell slots when you finish a Long Rest.

Intelligence is your spellcasting ability. Spell Save DC = 8 + Intelligence modifier + Proficiency Bonus. Spell Attack modifier = Intelligence modifier + Proficiency Bonus.

The Occultist progression table determines your spell slots. Your ranks in the Occult Sciences grant your known cantrips and leveled spells.`],
    'planetary-alignment':['Planetary Alignment', 'At each Dawn, prepare known leveled spells for use until the next Dawn. You can change preparation whether or not you finished a Long Rest. The Planetary Alignment column of the Occultist table sets your preparation limit. Cantrips do not require preparation.'],
    'occult-sciences':['Occult Sciences', 'Spend Knowledge Points on successive ranks of Spiritism, Astrology, Kabbalah, Esotericism and Alchemy. Unspent points carry over between levels. Each rank requires the preceding rank and the specified class level. You may specialize or divide your knowledge among sciences.'],
    'magical-energy':['Magical Energy', `Use a Bonus Action and your own HP to restore a spent spell slot or pay for an upcast: level 1 costs 1d4 + 1 HP; level 2 costs 1d6 + 2 HP; level 3 costs 1d10 + 3 HP; level 4 costs 2d8 + 4 HP.

For an upcast, use an available slot or pay the corresponding HP cost. You may exceed your highest normal slot level by one. Temporary HP cannot pay this cost or be lost to it. If payment would require Temporary HP or reduce you to 0 HP, the Bonus Action is lost, the slot is not restored and Temporary HP remain unchanged.`],
    'mysticism-student':['Student of Mysticism', 'Learn one language: Hebrew, Egyptian, Sanskrit or Enochian. Gain proficiency in Arcana, History, Insight, Medicine or Religion. If already proficient in that skill, gain Expertise instead.'],
    'third-eye':['Third Eye', 'Once per Short Rest, cast Detect Evil and Good or Detect Aura without spending a spell slot.'],
    'stunning-trick':['Stunning Trick', 'Gain the Stunning Trick cantrip. Make a ranged spell attack against a creature within 30 ft. On a hit, deal 1d6 + 1 Psychic damage. If this would reduce the target to 0 HP, it immediately returns to 1 HP and is Stable and Unconscious for 1d4 hours or until it regains HP. Damage increases to 2d6 + 2 at level 5 and 3d6 + 3 at level 11.'],
    'chakra-tuning':['Chakra Tuning', 'Once per day, spend 30 minutes tuning your chakras while remaining in place and avoiding activities requiring your full attention. An interruption requires starting again. This can take place during a Short Rest. On completion, restore three spent level-1 spell slots.'],
    'magic-resistance':['Magic Resistance', 'Add 1d4 to Intelligence, Wisdom and Charisma saving throws against spells.'],
    'battle-mystic':['Battle Mystic', 'As one Action, cast a cantrip and make one attack with a Simple Weapon.'],
    'hardy-mystic':['Hardy Mystic', 'Add 1d4 to Constitution saving throws made to maintain Concentration.'],
    'magic-block':['Magic Block', `Gain proficiency in the Intelligence-based MagBlock skill. Once per hour, use an Action to attempt to suppress a magical effect within 15 ft. Make an Intelligence (MagBlock) check against a DC set by the DM according to the effect's strength. On a success, suppress it for 12 seconds (two rounds).

You can use a Bonus Action to add 1d4 to the MagBlock check. This bonus cannot be combined with Guidance.`],
    'sweet-oblivion':['Sweet Oblivion', 'When reaching level 7, you can forget the highest ranks in one or more Occult Sciences, freeing up to 3 Knowledge Points. You cannot forget a lower rank while keeping a higher one. Immediately reinvest the freed points in other sciences.'],
    'life-transfer':['Life Transfer', 'Once per Short Rest, use an Action to touch a willing creature and give it any amount of your own HP, excluding Temporary HP. Alternatively, receive exactly as many HP as a willing creature offers. Neither creature can exceed its maximum HP.'],
    'greater-magic-resistance':['Greater Magic Resistance', 'Your bonus to Intelligence, Wisdom and Charisma saving throws against spells increases from 1d4 to 1d6.'],
    'energetic-parasitism':['Energetic Parasitism', "Life Transfer can now take HP from an unwilling creature you touch, up to half that creature's maximum HP."]
  };
  for (const level of [4,8]) features[`occult-asi-${level}`]=['Ability Score Improvement / Feat','Improve ability scores or choose a feat according to the campaign rules.'];
  for (const record of O.features) E.register(record,features[record.id]);

  const spells = {
    'detect-good-evil':['Detect Evil and Good','While maintaining Concentration for up to 10 minutes, sense the locations of Aberrations, Celestials, Elementals, Fey, Fiends and Undead within 30 ft., and any Hallow effect there. Detection is blocked by 1 ft. of stone, dirt or wood, 1 inch of metal, or a thin lead sheet.'],
    'true-strike':['True Strike','Make one attack with the proficient weapon used as the Material component (worth at least 1 CP). Use your spellcasting ability for its attack and damage instead of STR or DEX. Choose Radiant damage or the normal weapon type. Add extra Radiant damage at character levels 5 (1d6), 11 (2d6) and 17 (3d6).'],
    guidance:['Guidance','Touch a willing creature and choose a skill. With Concentration for up to 1 minute, it adds 1d4 to ability checks using that skill.'],
    'word-radiance':['Word of Radiance','Choose creatures you can see within 5 ft. of yourself. Each makes a Constitution saving throw, taking 1d6 Radiant damage on a failure. Damage increases at character levels 5 (2d6), 11 (3d6) and 17 (4d6).'],
    telekinesis:['Telekinesis (Mage Hand)','Create an invisible hand within 30 ft. for 1 minute (the campaign uses Mage Hand without a visible hand). Use a Magic action to move it up to 30 ft. and manipulate an object, open an unlocked door or container, retrieve or stow an item in an open container, or pour a vial. It can carry at most 10 lb. It cannot attack, activate magic items or move beyond 30 ft. Casting again dismisses the previous hand.'],
    'protection-eg':['Protection from Evil and Good','For up to 10 minutes with Concentration, a willing creature you touch is protected against Aberrations, Celestials, Elementals, Fey, Fiends and Undead. Their attacks against it have Disadvantage. They cannot Charm, Frighten or possess it; if already affected, it has Advantage on new saves against that effect. The campaign permits an Esotericism focus as the Material component.'],
    'dancing-lights':['Dancing Lights','Create up to 4 lights within 120 ft., each shedding Dim Light within 10 ft., or combine them into one vaguely humanoid Medium form. Use a Bonus Action to move the lights up to 60 ft. A light must remain within 20 ft. of another light and within range. Duration: 1 minute, without Concentration under the campaign rules.'],
    'absorb-elements':['Absorb Elements','Use a Reaction when taking Acid, Cold, Fire, Lightning or Thunder damage. Gain Resistance to the triggering type until the start of your next turn, including against the trigger. Your first melee hit on your next turn adds 1d6 of that type; each slot level above 1 adds another 1d6.'],
    purify:['Purify Food and Drink','Remove poison and disease from nonmagical food and drink in the spell area. The campaign grants this spell through Alchemy and lists its range as Touch; the standard spell affects a 5-ft.-radius Sphere within 10 ft. Use the campaign range unless the DM specifies otherwise.'],
    'stunning-trick':['Stunning Trick','Make a ranged spell attack against a creature within 30 ft. On a hit, deal 1d6 + 1 Psychic damage. If this would reduce it to 0 HP, it immediately returns to 1 HP and is Stable and Unconscious for 1d4 hours or until it regains HP.'],
    'detect-aura':['Detect Aura', `For 5 minutes, sense magical or cursed objects, effects and creatures within 30 ft. A Magic action can examine their auras more closely and reveal the school of magic.

You also sense intelligent creatures with Intelligence 6 or higher. A Magic action reveals an aura's color and intensity, suggesting current emotions and personality traits. Metal and stone block the detection of creatures.`],
    kontakt:['Contact the Beyond', `Attempt a seance and roll 1d12.

1–3: the seance fails.
4–5: weak contact, with random or incomplete information.
6–8: strong contact with a hostile spirit that may distort the truth.
9–11: strong contact with a friendly, helpful spirit.
12: clear contact with the intended or most suitable spirit.

Roll with Advantage in a place with increased spirit activity. The spirit communicates only verbally; choose who can hear it. Additional castings within 24 hours use successively 1d10, 1d8, 1d6 and then 1d4. Material component: a spirit board, black candle or pendulum.`],
    'vyvolani-ducha':['Summon Spirit', `Summon the spirit of a specific deceased person and ask up to three questions. Its original personality and knowledge determine its cooperation and honesty.

Success chance by remains: intact corpse 90%; decomposed corpse 75%; skeleton 60%; important body part 40%; minor body part 20%; no remains 10%. A closely connected object can add up to 10%.

Casting in daylight automatically fails. Repeating this spell within 24 hours automatically fails.`],
    'moudrost-predku':['Wisdom of the Ancestors','Choose one ability. For 1 hour, add your spellcasting modifier to all ability checks and saving throws using that ability. Also gain proficiency with one weapon, one tool or one vehicle.'],
    'palm-reading':['Palm Reading','Choose a person you can touch. The target chooses a Strength or Dexterity saving throw, which it may willingly fail. On a failure, open its hand and examine the palm, learning one true fact about its past, present or possible future. A predicted future can change if someone takes measures to prevent it. On a successful save, nothing happens.'],
    predurceni:['Predestination', `As an Action, roll 1d20 and record the result. Later, when you see a creature rolling a d20, you can replace its roll with your stored result. Decide before success or failure is announced. For a Death Saving Throw, decide before the roll itself.

The effect ends when the stored roll is used, when you cast Predestination again, or when you sleep or enter a trance.`],
    'poznej-osobnost':['Read Personality', `Choose a Humanoid you can see within 20 ft. Learn its zodiac sign and basic personality traits, such as alignment, pride, greed, piety or intelligence.

Level-2 slot: also learn what it is doing today and its approximate goals.
Level-3 slot: also learn what it conceals from others.

Above level 1, the target makes a Charisma saving throw. A success withholds the additional information. It can willingly fail and does not know it is being examined.`],
    'cteni-planet':['Read the Planets', `Roll 1d10 and store the result until you sleep. Activate it once with the relevant Bonus Action or Reaction.

1 Sun: one creature gains +1 to all d20 rolls and damage rolls for 1 minute.
2 Mercury: a Reaction redirects a hit to an adjacent creature; the protected target does not provoke Opportunity Attacks for 1 minute.
3 Venus: two creatures are Charmed by one another for 1 minute.
4 Moon: a Reaction after damage causes 1 minute of weeping; the target cannot attack or speak, repeating a DC 15 Wisdom saving throw at the end of each turn.
5 Mars: a Reaction adds 2d8 Bludgeoning damage and knocks a surviving target Prone.
6 Jupiter: a Reaction rerolls a failed ability check or saving throw, followed by Advantage on ability checks and saving throws for 1 minute.
7 Saturn: until sleep, Advantage on Persuasion and Intimidation checks when trading and Investigation checks when looting.
8 Mercury in Uranus: 2d8 Poison damage and Poisoned for 1 minute.
9 Neptune: the target loses its actions and moves randomly, gains Resistance to all damage, and attacks against it have Disadvantage; repeat a DC 15 Wisdom saving throw at the end of each turn.
10 Comet: the target gains one extra complete turn immediately after yours.`],
    zviretnik:['Zodiac', `Choose up to two creatures within 15 ft. Give each the benefit or penalty associated with its zodiac sign, lasting until sleep.

Aries: Advantage on its first attack each turn / −2 AC.
Taurus: Advantage on Constitution checks / Speed −10 ft.
Gemini: Fly Speed 10 ft., no higher than 15 ft. / Disadvantage on Wisdom saves.
Cancer: attacks against allies within 5 ft. have Disadvantage / +1 damage received each time.
Leo: Immunity to Fire / ranged attacks against it have Advantage.
Virgo: regain 1d4 HP at the start of each turn / −1d4 to attack rolls.
Libra: on a hit, deal half the maximum damage +1 / on a hit, take half the maximum damage +1.
Scorpio: each damage instance adds 2 Poison / spell attacks against it have Advantage.
Sagittarius: Advantage on ranged attacks / melee attacks against it have Advantage.
Capricorn: Climb Speed equals Speed / a ranged hit knocks it Prone.
Aquarius: can change damage to Lightning / attracts Lightning and Force attacks aimed within 15 ft.
Pisces: underwater breathing and Swim Speed equal to Speed / Disadvantage on d20 rolls in direct sunlight.`],
    dissonant:['Dissonant Whispers','A creature you can see within 60 ft. makes a Wisdom saving throw. On a failure, it takes 3d6 Psychic damage and immediately uses its Reaction, if available, to move as far away as possible by the safest route. On a success, it takes half damage and does not move. Each slot level above 1 adds 1d6 damage.'],
    ceremony:['Ceremony', `Perform a 30-minute ritual. The target must stay within 10 ft. throughout. Choose one ceremony:

Atonement: a successful DC 20 Wisdom (Insight) check restores a willing target's original alignment.
Bless Water: create one flask of Holy Water.
Coming of Age: a young adult adds 1d4 to ability checks for 24 hours, once in its lifetime.
Dedication: a Humanoid adds 1d4 to saving throws for 24 hours, once.
Funeral Rite: for 7 days, a corpse cannot become Undead except through Wish.
Wedding: willing adult Humanoids gain +2 AC while within 30 ft. of one another for 7 days; they can benefit again only after being widowed.`],
    'ruka-bozi':['Hand of God', `As a Bonus Action, illuminate your palms. While maintaining Concentration, shed Bright Light for 5 ft. and Dim Light for a further 10 ft. Each round, use an Action to make a melee Unarmed Strike with a bare palm holding nothing except a Kabbalah focus. A hit deals 2d8 + your Intelligence modifier in Radiant damage.

Celestials are immune. A Fiend or Undead hit by the attack makes a Constitution saving throw or is Restrained until the end of its next turn. Each higher slot level adds 1d8 damage.`],
    'andelska-jmena':['Angelic Names', `As a Bonus Action, roll 1d10. The result is the highest-numbered archangel you may choose; on a 6, automatically summon Samael. The manifestation appears within 30 ft. and lasts up to 1 minute with Concentration.

1 Gabriel: one useful piece of information or advice.
2 Azrael: creatures within 5 ft. that drop to 0 HP gain 1 HP and become Stable and Unconscious.
3 Raphael: chosen creatures within 10 ft. gain 1d8 Temporary HP; each round, a Reaction heals a creature within 10 ft. for 1d4 HP.
4 Uriel: reveals optical illusions and shape-shifters within 15 ft.; a deliberate lie deals 1d6 Psychic damage.
5 Anael: creatures within 10 ft. are Charmed by one another and cannot attack each other.
6 Samael: each round, an unstable portal rolls 1d4 to do nothing, deal 3 Psychic damage within 10 ft., summon an Imp, or summon Lilith.
7 Orifiel: attackers within 15 ft. take half the damage they deal; healers regain half the HP they restore.
8 Michael: chosen creatures within 10 ft. gain +1 AC and +1 to attack rolls.
9 Ariel: a fire vortex deals 2d6 Fire inside and 1d6 Fire within 5 ft. of its edge, with a Strength saving throw against being drawn in.
10 Raguel: all non-Good enemies within 15 ft. take 3d8 Lightning damage, then the spell ends.`],
    'oziveni-golema':['Animate Golem', `Spend 10 minutes animating a prepared clay statue. Command it verbally with an Action or Bonus Action; in combat, it acts immediately after you. The spell ends when the golem is destroyed, you end it, or you cast it again.

Golem: Medium; AC 16; HP 40; Speed 30 ft.; STR 20, DEX 8, CON 16; Darkvision 30 ft. Melee attack +5, reach 5 ft., 2d8 Bludgeoning damage. Fire Breath: 15-ft. Cone, DC 14 Dexterity saving throw, 2d8 Fire damage, three uses per Long Rest. One Action can include both a melee attack and Fire Breath. In water, it takes 2d10 Acid damage at the start of its turn.`],
    'karmicky-utok':['Karmic Strike','As a Reaction when a creature you can see within 60 ft. deals damage with an attack, force it to make a Wisdom saving throw. It takes 2d10 Psychic damage on a failure, half on a success. Each higher spell slot level adds 1d10 damage.'],
    'ocista-aury':['Cleanse Aura','Choose a creature within 15 ft., including yourself. End Charmed or Frightened on it, or end Blinded, Deafened, Stunned or Paralyzed caused by a spell.'],
    amulet:['Amulet', `Ritually enchant a crystal or gemstone worth at least 20 GP.

Protective Amulet: Divination magic cannot track its wearer; the wearer has Advantage on Intelligence, Wisdom and Charisma saves against spells, and Opportunity Attacks against it have Disadvantage.

Dark Amulet: the wearer has Disadvantage on all saving throws and −2 AC.

The wearer is the creature occupying the same 5-ft. space; the amulet can be planted on someone. At most two of your amulets can exist at once. A third ends the oldest. A used crystal cannot be enchanted again.`],
    kaboom:['Kaboom', `Touch a small, solid, nonmagical object and store energy in it for up to 10 minutes. Detonate it with a Bonus Action, or with a Reaction when someone comes within 5 ft.

The object is destroyed. All creatures within 5 ft. make a Dexterity saving throw, taking 2d8 Thunder damage on a failure or half on a success. A creature wearing or touching the object automatically fails. The explosion is audible within 300 ft. Each higher slot level adds 1d8 damage.`],
    'alter-self':['Alter Self', "Use Alter Self, additionally requiring Alchemist's Supplies. You can also cast it on a willing creature you touch. That creature makes a DC 15 Constitution saving throw; on a failure, it loses 2d8 HP and the spell fails."],
    'premena-kovu':['Transmute Metal', `Once per Short Rest, turn ordinary metal into copper, copper into silver, or silver into gold. The resulting value cannot exceed 50 GP. Shape and size remain unchanged.

Roll 1d6: 1 destroys half the material; 2 has no effect; 3 transforms it for 1 hour; 4 for 6 hours; 5 for 24 hours; 6 permanently.`],
    'chill-touch':['Chill Touch','On a melee spell attack hit, deal 1d10 Necrotic damage and prevent the target from regaining HP until the end of your next turn.'],
    'spare-dying':['Spare the Dying','A living creature at 0 HP becomes Stable.'],
    'false-life':['False Life','Gain 2d4 + 4 Temporary HP.'],
    'inflict-wounds':['Inflict Wounds','The target makes a Constitution saving throw, taking 2d10 Necrotic damage on a failure or half on a success.'],
    'vicious-horoscope':['Vicious Horoscope','The target makes a Wisdom saving throw. On a failure, it takes 1d6 Psychic damage and has Disadvantage on its next attack roll. At character levels 5, 11 and 17, damage increases to 2d6, 3d6 and 4d6.'],
    'cure-wounds':['Cure Wounds','A creature you touch regains 2d8 + your spellcasting ability modifier in HP.'],
    thunderwave:['Thunderwave','Creatures in a 15-ft. Cube make a Constitution saving throw. A failure deals 2d8 Thunder damage and pushes the target 10 ft.; a success halves the damage and prevents the push.'],
    'blade-ward':['Blade Ward','While you maintain Concentration, up to 1 minute, a creature making an attack roll against you subtracts 1d4 from that roll.'],
    'mage-armor':['Mage Armor','A willing creature you touch that is not wearing armor gains base AC 13 + its Dexterity modifier for 8 hours. The spell ends if the target dons armor.'],
    'fire-bolt':['Fire Bolt','Make a ranged spell attack. A hit deals 1d10 Fire damage. At character levels 5, 11 and 17, damage increases to 2d10, 3d10 and 4d10.']
  };
  const scienceAbilities = {
    'Polapení duše':['Soul Binding','As a Reaction when a Humanoid dies within 15 ft., bind its soul. You can bind at most two souls and gain +1 AC for each. Release one as a Free Action to gain 2d4 Temporary HP.'],
    'Vstoupení do éterální pláně':['Enter the Ethereal Plane','For 1 hour, use a Bonus Action to move between the Material and Ethereal Planes. Each entry into the Ethereal Plane costs 1d6 + 2 HP. There, you are invisible and intangible to Material creatures, cannot interact with them, and can pass through ordinary matter. Very thick obstacles and magical barriers may stop you.'],
    'Ochrana čtyř elementů':['Protection of the Four Elements','Once per day, choose a creature. Until its Long Rest ends, it gains Resistances based on its zodiac element: fire grants Fire and Lightning; earth grants Slashing, Piercing and Bludgeoning; air grants Thunder, Psychic and Force; water grants Cold, Acid and Poison. After hitting, it can use a Bonus Action to add 1d4 of a corresponding damage type.'],
    'Moudrost vesmíru':['Wisdom of the Universe','Gain Expertise in Insight. Once per Long Rest, gain Truesight 30 ft. for 1 hour.'],
    'Ochranný kruh':['Protective Circle','Spend 10 minutes drawing an unbroken circle 5, 10 or 15 ft. in diameter. Choose two creature types that cannot cross it. They can attack across its edge, but first roll 1d4: on 1–3 they automatically miss; on 4 they attack normally and damage the circle. The circle ends after three such instances of damage, at the end of your Long Rest, or when you create another.'],
    Golem:['Golem','Use 80 kg of clay or earth, 20 L of water and 12 hours of work to make a stationary humanoid statue. Cast Animate Golem on the finished statue. That spell is always prepared and does not count against Planetary Alignment.'],
    'Mistr čaker':['Chakra Master','Once per Long Rest, meditate for 10 minutes and choose one: end Poisoned; cure a minor nonmagical disease; regain 2d4 HP; lose 2d4 HP to remove one Exhaustion level; or gain +2 to Intelligence, Wisdom and Charisma saves until sleep.'],
    'Prokletá panenka':['Cursed Doll','Make a doll from 5 GP of materials and attach a body part from another creature. Three times per Long Rest, use an Action to deal 3d8 Piercing damage, destroy the doll for 8d6 Fire damage, disable an arm or slow a leg, or heal 3d8 HP. The donor must be on the same plane and makes a Wisdom saving throw, which it may willingly fail.'],
    'Experiment pro každý den':['Daily Experiment',"Once per day, spend 10 minutes with Alchemist's Supplies to make a random product: 1 heals 2d4 + 2 HP; 2 grants +2 STR for 1 hour; 3 grants +2 AC for 1 hour; 4 grants jumping movement for 1 hour; 5 grants wall and ceiling movement for 1 hour; 6 creates glue covering 10 ft². The product lasts until the end of the next Long Rest. Before rolling, pay 1d4 + 1 HP per result you want to exclude."],
    'Změna vlastní podstaty':['Change Your Essence','Once per Short Rest, use a Bonus Action to adopt a light, heavy or soft form for 1 minute. Light: levitate 5–20 ft. and take no falling damage. Heavy: Speed 5 ft., tenfold weight, Immunity to nonmagical attacks, and Resistance to Fire, Lightning, Cold, Acid and Poison. Soft: you are Prone and cannot make weapon attacks or cast spells with Somatic components, but melee attacks and Grapples against you have Disadvantage; pass through openings at least 20 cm². Return to normal with a Bonus Action.']
  };
  for (const record of O.spells) E.register(record,spells[record.id]);
  for (const [name,text] of Object.entries(O.scienceAbilities)) E.register({name,fullText:text},scienceAbilities[name]);
  const labels = {
    Spiritismus:'Spiritism',Astrologie:'Astrology',Kabala:'Kabbalah',Esoterika:'Esotericism',Alchymie:'Alchemy',
    'Základy spiritismu':'Spiritism Basics','Vymítání':'Exorcism','Vyvolávání a poutání':'Summoning and Binding','Eterální mistrovství':'Ethereal Mastery',
    'Základy astrologie':'Astrology Basics','Čtení planet':'Planetary Reading','Základy kabaly':'Kabbalah Basics','Slovo a mysl':'Word and Mind','Obřady a ochrana':'Ceremonies and Protection','Boží a andělská moc':'Divine and Angelic Power',
    'Základy esoteriky':'Esotericism Basics','Čakry a aura':'Chakras and Aura','Amulety':'Amulets','Základy alchymie':'Alchemy Basics','Experimentace':'Experimentation',
    'Volitelný Necromancy spell':'Optional Necromancy Spell','Volitelný Divination spell':'Optional Divination Spell','Volitelný Conjuration spell':'Optional Conjuration Spell','Volitelný Abjuration spell':'Optional Abjuration Spell','Volitelný Transmutation spell':'Optional Transmutation Spell',
    'Jeden spell 1st nebo 2nd levelu.':'One level-1 or level-2 spell.','Jeden spell 1st až 3rd levelu.':'One level-1, level-2 or level-3 spell.',
    'Chill Touch nebo Spare the Dying.':'Chill Touch or Spare the Dying.','True Strike nebo Vicious Horoscope.':'True Strike or Vicious Horoscope.','Guidance nebo Word of Radiance.':'Guidance or Word of Radiance.','Blade Ward nebo Telekinesis, mechanicky Mage Hand.':'Blade Ward or Telekinesis (uses Mage Hand rules).','Dancing Lights bez koncentrace nebo Fire Bolt.':'Dancing Lights without Concentration or Fire Bolt.',
    'Spiritistická tabulka, černá svíce nebo kyvadlo':'Spirit board, black candle or pendulum','Astrologická mapa nebo zápisník výpočtů':'Star chart or calculation notebook','Kabalistická příručka nebo sada šémů':'Kabbalah manual or sacred inscription set','Sada krystalů, kadidlo nebo vonné tyčinky':'Crystal set, incense or incense sticks',
    'Do spánku':'Until sleep or trance','Karma':'Karma','Hopsinková šťáva':'Jumping Elixir',
    'Occult Sciences: knowledge points exceeded':'Occult Sciences: Knowledge Points exceeded'
  };
  for (const [key,value] of Object.entries(labels)) E.exact.set(key,value);
  for (const entry of Object.values(features).concat(Object.values(spells),Object.values(scienceAbilities))) {
    // Resolve the other canonical name variants used in science lists and resource labels.
    const original=O.features.find(record=>features[record.id]===entry)?.name || O.spells.find(record=>spells[record.id]===entry)?.name;
    if(original)E.exact.set(original,entry[0]);
  }
  for (const action of O.actions) {
    const definition=O.features.find(record=>record.name===action.name);
    const translation=definition && features[definition.id];
    if(translation)E.register(action,translation);
  }
  E.occult=features; E.occultSpells=spells;
  const metadata={
    'true-strike':{components:'S, M (a proficient weapon worth 1+ CP)',duration:'Instantaneous',attack:'Weapon attack (INT)'},
    guidance:{components:'V, S',duration:'Concentration, up to 1 minute',attack:'Ability check bonus'},
    'word-radiance':{components:'V, M (a holy symbol)',duration:'Instantaneous'},
    telekinesis:{components:'V, S',duration:'1 minute'},
    'protection-eg':{components:'V, S, M (Esotericism focus)',duration:'Concentration, up to 10 minutes'},
    'absorb-elements':{time:'Reaction',components:'S',duration:'1 round'},
    'palm-reading':{attack:'STR or DEX save'},predurceni:{duration:'Until sleep or trance'},
    kontakt:{components:'V, S, M (Spiritism focus)'},'vyvolani-ducha':{components:'V, S, M (Spiritism focus)'}
  };
  E.spell = record => {
    const value=spells[record.id];
    return value ? {...record,...metadata[record.id],name:value[0],fullText:value[1],desc:value[1]} : record;
  };
})();
