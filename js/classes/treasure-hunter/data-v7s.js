(function(){
  const F=(id,level,name,summary,opts={})=>({id,level,name,summary,action:'Passive',cost:0,kind:'class',...opts});
  const A=(id,name,action,summary,cost=0)=>({id,name,action,summary,cost});

  const features=[
    F('whip-master',1,'Mistr biče','Bič je pro tebe zbraň i dobrodružný nástroj. Jeho kostka zranění je d6 a pomocí biče můžeš manipulovat s předměty nebo se zachytit prostředí.',{actions:[
      A('whip-object','Přitažení předmětu','Special','Místo útoku bičem můžeš přitáhnout nepřipevněný drobný předmět do 15 ft.'),
      A('whip-swing','Zhoupnutí','Bonus Action','Zachytíš vhodný pevný objekt bičem nebo lanem do 15 ft a bezpečně se zhoupneš až do dvojnásobku vzdálenosti k objektu bez spotřeby Rychlosti.'),
      A('whip-tow','Tažení','Reaction','Zachytíš vhodný pohybující se objekt a necháš se jím táhnout. Toto použití se počítá jako tvůj Indyho skluz pro dané kolo.')
    ]}),
    F('weapon-mastery',1,'Mistrovství zbraní','Vyber dvě zbraně, se kterými jsi zdatný. Můžeš používat jejich vlastnosti Mistrovství; jednu volbu můžeš změnit po dlouhém odpočinku.'),
    F('indy-maneuvers',1,'Indyho manévry','Pohybové triky, které definují styl lovce pokladů.',{actions:[
      A('indy-slide','Indyho skluz','Bonus Action','Jednou za kolo se pohneš až 15 ft v přímé linii bez spotřeby Rychlosti. Příležitostné útoky proti tobě mají Nevýhodu a po skluzu jsi na zemi.'),
      A('indy-get-up','Rychlé vstání','Bonus Action','Když jsi na zemi, můžeš jako bonusovou akci vstát bez spotřeby Rychlosti.')
    ]}),
    F('adventurer-through-and-through',1,'Dobrodruh každým coulem','Znáš tři starověké jazyky, získáš zdatnost se dvěma typy dopravních prostředků, jednu Odbornost mezi svými zdatnými dovednostmi a při skocích, šplhání a rovnováze se můžeš opírat o Obratnost.'),

    F('treasure-hunter-cool',2,'Nadhled lovce pokladů','Od 2. úrovně máš body coolu. Jejich počet se řídí úrovní lovce pokladů a všechny se obnoví po krátkém nebo dlouhém odpočinku.',{actions:[
      A('narrow-escape','Únik o vlásek','Reaction','Když tě zasáhne hod na útok, před vyhodnocením zranění utratíš 1 bod coolu. Získáš dočasné životy = Kostka coolu + úroveň + bonus zdatnosti a po útoku se můžeš pohnout 5 ft bez vyvolání příležitostných útoků.',1),
      A('snatch-item','Vytržení předmětu','Special','Po zásahu bičem můžeš utratit 1 bod coolu. Cíl hází záchranný hod na Sílu proti DC biče; při neúspěchu mu vytrhneš držený předmět.',1)
    ]}),
    F('attack-slide',2,'Útočný skluz','Během Indyho skluzu můžeš přerušit pohyb útoky z akce Útok. Při zahájení skluzu můžeš utratit 1 bod coolu a zvolit jeden z následujících triků.',{cost:1,action:'Special',actions:[
      A('precision-slide','Přesný skluz','Special','Jeden útok během skluzu má Výhodu; při zásahu přidáš jednu Kostku coolu ke zranění a cíl proti tobě do konce kola nemůže provádět příležitostné útoky.',1),
      A('line-attack','Útok v linii','Special','Jeden útok můžeš nahradit sérií samostatných útoků zblízka proti více různým cílům, přes které během skluzu projíždíš.',1)
    ]}),
    F('when-going-tough',2,'Když jde do tuhého','Když házíš iniciativu, můžeš obnovit všechny body coolu a vyléčit se o jednu Kostku coolu.',{action:'Special',uses:1,recovery:'LR'}),

    F('subclass',3,'Archetyp lovce pokladů','Na 3. úrovni získáš archetyp lovce pokladů. V7s je nyní zaměřený na Okultního sběratele.',{kind:'subclass'}),
    F('curio-collection',3,'Sbírka kuriozit','Okultní sběratel získá první relikvie a rozdělí je na připravené a záložní.',{kind:'subclass'}),
    F('relic-expert',3,'Znalec relikvií','Umíš bezpečněji zacházet s okultními relikviemi, připravovat je po dlouhém odpočinku a používat jejich vlastnosti.',{kind:'subclass'}),
    F('adventurers-rope',3,'Dobrodružné lano','Lano můžeš používat k zachycení, přitahování a srážení nepřátel. DC lana = 8 + bonus zdatnosti + Obratnost.',{actions:[
      A('rope-snare','Laso','Special','Při akci Útok můžeš nahradit jeden útok hodem lasa na Velkého nebo menšího tvora do 15 ft. Cíl hází záchranný hod na Obratnost proti DC lana; při neúspěchu je chycený.'),
      A('rope-pull','Přitažení lanem','Free','Jednou za svůj tah můžeš bez akce přitáhnout tvora chyceného lanem až o 10 ft, nebo se k většímu cíli přitáhnout ty.'),
      A('rope-takedown','Stržení lanem','Special','Nahradíš jeden útok pokusem strhnout tvora zachyceného lanem. Cíl hází záchranný hod na Sílu proti DC lana; při neúspěchu skončí na zemi.'),
      A('quick-rope','Pohotové lano','Reaction','Když Velký nebo menší tvor do 15 ft opouští dosah běžným pohybem, můžeš ho zkusit zachytit lanem a ukončit jeho pohyb.')
    ]}),

    F('asi-4',4,'Zvýšení hodnot vlastností','Získáš feat Zvýšení hodnot vlastností nebo jiný feat, pro který splňuješ podmínky.'),
    F('catch-a-fall',4,'Zachycení pádu','Když ty nebo tvor do 15 ft začne padat, můžeš se pokusit pád zastavit rukou, bičem nebo lanem. Při chytání jiného tvora utratíš 1 bod coolu.',{action:'Reaction',cost:1}),
    F('extra-attack',5,'Útok navíc','Při akci Útok útočíš dvakrát místo jednou. Jednotlivé útoky můžeš nahrazovat triky s bičem nebo lanem.',{action:'Action'}),
    F('relic-arsenal',6,'Arzenál relikvií','Okultní sběratel rozšíří svou sbírku a může mít více připravených a záložních relikvií.',{kind:'subclass'}),
    F('eye-for-traps',6,'Oko na pasti','Na ověření k nalezení, rozpoznání nebo deaktivaci pasti a záchranné hody proti jejím efektům můžeš přidat modifikátor Inteligence, pokud už není součástí hodu.'),
    F('seasoned-traveler',7,'Zkušený cestovatel','Získáš Rychlost šplhání a plavání rovnou své Rychlosti.'),
    F('asi-8',8,'Zvýšení hodnot vlastností','Získáš feat Zvýšení hodnot vlastností nebo jiný feat, pro který splňuješ podmínky.'),
    F('evasion',9,'Úhyb','U efektů se záchranným hodem na Obratnost, které při úspěchu půlí zranění, při úspěchu neutrpíš žádné zranění a při neúspěchu jen polovinu, pokud nejsi Vyřazený.'),
    F('improved-slide',9,'Zdokonalený skluz','Indyho skluz se prodlouží na 20 ft a postavení po skluzu v témže tahu stojí jen 10 ft Rychlosti, pokud je to výhodnější.'),
    F('daring-strike',9,'Odvážný zásah','Jednou za tah při zásahu útokem zbraní přidáš 1 Kostku coolu ke zranění, pokud splníš pohybovou nebo poziční podmínku.'),
    F('conserving-charges',10,'Šetření nábojů','Když aktivace magického předmětu nebo relikvie spotřebuje náboj, hoď d6; na 6 se náboj nespotřebuje.',{kind:'subclass'}),
    F('not-dead-yet',11,'Ještě nejsem mrtvý','Když bys klesl na 0 životů bez okamžité smrti, místo toho zůstaneš na 1 životě a můžeš se pohnout až 10 ft bez vyvolání příležitostných útoků.',{action:'Special',uses:1,recovery:'SR'}),
    F('asi-12',12,'Zvýšení hodnot vlastností','Získáš feat Zvýšení hodnot vlastností nebo jiný feat, pro který splňuješ podmínky.'),
    F('improved-attack-slide',12,'Zdokonalený útočný skluz','Útočný skluz je účinnější: Útok v linii může pro další zásahy použít Kostku coolu místo kostky zranění zbraně, pokud je to výhodnější, a po skluzu se můžeš jednou za tah okamžitě postavit.'),
    F('not-a-chance',12,'Ani náhodou','Když neuspěješ v záchranném hodu, můžeš utratit 1 bod coolu, hodit Kostku coolu a přičíst výsledek k záchrannému hodu. Pro jeden hod jen jednou.',{action:'Special',cost:1}),
    F('improved-daring',13,'Vylepšený odvážný zásah','Odvážný zásah přidává dvě Kostky coolu místo jedné.'),
    F('master-relics',14,'Mistr relikvií','Okultní sběratel dosáhne nejvyšší běžné kapacity sbírky a získá přístup k nejnebezpečnějším relikviím.',{kind:'subclass'}),
    F('against-all-odds',15,'Proti všem vyhlídkám','Tvoje schopnost přežít nemožné situace se zlepšuje. Únik o vlásek používá dvě Kostky coolu pro dočasné životy a jeho následný pohyb může být až polovina Rychlosti.',{actions:[A('second-wind','Druhý dech','Special','Na začátku tahu při 0 životech můžeš utratit 2 body coolu, získat životy = 2 Kostky coolu + úroveň lovce pokladů a okamžitě se postavit.',2)]}),
    F('asi-16',16,'Zvýšení hodnot vlastností','Získáš feat Zvýšení hodnot vlastností nebo jiný feat, pro který splňuješ podmínky.'),
    F('legendary-slide',16,'Legendární skluz','Indyho skluz má maximum 30 ft a jednou můžeš změnit směr až o 90°. Za 2 body coolu může Útočný skluz použít Přesný skluz i Útok v linii současně.',{action:'Special',cost:2}),
    F('superior-daring',17,'Zdokonalený odvážný zásah','Odvážný zásah přidává tři Kostky coolu.'),
    F('unstoppable-adventurer',18,'Nezastavitelný dobrodruh','Dokud nejsi Vyřazený, žádný hod na útok proti tobě nemůže mít Výhodu. Na začátku tahu můžeš za 1 bod coolu ukončit chycení nebo omezení na sobě a pohnout se 10 ft bez vyvolání příležitostných útoků.',{actions:[A('find-a-way','Vždycky se najde cesta','Free','Na začátku tahu ukončíš chycení nebo omezení na sobě a pohneš se 10 ft bez vyvolání příležitostných útoků.',1)]}),
    F('epic-boon',19,'Epický dar','Získáš feat Epický dar nebo jiný feat, pro který splňuješ podmínky.'),
    F('wealth-and-glory',20,'Bohatství a Sláva','Na vrcholu kariéry využíváš příležitosti rychleji než kdokoli jiný a první trik v každém tvém tahu, který by stál 1 bod coolu, stojí 0.',{actions:[A('right-moment','Ve správný okamžik','Free','Jednou za kolo, když nepřátelský tvor do 15 ft skončí na zemi nebo je chycený, mine útokem nebo je zasažen kritickým zásahem, můžeš proti němu okamžitě provést jeden útok zbraní bez spotřeby reakce.')]})
  ];

  const progression={pb:l=>2+Math.floor((Math.max(1,l)-1)/4),coolTotal:l=>Math.max(1,l)>=2?Math.max(1,l):0,coolDie:l=>l>=16?'d12':l>=10?'d10':l>=5?'d8':'d6',slideDistance:l=>l>=16?30:l>=9?20:15,relicLimit(l){if(l>=14)return[5,5,10];if(l>=10)return[4,4,8];if(l>=6)return[3,3,6];if(l>=3)return[2,2,4];return[0,0,0];},hpMax(l,conMod){l=Math.max(1,Number(l)||1);return Math.max(1,10+conMod+(l-1)*Math.max(1,6+conMod));}};
  window.TreasureHunterDataV7s={features,saves:['DEX','INT'],armor:['Lehká zbroj'],tools:['Zlodějské náčiní','Navigátorské náčiní'],weapons:['Jednoduché zbraně','Bojové zbraně na dálku','Bojové obratné zbraně','Bič','Palné zbraně'],skills:['Acrobatics','Arcana','Athletics','Deception','History','Insight','Investigation','Nature','Perception','Persuasion','Religion','Sleight of Hand','Stealth','Survival'],ancientLanguages:['Latina','Starý keltský jazyk','Starý germánský jazyk','Stará řečtina','Egyptština','Hebrejština','Arabština','Perština','Akkadština','Sanskrit','Mandarínština','Nahuatl','Mayské jazyky','Kečuánština'],...progression};
})();