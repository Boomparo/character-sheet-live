(function(){
  const R=(id,name,level,summary,action='Passive',charges=0,recovery='LR',extra={})=>({id,name,level,summary,action,charges,recovery,...extra});
  window.TreasureHunterRelicsV7s=[
    R('master-thiefs-key','Klíče pána zlodějů',3,'Nahrazují Zlodějské náčiní. Na ověření spojená se zámky a pastmi máš Výhodu; po neúspěchu můžeš omezeně přidat Kostku coolu.','Special',0,'LR',{uses:'PB'}),
    R('travelers-talisman','Cestovatelský talisman',3,'Tvá Rychlost se zvýší o 5 ft a nemagický obtížný terén tě nestojí další pohyb.','Passive',0,'LR',{bonusSpeed:5}),
    R('gravity-idol','Modla gravitace',3,'Vytvoří oblast změněné gravitace, která je obtížným terénem a může přitahovat tvory ke středu.','Action',1),
    R('thunder-idol','Hromová modla',3,'Po zásahu zbraní můžeš spotřebovat náboj, přidat 1 Kostku coolu hromového zranění a odtlačit Velký nebo menší cíl.','Special',3),
    R('cat-idol','Kočičí modla',3,'Rozšíří temnovid o 30 ft, umožní vidět v magické tmě do 30 ft a dává Výhodu na rovnováhu a záchranné hody proti pádu na zem.','Passive',0,'LR',{darkvision:30}),
    R('healing-amulet','Léčivý amulet',3,'Léčivá relikvie s počtem použití rovným bonusu zdatnosti. Použití se obnoví po dlouhém odpočinku.','Action',0,'LR',{uses:'PB'}),
    R('lucky-coin','Mince štěstěny',3,'Pomáhá s ověřeními vlastností; má tři náboje a obnoví je po dlouhém odpočinku.','Special',3),
    R('occult-lens','Okultní čočka',3,'Pomáhá odhalovat a zkoumat magii a okultní stopy.','Action'),
    R('protective-scarab','Ochranný skarabeus',3,'Po záchranném hodu můžeš před oznámením výsledku přidat Kostku coolu.','Special',1,'SR'),
    R('guardians-signet-ring','Pečetní prsten strážce',3,'Po zásahu můžeš reakcí zvýšit Obranné číslo o 1d6 do začátku dalšího tahu a případně změnit zásah na minutí.','Reaction',1,'SR'),
    R('ashes-unseen-procession','Popel neviditelného průvodu',3,'Vytvoří na krátkou dobu silně zastřenou oblast o poloměru 10 ft.','Bonus Action',2),
    R('ancient-mariners-compass','Kompas dávného mořeplavce',3,'Vždy znáš sever a přibližnou výšku či hloubku. Pomáhá s navigací a jednou za dlouhý odpočinek ukáže cestu ke známému místu.','Passive',1),
    R('silent-pocket-watch','Tiché kapesní hodinky',3,'Na hody iniciativy máš Výhodu.','Passive'),
    R('bell-last-guardian','Zvonek posledního strážce',3,'Ostatní tvorové do 15 ft, kteří zvon slyší, nemohou do začátku tvého dalšího tahu používat reakce.','Bonus Action',2),

    R('ruby-eyed-heron','Volavka s rubínovýma očima',6,'Dokáže přitahovat nebo odpuzovat tvory.','Bonus Action',2),
    R('talisman-mute-monk','Talisman němého mnicha',6,'Vytvoří udržovanou oblast magického ticha.','Action',2),
    R('jade-key','Nefritový klíč',6,'Otevře nemagický zámek; za více nábojů může zkusit dočasně potlačit magický zámek.','Action',2),
    R('lantern-true-flame','Lucerna pravdivého plamene',6,'Na 10 minut vytvoří světlo, ve kterém tvorové po neúspěšném záchranném hodu na Charisma nemohou vědomě lhát.','Action',1),
    R('jailers-chain','Žalářníkovo pouto',6,'Po zásahu zbraní sníží Rychlost cíle; Velký nebo menší cíl může při neúspěšném záchranném hodu na Sílu získat omezení pohybu.','Special',2),
    R('censer-ashen-dragon','Kadidelnice popelavého draka',6,'Kužel 15 ft; záchranný hod na Obratnost proti DC relikvie. Při neúspěchu utrpí cíl ohnivé zranění rovné 3 Kostkám coolu, při úspěchu polovinu.','Action',3),
    R('amulet-twisted-fate','Amulet pokřiveného osudu',6,'Po zásahu zbraní prokleje cíl: jeho první hod na útok se sníží o Kostku coolu a dočasně nemůže získávat životy.','Special',3),
    R('ring-feathered-serpent','Prsten opeřeného hada',6,'Na jednu minutu vytvoří oblast potlačené gravitace a nechá tvory stoupat.','Action',1),
    R('obsidian-tablet','Obsidiánová destička',6,'Relikvie pro sesílání několika nebezpečných kleteb.','Action',3),

    R('helm-defeated-warlord','Přilba poraženého vojevůdce',10,'Aktivuje soustředěnou auru strachu; během ní se tvá Rychlost sníží.','Action',1),
    R('thunderbird-statuette','Soška hromového ptáka',10,'Zasáhne oblast do 60 ft silným hromovým výbojem; záchranný hod na Obratnost snižuje zranění a zabrání pádu na zem.','Action',2),
    R('sun-disk','Sluneční disk',10,'Vyšle kužel 30 ft zářivé energie; záchranný hod na Obratnost, při neúspěchu je cíl navíc krátce oslepen.','Action',1),
    R('candle-stilled-shadows','Svíce nehybných stínů',10,'Vytvoří soustředěný obtížný terén, ve kterém může neúspěšný záchranný hod na Obratnost výrazně omezit pohyb.','Action',2),
    R('nail-black-coffin','Hřebík z černé rakve',10,'Jednou za tah po zásahu zblízka přidáš 1d6 nekrotického nebo psychického zranění.','Passive'),
    R('cloak-pilgrim-worlds','Plášť poutníka mezi světy',10,'Po dlouhém odpočinku zvolíš jeden typ zranění z nabídky a získáš vůči němu Odolnost do další volby.','Passive',0,'LR',{choice:'damageResistance'}),

    R('idol-aztec-serpent-god','Modla aztéckého hadího boha',14,'Přízračný stisk může zastavit Velký nebo menší cíl a při neúspěšném záchranném hodu na Sílu jej při soustředění zcela znehybnit.','Action',1),
    R('book-unwritten-paths','Kniha nenapsaných cest',14,'Přesune skupinu tvorů do viditelných volných míst do 60 ft; nedobrovolný Velký nebo menší cíl má záchranný hod na Charisma.','Action',1),
    R('horn-empty-tomb','Roh prázdné hrobky',14,'Kužel 30 ft psychické energie; záchranný hod na Moudrost, při neúspěchu je cíl navíc při soustředění vystrašen.','Action',1),
    R('blood-dagger','Krvavá dýka',14,'Jednou za tah, když zraníš těžce zraněného tvora, získáš dočasné životy rovné bonusu zdatnosti.','Passive'),
    R('eye-dead-seer','Oko mrtvého věštce',14,'Získáš pravé vidění 30 ft.','Passive',0,'LR',{truesight:30}),
    R('atlas-nonexistent-road','Atlas neexistující cesty',14,'Teleportuje tebe a ochotné tvory do známého místa na stejné sféře ve velké vzdálenosti.','Action',1),
    R('last-exorcists-testament','Závěť posledního exorcisty',14,'Jsi imunní vůči okouzlení a vystrašení. Jednou za dlouhý odpočinek můžeš zabránit tomu, aby na tebe působila kletba.','Special',1),
    R('heart-eclipse','Srdce zatmění',14,'Vytvoří rozsáhlou magickou tmu. Vybraní tvorové v ní vidí, ostatní jsou výrazně omezeni a mohou utrpět psychické zranění.','Action',1),
    R('coffer-final-judgment','Schrána posledního soudu',14,'Tvorové v dosahu s přímým výhledem hází záchranný hod na Obratnost; neúspěch způsobí masivní zářivé zranění a omráčení, úspěch krátké oslepení.','Action',1)
  ];
})();