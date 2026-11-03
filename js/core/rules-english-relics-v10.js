(function () {
  'use strict';
  const E=window.CharacterEnglishRules;
  if(!E)return;
  const relics={
    'master-thiefs-key':["Master Thief's Key",`This key replaces Thieves' Tools. While using it, you have Advantage on ability checks to pick locks or disarm traps.

After failing such a check, but before the DM describes the consequences, you can add 1 Cool die to the result. You can do this a number of times equal to your Proficiency Bonus, recovering all uses on a Long Rest.`],
    'travelers-talisman':["Traveler's Talisman",'Your Speed increases by 5 ft., and nonmagical Difficult Terrain costs you no extra movement.'],
    'gravity-idol':['Gravity Idol',`The relic has 1 charge, recovered on a Long Rest.

Gravitational Center. Use a Magic action and spend the charge to choose a point within 60 ft. For up to 1 minute with Concentration, ground within 20 ft. of that point is Difficult Terrain for all creatures except you.

When another creature starts its turn in the area, it makes a Strength saving throw against your Relic DC or is pulled 10 ft. straight toward the center. This movement does not provoke Opportunity Attacks.`],
    'thunder-idol':['Thunder Idol',`The relic has 3 charges, all recovered on a Long Rest.

Thunder Burst. Once on each of your turns when you hit a creature with a weapon attack, spend 1 charge to deal an additional 1 Cool die of Thunder damage. If the target is Large or smaller, you may also push it up to 10 ft. straight away from you.`],
    'cat-idol':['Cat Idol',`Gain Darkvision 30 ft., or extend existing Darkvision by 30 ft. You can see normally through magical and nonmagical Darkness within 30 ft.

You have Advantage on Dexterity (Acrobatics) checks to balance and on saving throws to avoid becoming Prone.`],
    'healing-amulet':['Healing Amulet',`The relic has charges equal to your Proficiency Bonus, all recovered on a Long Rest.

Life Has Not Faded. Use a Magic action, touch a creature and spend 1 charge to restore HP equal to 2 Cool dice + your Intelligence modifier, minimum 1 HP. If the target is at 0 HP, use the maximum result of both Cool dice instead of rolling.`],
    'lucky-coin':['Lucky Coin',`The relic has 3 charges, all recovered on a Long Rest.

Once More. After failing an ability check, spend 1 charge to reroll it. You must use the new result.`],
    'occult-lens':['Occult Lens','Detect Magic. While the relic is active, you can cast Detect Magic without a spell slot or Material components, but with a range of only 5 ft.'],
    'protective-scarab':['Protective Scarab','Divine Favor. After rolling a saving throw but before its outcome is announced, add 1 Cool die. Once used, this property recharges on a Short Rest or Long Rest.'],
    'guardians-signet-ring':["Guardian's Signet Ring",'Deflecting Hit. When an attack roll hits you, use your Reaction to increase your AC by 1d6 until the start of your next turn, including against the triggering attack. This can turn the hit into a miss. Once used, this property recharges on a Short Rest or Long Rest.'],
    'ashes-unseen-procession':['Ashes of the Unseen Procession',`The relic has 2 charges, all recovered on a Long Rest.

Veil of Ash. Use a Bonus Action and spend 1 charge to choose a point within 30 ft. A 10-ft.-radius Sphere around it is Heavily Obscured until the start of your next turn. Strong wind disperses the ash immediately.`],
    'ancient-mariners-compass':["Ancient Mariner's Compass",`True Bearing. You always know north and your approximate altitude or depth, and nonmagical effects cannot make you lost. You and creatures traveling within 30 ft. have Advantage on Wisdom (Survival) checks to navigate.

Once per Long Rest, study the compass for 1 minute and name a place you have visited within 10 miles. For 1 hour, it points along the nearest passable route to that place, without accounting for moving hazards.`],
    'silent-pocket-watch':['Silent Pocket Watch','Not a Second Late. You have Advantage on Initiative rolls.'],
    'bell-last-guardian':['Bell of the Last Guardian',`The relic has 2 charges, all recovered on a Long Rest.

Ominous Chime. Use a Bonus Action and spend 1 charge. Until the start of your next turn, other creatures within 15 ft. that can hear the bell cannot take Reactions.`],
    'ruby-eyed-heron':['Ruby-Eyed Heron',`Requires Treasure Hunter level 6. The relic has 2 charges, all recovered on a Long Rest.

Ominous Ringing. Use a Bonus Action and spend 1 charge. Choose Aberration, Beast, Celestial, Elemental, Fey, Fiend, Monstrosity or Undead, then choose Dangerous Attraction or Unnatural Repulsion.

For up to 1 minute with Concentration, the heron produces quiet ominous ringing audible within 30 ft. Activating it again ends the earlier effect.

When a creature of the chosen type that can hear the ringing starts its turn within 30 ft. of the relic, it makes a Wisdom saving throw against your Relic DC. On a failure, it immediately moves up to 10 ft. by the shortest available route toward the relic (Attraction) or away from it (Repulsion).

This counts against that turn's movement and does not provoke Opportunity Attacks. Movement stops early if it cannot move closer or farther as required. The relic does not reveal affected creatures' locations.`],
    'talisman-mute-monk':['Talisman of the Mute Monk',`Requires Treasure Hunter level 6. The relic has 2 charges, all recovered on a Long Rest.

Sacred Silence. Use a Magic action and spend 1 charge to choose a point within 60 ft. For up to 1 minute with Concentration, a 20-ft.-radius Sphere of silence surrounds that point. Sound cannot be created inside or pass through it, and Verbal components cannot be used there. You are Deafened while the effect lasts.`],
    'jade-key':['Jade Key',`Requires Treasure Hunter level 6. The relic has 2 charges, all recovered on a Long Rest.

Nothing Stays Locked. Use a Magic action, spend 1 charge and touch a door, gate, window or closed container to open one nonmagical lock. A magical lock costs 2 charges and requires an Intelligence (Arcana) check against the effect's Save DC; a success suppresses it for 1 hour. This does not remove a bar or any other physical obstruction that is not a lock.`],
    'lantern-true-flame':['Lantern of True Flame',`Requires Treasure Hunter level 6. The relic has 1 charge, recovered on a Long Rest.

Light of Truth. Use a Magic action and spend the charge to light the lantern for 10 minutes. It sheds Bright Light for 15 ft. and Dim Light for a further 15 ft. While in its Bright Light, you cannot knowingly tell a lie.

When another creature first enters the Bright Light on a turn or starts its turn there, it makes a Charisma saving throw against your Relic DC. On a failure, it cannot knowingly lie while remaining in the light. It knows it is affected and can answer evasively. On a success, it is immune to that activation.`],
    'jailers-chain':["Jailer's Chain",`Requires Treasure Hunter level 6. The relic has 2 charges, all recovered on a Long Rest.

Lockless Shackles. When you hit a creature with a weapon attack, spend 1 charge to reduce its Speed by 10 ft. until the start of your next turn. A Large or smaller target also makes a Strength saving throw against your Relic DC or is Restrained until the start of your next turn.`],
    'censer-ashen-dragon':['Censer of the Ashen Dragon',`Requires Treasure Hunter level 6. The relic has 3 charges, all recovered on a Long Rest.

Scorching Breath. Use a Magic action and spend 1 charge to release heat in a 15-ft. Cone. Each creature in the area makes a Dexterity saving throw against your Relic DC, taking 3 Cool dice of Fire damage on a failure or half on a success. Flammable objects in the area that are not worn or carried ignite.`],
    'amulet-twisted-fate':['Amulet of Twisted Fate',`Requires Treasure Hunter level 6. The relic has 3 charges, all recovered on a Long Rest.

Ill Omen. Once on each of your turns when you hit a creature with a weapon attack, spend 1 charge to curse it until the start of your next turn. Subtract 1 Cool die from the first attack roll it makes before then, ending the curse. While cursed this way, it cannot regain HP.`],
    'ring-feathered-serpent':['Ring of the Feathered Serpent',`Requires Treasure Hunter level 6. The relic has 1 charge, recovered on a Long Rest.

Ascent. Use a Magic action, spend the charge, turn the ring inward toward your palm and choose a point within 25 ft. For 1 minute with Concentration, gravity stops within 20 ft. of that point. All creatures, including you, in the area or entering it for the first time begin to levitate. This movement does not provoke Opportunity Attacks.

At the end of each turn, a Tiny or Small creature rises 15 ft.; a Medium or Large creature rises 10 ft.; a Huge or larger creature rises 5 ft. It cannot rise above 60 ft. A levitating creature cannot move horizontally without something within reach to push against. A creature with a Fly Speed can move in any direction.

At the start of its turn, a levitating creature may make a Charisma saving throw against your Relic DC. On a success, the effect ends for it; it falls, taking 1d6 Bludgeoning damage per 10 ft., and becomes Prone. That activation can no longer affect it.`],
    'obsidian-tablet':['Obsidian Tablet',`Requires Treasure Hunter level 6. The relic has 3 charges, all recovered on a Long Rest.

Curses in Stone. Three curses are inscribed in an ancient language. Use a Magic action, spend 1 charge, read one aloud and choose a creature you can see within 30 ft. You cannot use the same curse again until a Long Rest.

Fatigue. The target makes a Charisma saving throw against your Relic DC. On a failure, it is cursed for up to 1 minute with Concentration: its Speed is halved, it cannot take Reactions, and on its turn it can take an Action or Bonus Action, not both. It repeats the save at the end of each turn. A success on the initial save instead reduces its Speed by 10 ft. until the start of your next turn.

Infernal Misfortune. The target makes a Charisma saving throw against your Relic DC. A failure gives Disadvantage on all attack rolls for up to 1 minute with Concentration, repeating the save at the end of each turn. A success gives Disadvantage only on its first attack roll before the start of your next turn.

Touch of Death. The target makes a Charisma saving throw against your Relic DC. On a failure, it takes 5d6 Necrotic damage and its maximum HP decreases by the same amount until its Long Rest ends. A success halves the damage and prevents the maximum-HP reduction. Removing the curse ends one ongoing curse from this relic or removes its maximum-HP reduction, but does not restore lost HP.`],
    'helm-defeated-warlord':['Helm of the Defeated Warlord',`Requires Treasure Hunter level 10. Use this relic once per Long Rest.

Aura of Defeat. Use an Action to put on and activate the helm. A 15-ft.-radius aura surrounds you for up to 1 minute with Concentration.

When an enemy first enters the aura on a turn or starts its turn there, it makes a Wisdom saving throw against your Relic DC or is Frightened until the start of its next turn. Your Speed decreases by 10 ft. while the effect lasts.`],
    'thunderbird-statuette':['Thunderbird Statuette',`Requires Treasure Hunter level 10. A large blue gem in the statuette's chest concentrates the power of storm clouds. The relic has 2 charges, all recovered on a Long Rest.

Thunder. Use an Action and spend 1 charge to choose a point on the ground within 60 ft. A sudden burst of heat expands the air into a loud pressure wave. Each creature within 5 ft. of the point makes a Dexterity saving throw against your Relic DC. A failure deals 5d8 Thunder damage and knocks it Prone; a success halves the damage and prevents Prone. The thunder is audible within 300 ft.`],
    'sun-disk':['Sun Disk',`Requires Treasure Hunter level 10. Use this relic once per Long Rest.

Scorching Dawn. Use a Magic action to release light in a 30-ft. Cone. Creatures in the area make a Dexterity saving throw against your Relic DC. On a failure, take 4 Cool dice of Radiant damage and become Blinded until the start of your next turn. A success halves the damage and prevents Blinded.`],
    'candle-stilled-shadows':['Candle of Stilled Shadows',`Requires Treasure Hunter level 10. The relic has 2 charges, all recovered on a Long Rest.

Stilled Shadows. Use a Magic action and spend 1 charge to choose a point within 60 ft. For up to 1 minute with Concentration, the area within 10 ft. is Difficult Terrain. A creature starting its turn there makes a Dexterity saving throw against your Relic DC or is Restrained until the start of your next turn.`],
    'nail-black-coffin':['Nail from the Black Coffin',`Requires Treasure Hunter level 10.

Wound the Soul. Once on each of your turns when you hit a creature with a melee weapon attack, deal an extra 1d6 Necrotic or Psychic damage, your choice.`],
    'cloak-pilgrim-worlds':['Cloak of the World-Wandering Pilgrim',`Requires Treasure Hunter level 10.

Shifting Protection. Whenever you finish a Long Rest, choose Acid, Cold, Fire, Lightning, Necrotic, Poison, Psychic or Thunder damage. Gain Resistance to that type until you choose again.`],
    'idol-aztec-serpent-god':['Idol of the Aztec Serpent God',`Requires Treasure Hunter level 13. Use this relic once per Long Rest.

Spectral Grip. Use a Magic action to choose a Large or smaller creature you can see within 60 ft. Its Speed becomes 0 until the start of your next turn. It also makes a Strength saving throw against your Relic DC. On a failure, it is Paralyzed for up to 1 minute with Concentration, repeating the save at the end of each of its turns to end the effect on a success.`],
    'book-unwritten-paths':['Book of Unwritten Paths',`Requires Treasure Hunter level 13. Use this relic once per Long Rest.

Paths That Never Were. Use a Magic action to choose up to your Intelligence modifier in creatures within 30 ft., minimum one. Move each to an unoccupied space you can see within 60 ft.

Willing creatures are moved automatically. An unwilling Large or smaller creature makes a Charisma saving throw against your Relic DC and is not moved on a success. After activation, your Speed is 0 until the end of the turn.`],
    'horn-empty-tomb':['Horn of the Empty Tomb',`Requires Treasure Hunter level 13. Use this relic once per Long Rest.

Voice of the Tomb. Use a Magic action to sound the horn in a 30-ft. Cone. Each creature in the area that can hear it makes a Wisdom saving throw against your Relic DC. On a failure, it takes 5 Cool dice of Psychic damage and is Frightened for up to 1 minute with Concentration. A success halves the damage and prevents Frightened. An affected creature repeats the save at the end of each turn, ending the effect on a success. You are Deafened while maintaining Concentration.`],
    'blood-dagger':['Blood Dagger',`Requires Treasure Hunter level 13.

Feeds on Misfortune. Once on each of your turns when you deal damage to a Bloodied creature, gain Temporary HP equal to your Proficiency Bonus.`],
    'eye-dead-seer':['Eye of the Dead Seer',`Requires Treasure Hunter level 18.

Beyond the Veil. Gain Truesight 30 ft.`],
    'atlas-nonexistent-road':['Atlas of the Nonexistent Road',`Requires Treasure Hunter level 18. Use this relic once per Long Rest.

Escape the Map. Use a Magic action to choose yourself and up to your Intelligence modifier in willing creatures within 30 ft., minimum one. Teleport all targets to a place on the same plane that you have personally visited within 100 miles. Each appears in the nearest suitable unoccupied space.`],
    'last-exorcists-testament':["Last Exorcist's Testament",`Requires Treasure Hunter level 18.

Sealed Soul. You are immune to Charmed and Frightened. Once per Long Rest, when a curse would affect you, make it have no effect. For a unique story curse, the DM may instead suppress its effect until the end of your next Long Rest.`],
    'heart-eclipse':['Heart of the Eclipse',`Requires Treasure Hunter level 18. The relic has 1 charge, recovered on a Long Rest.

Black Sun. Use a Magic action and spend the charge to choose a point within 120 ft. For up to 1 minute with Concentration, a 30-ft.-radius Sphere of magical Darkness surrounds it. You and up to your Intelligence modifier in chosen creatures, minimum one, can see through it. Other creatures inside have halved Speed and cannot take Reactions. A creature starting its turn inside makes a Wisdom saving throw against your Relic DC or takes 4 Cool dice of Psychic damage.`],
    'coffer-final-judgment':['Coffer of Final Judgment',`Requires Treasure Hunter level 18. This gilded coffer holds power no mortal should witness. When the lid opens, there is only one sensible instruction: close your eyes. The relic has 1 charge, recovered on a Long Rest.

Do Not Look. Use an Action and spend the charge to open it. Every creature within 30 ft. with direct sight of it, including you, makes a Dexterity saving throw against your Relic DC to close its eyes or look away.

On a success, avoid its sight but become Blinded until the start of your next turn. On a failure, take 10d8 Radiant damage and become Stunned until the start of your next turn. A creature already Blinded or unable to see the coffer is unaffected.`]
  };
  for(const record of window.TreasureHunterRelicsV7s || [])E.register(record,relics[record.id]);
  E.relics=relics;
})();
