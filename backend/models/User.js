const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('../i18n/languages');

const SALT_ROUNDS = 10;

/*
  A location the user has saved.

  Coordinates are required and validated: a saved location whose lat/lon is
  missing or out of range cannot be turned into a forecast, so it is rejected
  at write time rather than discovered as a blank card later.

  `label` and `labelKey` are two ways to name the same thing and only one is
  ever set. A label the user typed ("Nani's house") is theirs and is stored
  verbatim; the four seeded categories store a catalog key instead, so that
  "Home" appears as "घर" for a Hindi reader rather than as English text the
  user never chose.
*/
const savedLocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  region: { type: String, default: '', trim: true, maxlength: 120 },
  country: { type: String, default: '', trim: true, maxlength: 120 },
  countryCode: { type: String, default: '', uppercase: true, maxlength: 2 },
  label: { type: String, default: '', trim: true, maxlength: 40 },
  labelKey: { type: String, default: '', trim: true, maxlength: 60 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lon: { type: Number, required: true, min: -180, max: 180 },
  timezone: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    // Never ship the hash to a client by accident — it has to be asked for
    // explicitly with .select('+password').
    select: false
  },
  selectedPersona: {
    type: String,
    enum: ['health', 'fitness', 'beach', 'travel', 'parent', 'gardener', 'commuter', 'event'],
    default: null
  },
  location: {
    type: String,
    default: null
  },
  // Display language. The enum comes from i18n/languages.js so adding a
  // translation never means remembering to edit the schema too.
  language: {
    type: String,
    enum: LANGUAGE_CODES,
    default: DEFAULT_LANGUAGE
  },
  savedLocations: [savedLocationSchema],

  /*
    The location the dashboard is currently showing.

    Stored with its coordinates, not just its name, because the weather
    upstream only accepts coordinates - keeping just "Lucknow" would mean
    re-geocoding the name on every sign-in, which both costs a request and
    quietly relocates anyone who picked a specific point rather than a city
    centre. The legacy `location` string is kept in step with `name` so older
    clients reading it keep working.
  */
  activeLocation: {
    name: { type: String, default: null },
    region: { type: String, default: '' },
    country: { type: String, default: '' },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    timezone: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash on the way in, so no controller can forget to.
// Note: an async pre-hook must NOT take `next` — Mongoose awaits the returned
// promise instead of passing a callback, so `next` would be undefined.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

const BCRYPT_PREFIX = /^\$2[aby]\$/;

/**
 * Verifies a candidate password.
 *
 * Accounts created before hashing was introduced still hold a plaintext
 * password, so those are compared directly and then transparently upgraded to
 * a hash on the next successful login. Returns { ok, migrated }.
 */
userSchema.methods.verifyPassword = async function verifyPassword(candidate) {
  if (BCRYPT_PREFIX.test(this.password)) {
    const ok = await bcrypt.compare(candidate, this.password);
    return { ok, migrated: false };
  }

  const ok = this.password === candidate;
  if (ok) {
    this.password = candidate; // pre-save hook hashes it
    await this.save();
  }
  return { ok, migrated: ok };
};

/*
  Accounts created before saved locations carried coordinates hold them under
  a nested `coordinates` object. Reading through this mapper means those rows
  still render instead of appearing as cards with no position - and it costs
  nothing once no such rows remain.
*/
function publicLocation(entry) {
  const lat = entry.lat ?? entry.coordinates?.lat ?? null;
  const lon = entry.lon ?? entry.coordinates?.lon ?? null;
  return {
    id: String(entry._id),
    name: entry.name,
    region: entry.region || '',
    country: entry.country || '',
    countryCode: entry.countryCode || '',
    label: entry.label || '',
    labelKey: entry.labelKey || '',
    lat,
    lon,
    timezone: entry.timezone || '',
    addedAt: entry.addedAt || null
  };
}

userSchema.methods.publicLocations = function publicLocations() {
  return (this.savedLocations || [])
    .map(publicLocation)
    // A row with no usable position cannot produce a forecast, so it is not
    // offered as something to select.
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lon));
};

/** The shape every auth response returns - never includes the password. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  const active = this.activeLocation || {};
  return {
    userId: this._id,
    name: this.name,
    email: this.email,
    persona: this.selectedPersona,
    location: this.location,
    activeLocation: Number.isFinite(active.lat) && Number.isFinite(active.lon)
      ? {
        name: active.name,
        region: active.region || '',
        country: active.country || '',
        lat: active.lat,
        lon: active.lon,
        timezone: active.timezone || ''
      }
      : null,
    savedLocations: this.publicLocations(),
    language: this.language || DEFAULT_LANGUAGE
  };
};

module.exports = mongoose.model('User', userSchema);
