(function () {
  'use strict';
  const O = window.OccultistDataV10;
  if (!O) return;

  const FEATURE_TEXT = {
    'occult-spellcasting': `Jako spellcasting focus můžeš používat okultistické pomůcky. Umíš provádět rituály. Spotřebované spell sloty se obnoví po dokončení Long Restu.

Tvou spellcasting ability je Intelligence.
Spell Save DC = 8 + INT modifier + Proficiency Bonus.
Spell Attack modifier = INT modifier + Proficiency Bonus.

Počet spell slotů určuje tabulka Occultisty. Cantripy a levelované spelly, které znáš, získáváš z úrovní jednotlivých Okultních věd.`,
    'planetary-alignment': `Některé levelované spelly lze sesílat pouze za příznivého postavení planet. Každý den za rozbřesku si z leveled spellů, které znáš, připravíš kouzla dostupná do dalšího rozbřesku. Přípravu můžeš změnit bez ohledu na to, zda jsi dokončil Long Rest. Maximální počet připravených spellů určuje sloupec Postavení planet v tabulce Occultisty. Cantripy se nepřipravují.`,
    'occult-sciences': `Body poznání utrácíš za postupné úrovně Spiritismu, Astrologie, Kabaly, Esoteriky a Alchymie. Neutracené body se přenášejí mezi levely. Každou vyšší úroveň vědy lze získat pouze po předchozí úrovni a po dosažení požadovaného class levelu. Můžeš se úzce specializovat nebo rozdělit znalosti mezi více věd.`,
    'magical-energy': `Bonusovou akcí můžeš vlastní životní energií obnovit vyčerpaný spell slot nebo zaplatit upcast. Cena: 1st level 1d4 + 1 HP, 2nd level 1d6 + 2 HP, 3rd level 1d10 + 3 HP, 4th level 2d8 + 4 HP.

Při upcastu můžeš použít volný slot nebo zaplatit stejnou cenu HP. Smíš o jednu úroveň přesáhnout nejvyšší spell slot, ke kterému máš běžně přístup. Temp HP nelze použít ani ztratit. Pokud by zaplacení vyžadovalo Temp HP nebo tě snížilo na 0 HP, ztratíš Bonus Action, ale slot se neobnoví a Temp HP zůstávají.`,
    'mysticism-student': `Naučíš se jeden jazyk: hebrejštinu, egyptštinu, sanskrt nebo enochiánštinu. Získáš proficiency v Arcana, History, Insight, Medicine nebo Religion. Pokud už v této dovednosti proficiency máš, získáš místo ní expertise.`,
    'third-eye': `Jednou za Short Rest můžeš bez utracení spell slotu seslat Detect Evil and Good nebo Detect Aura.`,
    'stunning-trick': `Získáš homebrew cantrip Omračující trik. Provedeš ranged spell attack na bytost do 30 ft. Při zásahu způsobíš 1d6 + 1 Psychic damage. Pokud by cíl tímto cantripem klesl na 0 HP, okamžitě se vrátí na 1 HP, je Stable a Unconscious na 1d4 hodin nebo do dalšího doplnění HP. Damage se zvyšuje na 2d6 + 2 od 5. levelu a na 3d6 + 3 od 11. levelu.`,
    'chakra-tuning': `Jednou za den můžeš 30 minut ladit čakry. Musíš zůstat na místě a nesmíš vykonávat činnost vyžadující plnou pozornost. Přerušení znamená začít znovu. Aktivita může proběhnout během Short Restu. Po dokončení obnovíš tři vyčerpané 1st-level spell sloty.`,
    'magic-resistance': `Kdykoli jsi vystaven vlivu spellu a házíš Intelligence, Wisdom nebo Charisma saving throw, přičteš k hodu 1d4.`,
    'battle-mystic': `V rámci jedné Action můžeš seslat cantrip a provést jeden útok Simple Weapon.`,
    'hardy-mystic': `K Constitution saving throwu na udržení koncentrace přičítáš 1d4.`,
    'magic-block': `Získáš additional skill MagBlock. Je to Intelligence skill a máš v něm proficiency. Jednou za hodinu můžeš Action zkusit potlačit magický efekt do 15 ft. Házíš Intelligence (MagBlock) proti DC stanovenému DM podle síly magie. Při úspěchu je efekt potlačen na 12 sekund, tedy dvě kola.

Bonusovou akcí můžeš k MagBlock checku přidat 1d4. Tento bonus nelze kombinovat s Guidance.`,
    'sweet-oblivion': `Při získání 7. levelu můžeš zapomenout nejvyšší úrovně znalostí v jedné či více Okultních vědách o celkové hodnotě až 3 bodů poznání. Nižší úroveň nelze zapomenout a ponechat si vyšší. Uvolněné body můžeš ihned investovat do jiných věd.`,
    'life-transfer': `Jednou za Short Rest můžeš Action dotykem věnovat willing bytosti libovolné množství vlastních HP, nikoli Temp HP. Stejně můžeš přijmout přesně tolik HP, kolik ti willing bytost nabídne. Nelze překročit maximum HP.`,
    'greater-magic-resistance': `Bonus k Intelligence, Wisdom a Charisma saving throwům proti spellům se zvyšuje z 1d4 na 1d6.`,
    'energetic-parasitism': `Při použití Přelévání života můžeš odebrat HP i unwilling bytosti, které se dotýkáš. Tímto způsobem jí můžeš odebrat nejvýše polovinu jejích maximálních HP.`
  };

  const SPELL_TEXT = {
    'stunning-trick': `Vyber bytost do 30 ft. a proveď ranged spell attack. Při zásahu utrpí 1d6 + 1 Psychic damage. Pokud by tímto cantripem klesla na 0 HP, okamžitě se vrátí na 1 HP, je Stable a zůstane Unconscious 1d4 hodin nebo do dalšího doplnění HP.`,
    'detect-aura': `Po dobu 5 minut vycítíš do 30 ft. magické nebo prokleté předměty, efekty a bytosti. Magic Action může podrobněji prozkoumat jejich auru a odhalit školu magie.

Stejně vycítíš inteligentní bytosti s Intelligence alespoň 6. Magic Action odhalí barvu a intenzitu aury, která napovídá aktuální rozpoložení a povahové rysy. Vnímání bytostí blokuje kov a kámen.`,
    'kontakt': `Pokusíš se navázat kontakt se záhrobím a hodíš 1d12.

1–3: seance selhala.
4–5: slabý kontakt, nahodilé nebo neúplné informace.
6–8: silný kontakt s nevraživým duchem, který může pravdu překrucovat.
9–11: silný kontakt s dobře naladěným a nápomocným duchem.
12: čistý kontakt s přesně zamýšleným nebo nejvhodnějším duchem.

Na místě se zvýšeným výskytem duchů házíš s Advantage. Duch komunikuje pouze verbálně a ty rozhodneš, kdo jej slyší. Další seslání během 24 hodin používá postupně d10, d8, d6 a poté d4. Materiální komponenta: spiritistická tabulka, černá svíce nebo kyvadlo.`,
    'vyvolani-ducha': `Vyvoláš ducha konkrétní zemřelé osoby a položíš mu až tři otázky. Duch má původní osobnost a vědomosti, což ovlivňuje ochotu i pravdomluvnost.

Šance na úspěch podle ostatků: zachovalá mrtvola 90 %, rozložená mrtvola 75 %, kostra 60 %, důležitá část těla 40 %, nedůležitá část 20 %, bez ostatků 10 %. Silně spojený předmět může přidat až 10 %.

Na denním světle seslání automaticky selže. Opakované seslání během 24 hodin automaticky selže.`,
    'moudrost-predku': `Vyber jednu ability. Po dobu jedné hodiny přidáváš svůj spellcasting modifier ke všem ability checks a saving throws s touto ability. Současně získáš proficiency s jednou zbraní, jedním nástrojem nebo jedním dopravním prostředkem.`,
    'palm-reading': `Vyber osobu, které se můžeš dotknout. Cíl hází Strength nebo Dexterity saving throw podle své volby. Při neúspěchu mu rozevřeš ruku a prohlédneš dlaň; cíl může dobrovolně neuspět. Potom zjistíš jednu pravdivou skutečnost o jeho minulosti, přítomnosti nebo možné budoucnosti. Předpovězená budoucnost se může změnit, pokud někdo podnikne opatření, která jí zabrání. Při úspěšném save se nic nestane.`,
    'predurceni': `V rámci Action hoď 1d20 a výsledek si zaznamenej. Kdykoli potom vidíš bytost, která hází d20, můžeš její hod nahradit uloženým výsledkem. Musíš rozhodnout před oznámením úspěchu nebo neúspěchu. U Death Save rozhodni před samotným hodem.

Efekt končí použitím uloženého hodu, dalším sesláním Předurčení nebo spánkem či transem.`,
    'poznej-osobnost': `Vyber humanoida, kterého vidíš do 20 ft. Zjistíš jeho znamení zvěrokruhu a základní povahové rysy, například alignment, pýchu, hamižnost, pobožnost nebo inteligenci.

2nd-level upcast: zjistíš, čím se dnes zabývá a jaké má přibližné cíle.
3rd-level upcast: zjistíš, co tají před okolím.

Při seslání nad 1st level cíl hází Charisma save. Při úspěchu podrobnější informace nezjistíš. Cíl může dobrovolně neuspět a neví, že jej zkoumáš.`,
    'cteni-planet': `Při seslání hoď d10 a ulož výsledek do spánku. Jednou jej aktivuješ příslušnou Bonus Action nebo Reaction.

1 Slunce: bytost získá na 1 minutu +1 ke všem d20 hodům a damage rollům.
2 Merkur: Reaction přesměruje zásah na vedle stojící bytost; zachráněný cíl 1 minutu neprovokuje Opportunity Attacks.
3 Venuše: dvě bytosti jsou 1 minutu navzájem Charmed.
4 Měsíc: Reaction po způsobení damage vyvolá 1 minutu pláče; cíl nemůže útočit ani mluvit a opakuje WIS 15 na konci tahu.
5 Mars: Reaction přidá 2d8 Bludgeoning a přeživší cíl srazí Prone.
6 Jupiter: Reaction zopakuje neúspěšný check nebo save; poté 1 minutu Advantage na checks a saves.
7 Saturn: do spánku Advantage na Persuasion/Intimidation při obchodování a Investigation při lootování.
8 Mercury in Uranus: 2d8 Poison a Poisoned na 1 minutu.
9 Neptun: cíl ztrácí akce a náhodně se pohybuje, získá resistance na vše a útoky proti němu mají Disadvantage; WIS 15 na konci tahu.
10 Kometa: cíl získá jeden celý tah navíc bezprostředně po tvém tahu.`,
    'zviretnik': `Vyber až dvě bytosti do 15 ft. U každé aktivuj buff nebo debuff podle znamení. Efekt trvá do spánku.

Beran: Advantage na první útok v tahu / −2 AC.
Býk: Advantage na CON checks / Speed −10 ft.
Blíženci: Fly 10 ft., nejvýše 15 ft. vysoko / Disadvantage na WIS saves.
Rak: útoky proti allies do 5 ft. mají Disadvantage / každý přijatý damage +1.
Lev: imunita na Fire / ranged attacks proti cíli mají Advantage.
Panna: na začátku tahu 1d4 HP / −1d4 k attack rollům.
Váhy: při zásahu způsobí polovinu maxima +1 / při zásahu utrpí polovinu maxima +1.
Štír: každý damage +2 Poison / spell attacks proti cíli mají Advantage.
Střelec: Advantage na ranged attacks / melee attacks proti cíli mají Advantage.
Kozoroh: Climb Speed rovný Speed / ranged hit cíl srazí Prone.
Vodnář: může měnit damage na Lightning / přitahuje Lightning a Force útoky mířící do 15 ft.
Ryby: dýchání pod vodou a Swim Speed rovný Speed / na přímém slunci Disadvantage na d20 hody.`,
    'dissonant': `Cíl, kterého vidíš do 60 ft., hází Wisdom save. Při neúspěchu utrpí 3d6 Psychic damage a okamžitě použije Reaction, je-li dostupná, aby se nejbezpečnější cestou vzdálil co nejdál. Při úspěchu utrpí polovinu damage a nepohybuje se. Vyšší slot přidává 1d6 za každou úroveň nad 1st.`,
    'ceremony': `Třicetiminutový rituál. Cíl musí zůstat do 10 ft. po celou dobu. Vyber jeden obřad:

Atonement: po úspěšném DC 20 Wisdom (Insight) obnovíš willing cíli původní alignment.
Bless Water: vytvoříš jednu lahvičku Holy Water.
Coming of Age: young adult na 24 hodin přidává d4 k ability checks, pouze jednou za život.
Dedication: humanoid na 24 hodin přidává d4 k saves, pouze jednou.
Funeral Rite: mrtvola 7 dní nemůže být oživena jako undead mimo Wish.
Wedding: dospělí willing humanoidi získají na 7 dní +2 AC, pokud jsou do 30 ft.; znovu pouze po ovdovění.`,
    'ruka-bozi': `Bonusovou akcí rozzáříš dlaně. Po dobu koncentrace vyzařuješ Bright Light 5 ft. a Dim Light dalších 10 ft. Každé kolo můžeš Action provést melee unarmed attack holou dlaní, v níž můžeš držet pouze Kabala focus. Zásah způsobí 2d8 + INT modifier Radiant damage.

Celestials jsou imunní. Fiends a Undead po zásahu hází Constitution save; při neúspěchu jsou Restrained do konce svého dalšího tahu. Každý vyšší slot přidá 1d8 damage.`,
    'andelska-jmena': `Bonusovou akcí hoď d10. Výsledek určí nejvyšší číslo archanděla, kterého smíš zvolit; při 6 automaticky přivoláš Samaela. Manifestace se objeví do 30 ft. a trvá při koncentraci nejvýše 1 minutu.

1 Gabriel: jednorázová užitečná informace nebo rada.
2 Azrael: bytosti do 5 ft. při pádu na 0 HP získají 1 HP a jsou Stable a Unconscious.
3 Rafael: vybrané bytosti do 10 ft. získají 1d8 Temp HP; každé kolo Reaction vyléčí 1d4 HP bytosti do 10 ft.
4 Uriel: odhalí optické iluze a shapeshiftery do 15 ft.; vědomá lež způsobí 1d6 Psychic.
5 Anael: bytosti do 10 ft. jsou navzájem Charmed a nemohou na sebe útočit.
6 Samael: nestabilní portál každé kolo podle d4 nic neudělá, způsobí 3 Psychic do 10 ft., vyvolá Impa nebo Lilith.
7 Orifiel: útočníci do 15 ft. utrpí polovinu damage, kterou způsobí; léčitelé obnoví polovinu rozdaných HP.
8 Michael: vybrané bytosti do 10 ft. získají +1 AC a +1 Hit.
9 Ariel: ohnivý vír, 2d6 Fire uvnitř, 1d6 Fire do 5 ft. od okraje a STR save proti vtažení.
10 Raguel: všichni nepřátelé bez Good alignment do 15 ft. utrpí 3d8 Lightning a kouzlo skončí.`,
    'oziveni-golema': `Desetiminutovým rituálem oživíš připravenou hliněnou sochu. Golem tě poslouchá na slovní povely v rámci Action nebo Bonus Action a v boji hraje ihned po tobě. Kouzlo končí zničením golema, tvým ukončením nebo novým sesláním.

Golem: Medium, AC 16, 40 HP, Speed 30 ft.; STR 20, DEX 8, CON 16; Darkvision 30 ft. Melee +5, reach 5 ft., 2d8 Bludgeoning. Fire Breath v 15-ft. cone, DEX 14, 2d8 Fire, tři použití za Long Rest. V jedné Action může použít melee attack i Fire Breath. Ve vodě utrpí na začátku tahu 2d10 Acid.`,
    'karmicky-utok': `Reaction, když bytost, kterou vidíš do 60 ft., způsobí útokem damage. Cíl hází Wisdom save. Při neúspěchu utrpí 2d10 Psychic damage, při úspěchu polovinu. Každý vyšší spell slot přidá 1d10.`,
    'ocista-aury': `Vyber bytost do 15 ft., včetně sebe. Ukončíš Charmed nebo Frightened, případně Blinded, Deafened, Stunned či Paralyzed způsobené spellem.`,
    'amulet': `Rituálně očaruješ krystal nebo drahokam v hodnotě alespoň 20 GP.

Ochranný amulet: nositele nelze vystopovat Divination magic, proti spellům hází INT/WIS/CHA saves s Advantage a Opportunity Attacks proti němu mají Disadvantage.

Temný amulet: nositel má Disadvantage na všechny saves a −2 AC.

Nositelem je bytost na stejném 5-ft. prostoru. Amulet lze podstrčit. Současně mohou existovat nejvýše dva tvé amulety; třetí zruší nejstarší. Použitý krystal nelze očarovat znovu.`,
    'kaboom': `Při seslání se dotkneš drobného pevného nemagického předmětu a až 10 minut v něm hromadíš energii. Bonusovou akcí jej můžeš odpálit, nebo použít Reaction, když se někdo přiblíží do 5 ft.

Předmět je zničen. Všechny bytosti do 5 ft. hází Dexterity save. Při neúspěchu utrpí 2d8 Thunder, při úspěchu polovinu. Bytost, která má předmět na sobě nebo se jej dotýká, automaticky neuspěje. Výbuch je slyšet do 300 ft. Každý vyšší slot přidá 1d8.`,
    'alter-self': `Funguje jako Alter Self a navíc vyžaduje Alchemist's Supplies. Můžeš jej seslat také na willing bytost dotykem. Ta hází Constitution save DC 15; při neúspěchu ztratí 2d8 HP a kouzlo selže.`,
    'premena-kovu': `Jednou za Short Rest proměníš běžný kov na měď, měď na stříbro nebo stříbro na zlato. Výsledná hodnota nesmí přesáhnout 50 GP. Tvar a velikost zůstávají stejné.

Hoď d6: 1 polovina materiálu je zničena; 2 nic se nestane; 3 proměna na 1 hodinu; 4 na 6 hodin; 5 na 24 hodin; 6 trvale.`
  };

  const SCIENCE_ABILITIES = {
    'Polapení duše': `Reaction, když do 15 ft. zemře humanoid. Připoutáš jeho duši, maximálně dvě. Za každou spoutanou duši získáš +1 AC. Free Action můžeš jednu propustit a získat 2d4 Temp HP.`,
    'Vstoupení do éterální pláně': `Po dobu jedné hodiny můžeš Bonus Action přecházet mezi materiální a éterální plání. Každý vstup do éterální pláně stojí 1d6 + 2 HP. V éterální pláni jsi pro materiální bytosti neviditelný a nedotknutelný, nemůžeš s nimi interagovat a můžeš procházet běžnou hmotou. Velmi tlusté překážky a magické bariéry tě mohou zastavit.`,
    'Ochrana čtyř elementů': `Jednou denně urči bytost. Do konce jejího Long Restu získá resistence podle znamení: oheň (Fire, Lightning), země (Slashing, Piercing, Bludgeoning), vzduch (Thunder, Psychic, Force), voda (Cold, Acid, Poison). Po zásahu může Bonus Action přidat 1d4 odpovídajícího damage.`,
    'Moudrost vesmíru': `Získáš expertise v Insight. Jednou za Long Rest můžeš získat Truesight 30 ft. na jednu hodinu.`,
    'Ochranný kruh': `Za 10 minut nakreslíš nepřerušený kruh o průměru 5, 10 nebo 15 ft. a určíš dva typy bytostí, které jej nemohou překročit. Mohou přes okraj útočit, ale před attack rollem hodí d4; na 1–3 automaticky minou, na 4 útočí normálně a kruh poškodí. Po třetím poškození kruh zanikne. Zanikne také na konci tvého Long Restu nebo vytvořením dalšího kruhu.`,
    'Golem': `Za 12 hodin práce z 80 kg jílu či hlíny a 20 l vody vytvoříš nepřemístitelnou humanoidní sochu. Na hotovou sochu můžeš seslat Oživení golema, které máš vždy připravené a nepočítá se do limitu Postavení planet.`,
    'Mistr čaker': `Jednou za Long Rest po 10 minutách meditace zvol: ukonči Poisoned; vyléč lehké nemagické onemocnění; obnov 2d4 HP; ztrať 2d4 HP a odstraň jeden Exhaustion level; nebo do spánku získej +2 k INT/WIS/CHA saves.`,
    'Prokletá panenka': `Z materiálu za 5 GP vytvoříš panenku a připojíš část těla jiné bytosti. Třikrát za Long Rest můžeš Action zvolit: 3d8 Piercing; zničit panenku pro 8d6 Fire; vyřadit ruku nebo zpomalit nohu; nebo vyléčit 3d8 HP. Dárce na stejném plánu hází Wisdom save a může dobrovolně neuspět.`,
    'Experiment pro každý den': `Jednou denně po 10 minutách práce s Alchemist's Supplies vytvoříš náhodný výrobek: 1 Healing 2d4+2; 2 +2 STR na 1 hodinu; 3 +2 AC na 1 hodinu; 4 skokový pohyb na 1 hodinu; 5 pohyb po stěnách a stropě na 1 hodinu; 6 lepidlo na plochu 10 ft². Výrobek vydrží do konce příštího Long Restu. Za každých zaplacených 1d4+1 HP můžeš před hodem jeden výsledek vyřadit.`,
    'Změna vlastní podstaty': `Jednou za Short Rest můžeš Bonus Action na 1 minutu zvolit lehkou, těžkou nebo měkkou podobu. Lehká levituje 5–20 ft. a nebere fall damage. Těžká má Speed 5 ft., desetkrát vyšší hmotnost, imunitu na nemagické útoky a resistence na Fire, Lightning, Cold, Acid a Poison. Měkká je Prone, nemůže útočit zbraněmi ani sesílat Somatic spelly, ale melee útoky a grapple proti ní mají Disadvantage a dokáže protéct otvorem alespoň 20 cm². Bonus Action se vrátíš do normálu.`
  };

  for (const feature of O.features || []) {
    if (!FEATURE_TEXT[feature.id]) continue;
    feature.fullText = FEATURE_TEXT[feature.id];
    feature.summary = FEATURE_TEXT[feature.id].split('\n')[0];
  }
  for (const spell of O.spells || []) {
    if (!SPELL_TEXT[spell.id]) continue;
    spell.fullText = SPELL_TEXT[spell.id];
    spell.desc = SPELL_TEXT[spell.id];
  }
  O.scienceAbilities = SCIENCE_ABILITIES;
  O.rulesSource = 'Occultist.pdf supplied by the campaign author';
})();
