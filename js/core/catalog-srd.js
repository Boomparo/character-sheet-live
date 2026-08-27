(function () {
  'use strict';

  const GearRules = window.GearRulesV9;
  const CACHE_KEY = 'v9-srd-2024-items-v6';
  const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
  const EQUIPMENT_URL = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Equipment.json';
  const MAGIC_URL = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Magic-Items.json';
  const RARITY_ORDER = { Mundane: 0, Common: 1, Uncommon: 2, Rare: 3, 'Very Rare': 4, Legendary: 5, Artifact: 6, Varies: 7 };
  const COIN_CP = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
  const TAG_OPTIONS = [
    ['weapon', 'WEAPON'], ['ranged', 'RANGED'], ['melee', 'MELEE'], ['simple', 'SIMPLE'], ['martial', 'MARTIAL'],
    ['finesse', 'FINESSE'], ['light', 'LIGHT'], ['loading', 'LOADING'], ['two-handed', 'TWO-HANDED'],
    ['ammunition', 'AMMUNITION'], ['firearm', 'FIREARM'], ['armor', 'ARMOR'], ['tool', 'TOOL'],
    ['container', 'CONTAINER'], ['homebrew', 'HOME BREW']
  ];
  let memory = null;

  const clone = value => JSON.parse(JSON.stringify(value));
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const propertyNames = value => (Array.isArray(value) ? value : []).map(entry => typeof entry === 'object' ? entry.name || entry.index || '' : String(entry)).filter(Boolean);
  const cost = (quantity, unit = 'gp') => ({ quantity: Number(quantity) || 0, unit: String(unit || 'gp').toLowerCase() });

  function cleanRarity(value) {
    const rendered = String(value || 'Mundane');
    return Object.keys(RARITY_ORDER).find(key => rendered.startsWith(key)) || rendered || 'Mundane';
  }

  function text(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(entry => typeof entry === 'object' ? entry.name || entry.index || JSON.stringify(entry) : entry).join(', ');
    if (typeof value === 'object') return value.name || value.index || JSON.stringify(value);
    return String(value);
  }

  function deriveTags(item) {
    const raw = item.raw || {};
    const category = `${item.category || ''} ${raw.weapon_category || ''} ${raw.weapon_range || ''} ${raw.armor_category || ''} ${raw.tool_category || ''}`.toLowerCase();
    const properties = [...propertyNames(item.properties), ...propertyNames(raw.properties)].map(slug);
    const tags = new Set([...(item.tags || []).map(slug), ...properties]);
    if (properties.some(property => property.startsWith('ammunition'))) tags.add('ammunition');
    if (properties.some(property => property.startsWith('two-handed'))) tags.add('two-handed');
    if (raw.damage?.damage_dice || item.damage || category.includes('weapon')) tags.add('weapon');
    if (category.includes('ranged')) tags.add('ranged');
    if (category.includes('melee')) tags.add('melee');
    if (category.includes('simple')) tags.add('simple');
    if (category.includes('martial')) tags.add('martial');
    if (category.includes('armor') || raw.armor_category) tags.add('armor');
    if (category.includes('tool') || /tools?|supplies|kit/i.test(item.name || '')) tags.add('tool');
    if (item.homebrew) tags.add('homebrew');
    if (item.firearm || /firearm|pistol|revolver|derringer|karabina|mauser|mannlicher|mondrog[oó]n|parabella|browning/i.test(item.name || '')) tags.add('firearm');
    if (item.isContainer || /^(backpack|.* pack|bag|sack|pouch|chest|case|barrel|basket)$/i.test(String(item.name || '').trim())) tags.add('container');
    return [...tags].filter(Boolean);
  }

  function normalizeEquipment(source) {
    const categories = (source.equipment_categories || []).map(category => category.name).filter(Boolean);
    const item = {
      id: `equipment:${source.index}`, index: source.index, name: source.name || source.index, kind: 'Equipment', rarity: 'Mundane',
      category: categories.join(' • ') || source.equipment_category?.name || 'Equipment', attunement: false,
      description: Array.isArray(source.desc) ? source.desc.join('\n') : String(source.description || source.desc || ''), image: source.image || '',
      cost: source.cost ? cost(source.cost.quantity, source.cost.unit) : null, weight: source.weight ?? null,
      source: 'SRD 5.2.1', raw: source
    };
    item.tags = deriveTags(item);
    item.isContainer = item.tags.includes('container');
    GearRules?.applyItemWeight?.(item);
    return item;
  }

  function normalizeMagic(source) {
    const item = {
      id: `magic:${source.index}`, index: source.index, name: source.name || source.index, kind: 'Magic Item',
      rarity: cleanRarity(source.rarity?.name), rarityLabel: source.rarity?.name || '', category: source.equipment_category?.name || 'Magic Item',
      attunement: !!source.attunement, description: Array.isArray(source.desc) ? source.desc.join('\n') : String(source.desc || ''),
      image: source.image || '', cost: source.cost ? cost(source.cost.quantity, source.cost.unit) : null, source: 'SRD 5.2.1', raw: source
    };
    item.tags = deriveTags(item);
    GearRules?.applyItemWeight?.(item);
    return item;
  }

  function firearm(id, name, original, category, damage, range, properties, mastery, weight, price, description) {
    const [damageDice, damageType] = damage.split(' ');
    const [normal, long] = range.split('/').map(Number);
    const weaponCategory = category.startsWith('Simple') ? 'Simple' : 'Martial';
    const raw = {
      index: id, name, equipment_category: { name: 'Weapon' }, equipment_categories: [{ name: category }],
      weapon_category: weaponCategory, weapon_range: 'Ranged', category_range: { name: category },
      damage: { damage_dice: damageDice, damage_type: { name: damageType } }, range: { normal, long },
      properties: properties.map(property => ({ name: property })), mastery: { name: mastery }, weight,
      cost: cost(price, 'gp'), desc: [description, `Campaign conversion of ${original}.`]
    };
    const item = {
      id: `homebrew:${id}`, index: id, name, kind: 'Equipment', rarity: 'Mundane', category, source: "Luky's campaign firearms",
      description: raw.desc.join('\n'), cost: raw.cost, weight, raw, homebrew: true, firearm: true,
      damage: damageDice, damageType, attackAbility: 'DEX', rangeLabel: `${range} ft.`, properties, mastery, masteryWeapon: original
    };
    item.tags = deriveTags(item);
    GearRules?.applyItemWeight?.(item);
    return item;
  }

  const HOME_BREW_ITEMS = [
    firearm('derringer', 'Derringer', 'Dart', 'Simple Ranged Weapon', '1d4 Piercing', '20/60', ['Ammunition (Bullet)', 'Finesse', 'Light'], 'Vex', 0.25, 5, 'Pocket pistol suitable for a handbag or vest.'),
    firearm('karabina', 'Karabina', 'Light Crossbow', 'Simple Ranged Weapon', '1d8 Piercing', '80/320', ['Ammunition (Bullet)', 'Loading', 'Two-Handed'], 'Slow', 5, 25, 'Short rifle.'),
    firearm('revolver', 'Revolver', 'Shortbow', 'Simple Ranged Weapon', '1d6 Piercing', '80/320', ['Ammunition (Bullet)', 'Two-Handed'], 'Vex', 2, 25, 'Small self-loading pistol.'),
    firearm('browning-1900', 'Browning 1900', 'Hand Crossbow', 'Martial Ranged Weapon', '1d6 Piercing', '30/120', ['Ammunition (Bullet)', 'Light', 'Loading'], 'Vex', 3, 75, 'Self-loading pistol with a conventional slide.'),
    firearm('mauser-m-98', 'Mauser M 98', 'Heavy Crossbow', 'Martial Ranged Weapon', '1d10 Piercing', '100/400', ['Ammunition (Bullet)', 'Heavy', 'Loading', 'Two-Handed'], 'Push', 18, 50, 'Heavy repeating rifle.'),
    firearm('mannlicher-m-1903', 'Mannlicher M 1903', 'Longbow', 'Martial Ranged Weapon', '1d8 Piercing', '150/600', ['Ammunition (Bullet)', 'Heavy', 'Two-Handed'], 'Slow', 2, 50, 'Elegant hunting rifle.'),
    firearm('mondrogon-m-1908', 'Mondrogón M 1908', 'Musket', 'Martial Ranged Weapon', '1d12 Piercing', '40/120', ['Ammunition (Bullet)', 'Loading', 'Two-Handed'], 'Slow', 10, 500, 'Early self-loading military rifle.'),
    firearm('parabella', 'Parabella', 'Pistol', 'Martial Ranged Weapon', '1d10 Piercing', '30/90', ['Ammunition (Bullet)', 'Loading'], 'Vex', 3, 250, 'Highly reliable self-loading pistol.')
  ];

  function curated(id, name, category, price, unit = 'gp', extras = {}) {
    const raw = { index: id, name, equipment_category: { name: category }, cost: cost(price, unit), ...clone(extras.raw || {}) };
    const extraFields = clone(extras);
    delete extraFields.raw;
    const item = { id: `curated:${id}`, index: id, name, kind: 'Equipment', rarity: 'Mundane', category, source: 'SRD 5.2.1', cost: raw.cost, raw, ...extraFields };
    item.tags = deriveTags(item);
    item.isContainer = item.tags.includes('container');
    GearRules?.applyItemWeight?.(item);
    return item;
  }

  function curatedWeapon(id, name, category, price, unit, damage, damageType, properties, mastery, weight, range = '') {
    const ranged = /ranged/i.test(category);
    const raw = {
      weapon_category: /^simple/i.test(category) ? 'Simple' : 'Martial', weapon_range: ranged ? 'Ranged' : 'Melee',
      damage: { damage_dice: damage, damage_type: { name: damageType } },
      properties: properties.map(name => ({ name })), mastery: { name: mastery }, weight
    };
    if (range) {
      const [normal, long] = range.split('/').map(Number);
      raw.range = { normal, long };
    }
    return curated(id, name, category, price, unit, {
      itemType: 'weapon', damage, damageType, properties, mastery, weight,
      attackAbility: properties.includes('Finesse') || ranged ? 'DEX' : 'STR', rangeLabel: range ? `${range} ft.` : '', raw
    });
  }

  const CURATED_FALLBACK = [
    curatedWeapon('dagger', 'Dagger', 'Simple Melee Weapon', 2, 'gp', '1d4', 'Piercing', ['Finesse', 'Light', 'Thrown (20/60)'], 'Nick', 1),
    curatedWeapon('dart', 'Dart', 'Simple Ranged Weapon', 5, 'cp', '1d4', 'Piercing', ['Finesse', 'Thrown (20/60)'], 'Vex', 0.25, '20/60'),
    curatedWeapon('light-crossbow', 'Light Crossbow', 'Simple Ranged Weapon', 25, 'gp', '1d8', 'Piercing', ['Ammunition (Bolt)', 'Loading', 'Two-Handed'], 'Slow', 5, '80/320'),
    curatedWeapon('shortbow', 'Shortbow', 'Simple Ranged Weapon', 25, 'gp', '1d6', 'Piercing', ['Ammunition (Arrow)', 'Two-Handed'], 'Vex', 2, '80/320'),
    curatedWeapon('sling', 'Sling', 'Simple Ranged Weapon', 1, 'sp', '1d4', 'Bludgeoning', ['Ammunition (Sling Bullet)'], 'Slow', 0, '30/120'),
    curatedWeapon('whip', 'Whip', 'Martial Melee Weapon', 2, 'gp', '1d4', 'Slashing', ['Finesse', 'Reach'], 'Slow', 3),
    curatedWeapon('rapier', 'Rapier', 'Martial Melee Weapon', 25, 'gp', '1d8', 'Piercing', ['Finesse'], 'Vex', 2),
    curatedWeapon('scimitar', 'Scimitar', 'Martial Melee Weapon', 25, 'gp', '1d6', 'Slashing', ['Finesse', 'Light'], 'Nick', 3),
    curatedWeapon('shortsword', 'Shortsword', 'Martial Melee Weapon', 10, 'gp', '1d6', 'Piercing', ['Finesse', 'Light'], 'Vex', 2),
    curatedWeapon('blowgun', 'Blowgun', 'Martial Ranged Weapon', 10, 'gp', '1', 'Piercing', ['Ammunition (Needle)', 'Loading'], 'Vex', 1, '25/100'),
    curatedWeapon('hand-crossbow', 'Hand Crossbow', 'Martial Ranged Weapon', 75, 'gp', '1d6', 'Piercing', ['Ammunition (Bolt)', 'Light', 'Loading'], 'Vex', 3, '30/120'),
    curatedWeapon('heavy-crossbow', 'Heavy Crossbow', 'Martial Ranged Weapon', 50, 'gp', '1d10', 'Piercing', ['Ammunition (Bolt)', 'Heavy', 'Loading', 'Two-Handed'], 'Push', 18, '100/400'),
    curatedWeapon('longbow', 'Longbow', 'Martial Ranged Weapon', 50, 'gp', '1d8', 'Piercing', ['Ammunition (Arrow)', 'Heavy', 'Two-Handed'], 'Slow', 2, '150/600'),
    curatedWeapon('musket', 'Musket', 'Martial Ranged Weapon', 500, 'gp', '1d12', 'Piercing', ['Ammunition (Bullet)', 'Loading', 'Two-Handed'], 'Slow', 10, '40/120'),
    curatedWeapon('pistol', 'Pistol', 'Martial Ranged Weapon', 250, 'gp', '1d10', 'Piercing', ['Ammunition (Bullet)', 'Loading'], 'Vex', 3, '30/90'),
    curated('leather-armor', 'Leather Armor', 'Light Armor', 10, 'gp', { itemType: 'armor', armorBase: 11, armorDex: 'full', weight: 10, raw: { armor_category: 'Light', armor_class: { base: 11, dex_bonus: true }, weight: 10 } }),
    curated('backpack', 'Backpack', 'Adventuring Gear', 2, 'gp', { itemType: 'container', isContainer: true, capacity: '30 lb. within 1 cubic foot', weight: 5 }),
    curated('explorers-pack', "Explorer's Pack", 'Equipment Pack', 10, 'gp', { itemType: 'container', isContainer: true, weight: 55, description: 'Contains a Backpack, Bedroll, 2 flasks of Oil, 10 days of Rations, Rope, a Tinderbox, 10 Torches, and a Waterskin.' }),
    curated('thieves-tools', "Thieves' Tools", 'Tool', 25, 'gp', { itemType: 'item', weight: 1 }),
    curated('navigators-tools', "Navigator's Tools", 'Tool', 25, 'gp', { itemType: 'item', weight: 2 }),
    curated('arrows', 'Arrows (20)', 'Ammunition', 1, 'gp', { itemType: 'item', quantity: 20, weight: 1, tags: ['ammunition'] }),
    curated('bolts', 'Crossbow Bolts (20)', 'Ammunition', 1, 'gp', { itemType: 'item', quantity: 20, weight: 1.5, tags: ['ammunition'] }),
    curated('firearm-bullets', 'Firearm Bullets (10)', 'Ammunition', 3, 'gp', { itemType: 'item', quantity: 10, weight: 2, tags: ['ammunition'] }),
    curated('sling-bullets', 'Sling Bullets (20)', 'Ammunition', 4, 'cp', { itemType: 'item', quantity: 20, weight: 1.5, tags: ['ammunition'] }),
    curated('blowgun-needles', 'Blowgun Needles (50)', 'Ammunition', 1, 'gp', { itemType: 'item', quantity: 50, weight: 1, tags: ['ammunition'] }),
    curated('quiver', 'Quiver', 'Adventuring Gear', 1, 'gp', { itemType: 'container', isContainer: true, capacity: '20 arrows', weight: 1 }),
    curated('crossbow-bolt-case', 'Crossbow Bolt Case', 'Adventuring Gear', 1, 'gp', { itemType: 'container', isContainer: true, capacity: '20 bolts', weight: 1 }),
    curated('pouch', 'Pouch', 'Adventuring Gear', 5, 'sp', { itemType: 'container', isContainer: true, capacity: '6 lb. within 1/5 cubic foot', weight: 1 })
  ];

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.items) && Date.now() - Number(cached.savedAt || 0) < CACHE_MS) return cached.items;
    } catch (error) {}
    return null;
  }

  function writeCache(items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items })); } catch (error) {}
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return response.json();
  }

  function mergeCatalog(items) {
    const byName = new Map();
    for (const item of [...items, ...CURATED_FALLBACK]) {
      const key = String(item.name || '').toLowerCase();
      if (!byName.has(key)) byName.set(key, item);
    }
    return [...byName.values(), ...HOME_BREW_ITEMS];
  }

  async function load(force = false) {
    if (memory && !force) return memory;
    if (!force) {
      const cached = readCache();
      if (cached) { memory = mergeCatalog(cached); return memory; }
    }
    try {
      const [equipment, magic] = await Promise.all([fetchJson(EQUIPMENT_URL), fetchJson(MAGIC_URL)]);
      const remote = [...equipment.map(normalizeEquipment), ...magic.map(normalizeMagic)];
      writeCache(remote);
      memory = mergeCatalog(remote);
    } catch (error) {
      memory = mergeCatalog([]);
    }
    return memory;
  }

  function sort(items, mode = 'rarity') {
    const result = [...items];
    if (mode === 'name') return result.sort((a, b) => a.name.localeCompare(b.name));
    return result.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99) || Number(b.homebrew) - Number(a.homebrew) || a.name.localeCompare(b.name));
  }

  async function search(query = '', filters = {}) {
    const all = await load();
    const needle = String(query).trim().toLowerCase();
    const rarity = filters.rarity || 'all';
    const kind = filters.kind || 'all';
    const tags = (filters.tags || []).map(slug).filter(Boolean);
    const starting = !!filters.starting;
    return sort(all.filter(item => {
      const haystack = `${item.name} ${item.category} ${item.rarity} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase();
      return (!needle || haystack.includes(needle)) && (rarity === 'all' || item.rarity === rarity) &&
        (kind === 'all' || item.kind === kind) && tags.every(tag => (item.tags || []).includes(tag)) &&
        (!starting || item.kind === 'Equipment');
    }), filters.sort || 'rarity');
  }

  function priceLabel(item) {
    const value = item?.cost || item?.raw?.cost;
    if (!value || !Number.isFinite(Number(value.quantity))) return item?.kind === 'Magic Item' ? 'Price varies' : '—';
    return `${Number(value.quantity)} ${String(value.unit || 'gp').toUpperCase()}`;
  }

  function costInCp(item) {
    const value = item?.cost || item?.raw?.cost;
    const multiplier = COIN_CP[String(value?.unit || '').toLowerCase()];
    return multiplier ? Math.max(0, Math.round(Number(value.quantity || 0) * multiplier)) : null;
  }

  function push(out, label, value) {
    const rendered = text(value);
    if (rendered && rendered !== '0') out.push([label, rendered]);
  }

  function displayFields(item) {
    const raw = item.raw || {};
    const out = [];
    push(out, 'Price', priceLabel(item));
    if (item.rarity) push(out, 'Rarity', item.rarityLabel || item.rarity);
    if (item.category) push(out, 'Category', item.category);
    if (item.attunement) push(out, 'Attunement', 'Required');
    if (item.weight != null || raw.weight != null) push(out, item.weightEstimated ? 'Weight (estimated)' : 'Weight', `${item.weightEstimated ? '~' : ''}${item.weight ?? raw.weight} lb.`);
    push(out, 'Weapon Category', raw.weapon_category);
    push(out, 'Weapon Range', raw.weapon_range);
    if (raw.damage?.damage_dice) push(out, 'Damage', `${raw.damage.damage_dice} ${raw.damage.damage_type?.name || ''}`.trim());
    if (raw.two_handed_damage?.damage_dice) push(out, 'Two-Handed Damage', `${raw.two_handed_damage.damage_dice} ${raw.two_handed_damage.damage_type?.name || raw.damage?.damage_type?.name || ''}`.trim());
    if (raw.range?.normal != null) push(out, 'Range', `${raw.range.normal}${raw.range.long ? `/${raw.range.long}` : ''} ft.`);
    if (raw.throw_range?.normal != null) push(out, 'Thrown Range', `${raw.throw_range.normal}${raw.throw_range.long ? `/${raw.throw_range.long}` : ''} ft.`);
    push(out, 'Properties', raw.properties || item.properties);
    push(out, 'Mastery', raw.mastery?.name || raw.mastery || item.mastery);
    push(out, 'Armor Category', raw.armor_category);
    if (raw.armor_class?.base != null) push(out, 'AC', String(raw.armor_class.base));
    if (raw.armor_class?.dex_bonus) push(out, 'DEX Bonus', 'Yes');
    if (raw.armor_class?.max_bonus != null) push(out, 'Max DEX Bonus', raw.armor_class.max_bonus);
    push(out, 'Tool Category', raw.tool_category);
    push(out, 'Gear Category', raw.gear_category?.name || raw.gear_category);
    push(out, 'Capacity', item.capacity || raw.capacity);
    if (Array.isArray(raw.contents) && raw.contents.length) push(out, 'Contents', raw.contents.map(entry => `${entry.quantity || 1}× ${entry.item?.name || entry.item?.index || entry.item || ''}`));
    return out;
  }

  function cloneForInventory(item) {
    const copy = clone({ ...item, addedAt: new Date().toISOString() });
    copy.id = item.id;
    const bundleSize = Math.max(1, Math.floor(Number(copy.quantity) || 1));
    if (bundleSize > 1) {
      copy.bundleSize = bundleSize;
      copy.ammunitionCount = bundleSize;
      if (!new RegExp(`\\(${bundleSize}\\)`).test(copy.name)) copy.name = `${copy.name} (${bundleSize})`;
    }
    copy.quantity = 1;
    copy.itemType = copy.itemType || (copy.tags?.includes('weapon') ? 'weapon' : copy.tags?.includes('armor') ? 'armor' : copy.tags?.includes('container') ? 'container' : 'item');
    copy.isContainer = copy.itemType === 'container' || !!copy.isContainer;
    copy.cost = copy.cost || copy.raw?.cost || null;
    GearRules?.applyItemWeight?.(copy);
    return copy;
  }

  window.V7SItemCatalog = {
    load, search, sort, displayFields, cloneForInventory, priceLabel, costInCp, deriveTags,
    RARITY_ORDER, TAG_OPTIONS, HOME_BREW_ITEMS, CURATED_FALLBACK,
    attribution: "D&D SRD 5.2.1 (CC BY 4.0); firearm variants: Luky's campaign rules"
  };
})();
