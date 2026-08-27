(function () {
  'use strict';

  const WORLD_CURRENCIES = [
    { id: 'generic', region: 'Nezařazené', name: 'Obecná herní měna', denominations: { g: 'Zlaťák', s: 'Stříbrňák', c: 'Měďák' } },
    { id: 'united-kingdom', region: 'Spojené království', name: 'Libra šterlinků', denominations: { g: 'Sovereign', s: 'Libra', c: 'Pence (Penny)' } },
    { id: 'france-monaco', region: 'Francie, Monako', name: 'Francouzský a monacký frank', denominations: { g: 'Zlatý frank', s: 'Stříbrný frank', c: 'Centim' } },
    { id: 'belgium-switzerland', region: 'Belgie, Švýcarsko', name: 'Belgický a švýcarský frank', denominations: { g: 'Zlatý frank', s: 'Stříbrný frank', c: 'Centim' } },
    { id: 'spain', region: 'Španělské království', name: 'Španělská peseta', denominations: { g: 'Zlatá peseta', s: 'Stříbrná peseta', c: 'Céntimo' } },
    { id: 'germany', region: 'Německé císařství', name: 'Marka', denominations: { g: 'Zlatá marka', s: 'Stříbrná marka', c: 'Fenik (měďák)' } },
    { id: 'austria-hungary', region: 'Rakousko-Uhersko, Lichtenštejnsko', name: 'Rakousko-uherská koruna', denominations: { g: 'Zlatá koruna', s: 'Stříbrná koruna', c: 'Haléř' } },
    { id: 'italy', region: 'Italské království', name: 'Italská lira', denominations: { g: 'Zlatá lira', s: 'Stříbrná lira', c: 'Centesimo' } },
    { id: 'romania', region: 'Rumunsko', name: 'Lei', denominations: { g: 'Zlatý leu (pl. lei)', s: 'Stříbrný leu', c: 'Ban (pl. bani)' } },
    { id: 'russia', region: 'Ruské impérium', name: 'Rubl', denominations: { g: 'Zlatý rubl', s: 'Stříbrný rubl', c: 'Kopějka' } },
    { id: 'ottoman-empire', region: 'Osmanská říše', name: 'Lira', denominations: { g: 'Zlatá lira', s: 'Stříbrná lira', c: 'Kuruş' } },
    { id: 'greece', region: 'Řecko', name: 'Drachma', denominations: { g: 'Zlatá drachma', s: 'Stříbrná drachma', c: 'Lepton (pl. lepta)' } },
    { id: 'usa', region: 'USA', name: 'Americký dolar', denominations: { g: 'Dolar', s: 'Dime', c: 'Cent' } }
  ];
  const CURRENCY_BY_ID = new Map(WORLD_CURRENCIES.map(currency => [currency.id, currency]));

  // Exact SRD weights used when an imported or magic item only retains its name.
  const NAME_WEIGHTS = {
    'club': 2, 'dagger': 1, 'greatclub': 10, 'handaxe': 2, 'javelin': 2, 'light hammer': 2,
    'mace': 4, 'quarterstaff': 4, 'sickle': 2, 'spear': 3, 'dart': 0.25, 'light crossbow': 5,
    'shortbow': 2, 'sling': 0, 'battleaxe': 4, 'flail': 2, 'glaive': 6, 'greataxe': 7,
    'greatsword': 6, 'halberd': 6, 'lance': 6, 'longsword': 3, 'maul': 10, 'morningstar': 4,
    'pike': 18, 'rapier': 2, 'scimitar': 3, 'shortsword': 2, 'trident': 4, 'warhammer': 5,
    'war pick': 2, 'whip': 3, 'blowgun': 1, 'hand crossbow': 3, 'heavy crossbow': 18,
    'longbow': 2, 'musket': 10, 'pistol': 3, 'derringer': 0.25, 'karabina': 5, 'revolver': 2,
    'browning 1900': 3, 'mauser m 98': 18, 'mannlicher m 1903': 2, 'mondrogón m 1908': 10,
    'parabella': 3,
    'padded armor': 8, 'leather armor': 10, 'studded leather armor': 13, 'hide armor': 12,
    'chain shirt': 20, 'scale mail': 45, 'breastplate': 20, 'half plate armor': 40, 'ring mail': 40,
    'chain mail': 55, 'splint armor': 60, 'plate armor': 65, 'shield': 6,
    'backpack': 5, 'bedroll': 7, 'costume': 4, 'candle': 0, 'rations': 2, 'waterskin': 5,
    'disguise kit': 3, 'torch': 1, 'rope': 5, "thieves' tools": 1, "navigator's tools": 2,
    'quiver': 1, 'crossbow bolt case': 1, 'pouch': 1, "explorer's pack": 55,
    "entertainer's pack": 38, 'bag of holding': 15, 'handy haversack': 5, 'efficient quiver': 2,
    'portable hole': 0.1, 'broom of flying': 3, 'immovable rod': 2, 'rope of climbing': 10,
    'rope of entanglement': 10, 'lantern of revealing': 2, 'iron flask': 1, 'decanter of endless water': 2
  };
  const SORTED_WEIGHT_NAMES = Object.keys(NAME_WEIGHTS).sort((a, b) => b.length - a.length);

  const normalize = value => String(value || '').trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
  const finiteWeight = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

  function namedWeight(name, allowContained = true) {
    const normalized = normalize(name);
    if (!normalized) return null;
    if (Object.hasOwn(NAME_WEIGHTS, normalized)) return NAME_WEIGHTS[normalized];
    if (!allowContained) return null;
    for (const candidate of SORTED_WEIGHT_NAMES) {
      if (candidate.length < 5) continue;
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`).test(normalized)) return NAME_WEIGHTS[candidate];
    }
    return null;
  }

  function contentsWeight(contents) {
    if (!Array.isArray(contents) || !contents.length) return null;
    let total = 0;
    for (const entry of contents) {
      const name = entry?.item?.name || entry?.item?.index || entry?.name || entry?.item || '';
      const weight = namedWeight(name, false);
      if (weight == null) return null;
      total += weight * Math.max(1, Number(entry.quantity) || 1);
    }
    return Math.round(total * 100) / 100;
  }

  function inferItemWeight(item = {}) {
    const direct = finiteWeight(item.weight ?? item.raw?.weight);
    if (direct != null) return { value: direct, estimated: !!item.weightEstimated, reason: item.weightNote || '' };

    const name = normalize(item.name || item.raw?.name);
    const exact = namedWeight(name);
    if (exact != null) return { value: exact, estimated: true, reason: 'Estimated from the matching SRD item profile.' };

    const packed = contentsWeight(item.raw?.contents);
    if (packed != null) return { value: packed, estimated: true, reason: 'Estimated from the listed contents.' };

    const category = normalize([
      item.kind, item.itemType, item.category, item.raw?.equipment_category?.name,
      ...(item.raw?.equipment_categories || []).map(entry => entry?.name), item.raw?.armor_category,
      item.raw?.weapon_category, item.raw?.gear_category?.name, item.raw?.tool_category
    ].filter(Boolean).join(' '));
    const text = `${name} ${category}`;
    const estimate = (value, reason) => ({ value, estimated: true, reason });

    if (/ammunition|arrow|bolt|bullet|needle/.test(text)) return estimate(0.05, 'Estimated as one small piece of ammunition.');
    if (/ring\b/.test(text) && !/ring mail/.test(text)) return estimate(0.02, 'Estimated from a typical ring.');
    if (/amulet|brooch|medallion|necklace|periapt|talisman|scarab|ioun stone|gem|pearl|bead/.test(text)) return estimate(0.1, 'Estimated from a small worn object or gem.');
    if (/potion|philter|oil|bottle|flask|vial/.test(text)) return estimate(0.5, 'Estimated from a filled vial or small bottle.');
    if (/scroll|manual|tome|book|deck/.test(text)) return estimate(1, 'Estimated from a scroll, book, or card deck.');
    if (/wand/.test(text)) return estimate(1, 'Estimated from a typical wand.');
    if (/rod/.test(text)) return estimate(2, 'Estimated from a typical rod.');
    if (/staff/.test(text)) return estimate(4, 'Estimated from a typical staff.');
    if (/cloak|cape|mantle|robe/.test(text)) return estimate(2, 'Estimated from a worn garment.');
    if (/boots|slippers|gloves|gauntlets|bracers|goggles|eyes of/.test(text)) return estimate(1, 'Estimated from a worn pair.');
    if (/helm|hat|headband|circlet/.test(text)) return estimate(2, 'Estimated from worn headgear.');
    if (/belt/.test(text)) return estimate(1, 'Estimated from a belt.');
    if (/armor/.test(text)) return estimate(40, 'Estimated from a medium armor profile; edit after choosing the exact armor.');
    if (/shield/.test(text)) return estimate(6, 'Estimated from the SRD Shield profile.');
    if (/weapon/.test(text)) return estimate(3, 'Estimated from a one-handed weapon profile; edit for the exact weapon.');
    if (/bag|pack|sack|pouch|case|container/.test(text)) return estimate(2, 'Estimated from a small empty container.');
    if (/tool|kit|supplies|instrument/.test(text)) return estimate(3, 'Estimated from a portable tool kit.');
    return estimate(1, 'Generic estimate for a small carried item.');
  }

  function applyItemWeight(item) {
    if (!item || typeof item !== 'object') return item;
    const result = inferItemWeight(item);
    item.weight = Math.max(0, Number(result.value) || 0);
    item.weightEstimated = !!result.estimated;
    if (result.estimated && result.reason) item.weightNote = result.reason;
    else if (!result.estimated) delete item.weightNote;
    return item;
  }

  function currency(id) { return CURRENCY_BY_ID.get(String(id || '')) || CURRENCY_BY_ID.get('generic'); }

  window.GearRulesV9 = {
    WORLD_CURRENCIES, CURRENCY_BY_ID, NAME_WEIGHTS,
    currency, namedWeight, inferItemWeight, applyItemWeight
  };
})();
