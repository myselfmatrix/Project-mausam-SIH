const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

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
  savedLocations: [{
    name: String,
    coordinates: {
      lat: Number,
      lon: Number
    }
  }],
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

/** The shape every auth response returns — never includes the password. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    userId: this._id,
    name: this.name,
    email: this.email,
    persona: this.selectedPersona,
    location: this.location
  };
};

module.exports = mongoose.model('User', userSchema);
