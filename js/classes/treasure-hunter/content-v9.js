(function () {
  'use strict';
  const T = window.TreasureHunterDataV7s;
  const relics = window.TreasureHunterRelicsV7s || [];
  if (!T) return;

  const featureNames = {
    'ancient-languages': 'Starodávné jazyky',
    'specialized-expertise': 'Odborná expertíza',
    'conversational-tourist': 'Komunikativní turista',
    'cool-die': 'Cool Die',
    'weapon-mastery': 'Weapon Mastery',
    'indy-get-up': 'Indyho zvedačka',
    'cool-points': 'Treasure hunterův cool',
    'line-attack': 'Útok v lajně',
    'treasure-hunter-subclass': 'Treasure Hunter Subclass',
    'rope-snare': 'Zachycení lanem',
    'initial-collection': 'První sbírka',
    'prepared-relics-reserve': 'Připravené relikvie a zásoba',
    'expert-identification': 'Odborné určení',
    'know-not-to-touch': 'Vím, kam nesahat',
    'asi-4': 'Ability Score Improvement',
    'extra-attack': 'Extra Attack',
    'another-piece-collection': 'Jiný kousek ze sbírky',
    evasion: 'Evasion',
    'improved-slide': 'Zdokonalený skluz',
    'asi-8': 'Ability Score Improvement',
    'improved-attack-slide': 'Zdokonalený útočný skluz',
    'asi-12': 'Ability Score Improvement',
    'improved-narrow-escape': 'Vylepšený Únik o vlásek',
    'asi-16': 'Ability Score Improvement',
    'superior-daring': 'Zdokonalený odvážný zásah',
    'find-a-way': 'Nějak se z toho dostanu',
    'epic-boon': 'Epic Boon',
    'at-right-moment': 'V pravý okamžik'
  };
  const relicNames = {
    'master-thiefs-key': 'Klíč pána zlodějů',
    'travelers-talisman': 'Cestovatelský talisman',
    'gravity-idol': 'Gravitační modla',
    'thunder-idol': 'Hromový idol',
    'cat-idol': 'Kočičí modla',
    'healing-amulet': 'Léčitelský amulet',
    'lucky-coin': 'Mince štěstí',
    'occult-lens': 'Okultní čočka',
    'protective-scarab': 'Ochranný skarabeus',
    'guardians-signet-ring': 'Pečetní prsten strážce',
    'ashes-unseen-procession': 'Popel neviděného průvodu',
    'ancient-mariners-compass': 'Starobylý námořní kompas',
    'silent-pocket-watch': 'Tiché kapesní hodinky',
    'bell-last-guardian': 'Zvonek posledního strážce',
    'ruby-eyed-heron': 'Volavka s rubínovým zrakem',
    'talisman-mute-monk': 'Talisman němého mnicha',
    'jade-key': 'Nefritový klíč',
    'lantern-true-flame': 'Lucerna pravdivého plamene',
    'jailers-chain': 'Řetěz žalářníka',
    'censer-ashen-dragon': 'Kadidelnice popelavého draka',
    'amulet-twisted-fate': 'Amulet křivého osudu',
    'ring-feathered-serpent': 'Prsten Opeřeného hada',
    'obsidian-tablet': 'Obsidiánová deska',
    'helm-defeated-warlord': 'Přilba poraženého vojevůdce',
    'thunderbird-statuette': 'Soška hromového ptáka',
    'sun-disk': 'Sluneční disk',
    'candle-stilled-shadows': 'Svíce ztuhlých stínů',
    'nail-black-coffin': 'Hřebík z černé rakve',
    'cloak-pilgrim-worlds': 'Plášť poutníka mezi světy',
    'idol-aztec-serpent-god': 'Idol Aztéckého hadího boha',
    'book-unwritten-paths': 'Kniha nepopsaných cest',
    'horn-empty-tomb': 'Roh prázdné hrobky',
    'blood-dagger': 'Krvavá dýka',
    'eye-dead-seer': 'Oko mrtvého věštce',
    'atlas-nonexistent-road': 'Atlas neexistující cesty',
    'last-exorcists-testament': 'Závěť posledního exorcisty',
    'heart-eclipse': 'Srdce zatmění',
    'coffer-final-judgment': 'Schrána posledního soudu'
  };
  const parentIds = {
    'ancient-languages': 'adventurer-through-and-through',
    'drivers-license': 'adventurer-through-and-through',
    'specialized-expertise': 'adventurer-through-and-through',
    'conversational-tourist': 'adventurer-through-and-through',
    'born-stunt-performer': 'adventurer-through-and-through',
    'cool-die': 'adventurer-through-and-through',
    'object-manipulation': 'whip-master',
    swing: 'whip-master',
    towing: 'swing',
    'indy-slide': 'indy-maneuvers',
    'indy-get-up': 'indy-maneuvers',
    'narrow-escape': 'cool-points',
    'snatch-item': 'cool-points',
    'attack-slide': 'indy-slide',
    'precision-slide': 'attack-slide',
    'line-attack': 'attack-slide',
    'rope-snare': 'adventurers-rope',
    'rope-pull': 'adventurers-rope',
    'rope-takedown': 'adventurers-rope',
    'quick-rope': 'adventurers-rope',
    'initial-collection': 'curiosity-collection',
    'prepared-relics-reserve': 'curiosity-collection',
    'bag-full-secrets': 'prepared-relics-reserve',
    'preparing-relics': 'prepared-relics-reserve',
    'handling-relics': 'prepared-relics-reserve',
    'using-relics': 'prepared-relics-reserve',
    'magical-bond': 'prepared-relics-reserve',
    'bags-protection': 'prepared-relics-reserve',
    'expert-identification': 'curiosity-collection',
    'know-not-to-touch': 'curiosity-collection',
    'another-piece-collection': 'relic-connoisseur',
    'intelligent-use': 'relic-connoisseur',
    'familiar-premonition': 'relic-connoisseur',
    'forced-awakening': 'master-relics',
    'improved-narrow-escape': 'against-all-odds',
    'second-wind': 'against-all-odds',
    'always-on-guard': 'unstoppable-adventurer',
    'find-a-way': 'unstoppable-adventurer',
    'at-right-moment': 'wealth-and-glory',
    'free-trick': 'wealth-and-glory'
  };
  const umbrella = [
    { id: 'adventurer-through-and-through', level: 1, name: 'Dobrodruh každým coulem', fullText: 'Roky strávené v archivech, ruinách a zemích, kde neumíš ani objednat pití, tě naučily následující dovednosti.' },
    { id: 'indy-maneuvers', level: 1, name: 'Indyho manévry', fullText: 'Tvůj filmový způsob pohybu zahrnuje Indyho skluz a Indyho zvedačku.' },
    { id: 'curiosity-collection', level: 3, name: 'Sbírka kuriozit', fullText: 'Okultní sběratel shromažďuje podivné nástroje, prokleté památky a předměty, jejichž skutečný účel možná nepochopili ani původní majitelé.', kind: 'subclass' },
    { id: 'against-all-odds', level: 15, name: 'Proti všem vyhlídkám', fullText: 'Dobrodružství tě naučila pokračovat i ve chvíli, kdy by rozumný člověk utekl.' },
    { id: 'unstoppable-adventurer', level: 18, name: 'Nezastavitelný dobrodruh', fullText: 'Na vrcholu své kariéry zůstáváš ve střehu a dokážeš uniknout i z bezvýchodné situace.' },
    { id: 'wealth-and-glory', level: 20, name: 'Bohatství a Sláva', fullText: 'Stal ses legendou, jejíž přežití odporuje pravděpodobnosti.' }
  ].map(feature => ({
    action: 'Passive', cost: 0, kind: 'class', summary: feature.fullText, ...feature
  }));

  for (const feature of T.features) {
    if (featureNames[feature.id]) feature.name = featureNames[feature.id];
    if (parentIds[feature.id]) feature.parentId = parentIds[feature.id];
    if (feature.id === 'towing') feature.kind = 'subaction';
  }
  for (const feature of umbrella) if (!T.features.some(current => current.id === feature.id)) T.features.push(feature);
  for (const relic of relics) if (relicNames[relic.id]) relic.name = relicNames[relic.id];
  if (T.choiceDefinitions?.['ancient-languages']?.[0]) T.choiceDefinitions['ancient-languages'][0].label = 'Starodávné jazyky';

  T.contentVersion = 'Treasure Hunter v8 final DOCX';
  T.featureParentIds = parentIds;
})();
