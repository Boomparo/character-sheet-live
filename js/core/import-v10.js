(function () {
  'use strict';
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);

  // Only normalize separators outside strings; descriptions and portraits stay byte-for-byte intact.
  function normalizeText(value) {
    let quoted = false, escaped = false, result = '';
    for (const char of String(value ?? '')) {
      if (quoted) {
        result += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') { quoted = true; result += char; }
      else if (/[\uFEFF\u200B\u2060]/u.test(char)) continue;
      else result += /\s/u.test(char) ? (/[\r\n\t ]/.test(char) ? char : ' ') : char;
    }
    return result.trim();
  }

  function parse(text) {
    const clean = normalizeText(text);
    if (!clean) throw new Error('Choose a JSON file or paste the complete JSON first.');
    let payload;
    try { payload = JSON.parse(clean); }
    catch (error) {
      const position = Number(error.message.match(/position (\d+)/)?.[1]);
      const prefix = Number.isFinite(position) ? clean.slice(0, position) : '';
      const location = prefix ? ` at line ${prefix.split('\n').length}, column ${prefix.split('\n').pop().length + 1}` : '';
      const incomplete = /end of|unterminated/i.test(error.message);
      throw new Error(incomplete ? 'The JSON is incomplete. Select the original export file instead of a shortened copy.' : `Invalid JSON${location}. Check quotes, commas and brackets. Select the original export file if pasted text was altered.`);
    }
    if (!object(payload)) throw new Error('The JSON must contain a character object or a roster export.');
    return payload;
  }

  function validate(payload) {
    if (!object(payload)) throw new Error('Character data must be a JSON object.');
    if ('profiles' in payload) {
      if (!Array.isArray(payload.profiles) || !payload.profiles.length) throw new Error('The roster has no characters to import.');
      payload.profiles.forEach((profile, index) => {
        try { validateNative(profile?.data); }
        catch (error) { throw new Error(`Character ${index + 1}: ${error.message}`); }
      });
    } else if ('character' in payload || 'classes' in payload) validateNative(payload);
    else {
      if (typeof payload.name !== 'string' || !payload.name.trim()) throw new Error('The character name is missing. This is not a complete character export.');
      if (!object(payload.abilities) && !object(payload.attributes)) throw new Error('Ability scores are missing. Import the complete character export.');
      if (payload.classKey === 'occultist') {
        if (!object(payload.sciences)) throw new Error('Occultist sciences are missing.');
        for (const key of ['spells', 'items', 'weapons', 'armors', 'languages', 'npcs']) {
          if (payload[key] != null && !Array.isArray(payload[key])) throw new Error(`Occultist ${key} must be a list.`);
        }
      }
    }
    return payload;
  }
  function validateNative(payload) {
    if (!object(payload) || !object(payload.character) || !object(payload.classes)) throw new Error('The native export is missing character or classes data.');
    if (!object(payload.character.abilities)) throw new Error('The native export is missing ability scores.');
    const classKey = payload.character.classKey;
    if (classKey && window.CharacterClassRegistry && !window.CharacterClassRegistry.get(classKey)) throw new Error(`Unsupported class: ${classKey}.`);
  }

  async function readFile(file) {
    if (!file || !file.size) throw new Error('The selected file is empty. Choose the original JSON export.');
    if (file.arrayBuffer && typeof TextDecoder !== 'undefined') {
      let bytes;
      try { bytes = await file.arrayBuffer(); }
      catch (error) { throw new Error('The file could not be read. Download it to your device and choose it again.'); }
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch (error) { throw new Error('The file is not valid UTF-8. Export it again as a UTF-8 JSON file.'); }
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = reader.onabort = () => reject(new Error('The file could not be read. Download it to your device and choose it again.'));
      reader.readAsText(file, 'UTF-8');
    });
  }
  window.CharacterImport = { normalizeText, parse, validate, readFile };
})();
