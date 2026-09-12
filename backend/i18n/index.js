const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LANGUAGES, DEFAULT_LANGUAGE, normalizeLanguage } = require('./languages');

/*
  Translation catalogs.

  Everything is loaded, flattened, checked against English and merged once at
  boot. Two reasons for doing the work up front rather than per request:

  1. A request can never fail on a missing or malformed file — if a catalog is
     broken the server says so in the startup log and serves English for that
     language instead of throwing at request time.
  2. Every catalog is completed from English before it is cached, so a key that
     hasn't been translated yet renders as readable English rather than as a
     raw dotted key on screen.
*/

const CATALOG_DIR = path.join(__dirname, 'catalogs');

/** { a: { b: 'x' } } -> { 'a.b': 'x' }. Non-string leaves are dropped. */
function flatten(node, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else if (typeof value === 'string') {
      out[full] = value;
    }
  }
  return out;
}

function readCatalog(code) {
  const file = path.join(CATALOG_DIR, `${code}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  return flatten(JSON.parse(raw));
}

function etagOf(payload) {
  return `"${crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 16)}"`;
}

const catalogs = new Map();
const meta = new Map();

function load() {
  // English first: it is the key set every other catalog is measured against,
  // and the fallback all of them are completed from.
  let english;
  try {
    english = readCatalog(DEFAULT_LANGUAGE);
  } catch (err) {
    // Without English there is no fallback and no schema, so this one really
    // is fatal — better to fail at boot than to serve an empty UI.
    throw new Error(`i18n: base catalog "${DEFAULT_LANGUAGE}.json" could not be loaded: ${err.message}`);
  }

  const englishKeys = Object.keys(english);

  for (const lang of LANGUAGES) {
    let strings = english;
    let translated = englishKeys.length;
    let unknown = [];
    let missing = [];

    if (lang.code !== DEFAULT_LANGUAGE) {
      try {
        const own = readCatalog(lang.code);
        unknown = Object.keys(own).filter((k) => !(k in english));
        missing = englishKeys.filter((k) => !(k in own));
        translated = englishKeys.length - missing.length;
        // English underneath, translations on top: the result always has the
        // full key set.
        strings = { ...english, ...own };
      } catch (err) {
        console.warn(`i18n: ${lang.code}.json unavailable (${err.message}) — serving English for "${lang.code}"`);
        translated = 0;
        missing = englishKeys;
      }
    }

    const coverage = englishKeys.length ? Math.round((translated / englishKeys.length) * 100) : 0;
    const payload = { language: lang.code, dir: lang.dir, coverage, strings };

    catalogs.set(lang.code, payload);
    meta.set(lang.code, { ...lang, coverage, missing, unknown, etag: etagOf(payload) });

    if (missing.length && lang.code !== DEFAULT_LANGUAGE) {
      console.warn(
        `i18n: ${lang.code} is ${coverage}% translated — ${missing.length} key(s) fall back to English` +
          ` (first few: ${missing.slice(0, 5).join(', ')})`,
      );
    }
    if (unknown.length) {
      console.warn(`i18n: ${lang.code} has ${unknown.length} key(s) not present in English: ${unknown.slice(0, 5).join(', ')}`);
    }
  }

  console.log(
    `i18n: ${LANGUAGES.length} languages ready (${englishKeys.length} keys) — ` +
      LANGUAGES.map((l) => `${l.code} ${meta.get(l.code).coverage}%`).join(', '),
  );
}

load();

/** Never throws and never returns undefined — unknown codes get English. */
function getCatalog(code) {
  return catalogs.get(normalizeLanguage(code)) || catalogs.get(DEFAULT_LANGUAGE);
}

function getEtag(code) {
  const entry = meta.get(normalizeLanguage(code));
  return entry ? entry.etag : undefined;
}

function listLanguages() {
  return LANGUAGES.map((lang) => {
    const entry = meta.get(lang.code);
    return {
      code: lang.code,
      label: lang.label,
      englishName: lang.englishName,
      dir: lang.dir,
      numerals: lang.numerals,
      coverage: entry ? entry.coverage : 0,
    };
  });
}

module.exports = { getCatalog, getEtag, listLanguages, reload: load };
