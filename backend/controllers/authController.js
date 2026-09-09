const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_TTL = '7d';

function issueToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Loud in dev, so a missing secret is never silently skipped in prod.
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ sub: String(user._id), email: user.email }, secret, {
    expiresIn: TOKEN_TTL
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.signup = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are all required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'That email address doesn’t look right.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'That email is already registered. Try signing in instead.' });
    }

    const user = new User({ name, email, password });
    await user.save();

    // Sign the new account straight in — bouncing someone to a login form
    // right after they chose a password is pure friction.
    res.status(201).json({
      message: 'Account created',
      token: issueToken(user),
      ...user.toPublicJSON()
    });
  } catch (error) {
    // Duplicate key can still race past the findOne check.
    if (error.code === 11000) {
      return res.status(409).json({ error: 'That email is already registered. Try signing in instead.' });
    }
    if (error.name === 'ValidationError') {
      const first = Object.values(error.errors)[0];
      return res.status(400).json({ error: first?.message || 'Those details aren’t valid.' });
    }
    console.error('Signup failed:', error);
    res.status(500).json({ error: 'Could not create the account. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are both required.' });
    }

    // password has select:false on the schema, so ask for it explicitly.
    const user = await User.findOne({ email }).select('+password');

    // Same message and shape for "no such user" and "wrong password" — telling
    // the difference apart is an account-enumeration gift.
    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const { ok } = await user.verifyPassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    res.json({
      message: 'Signed in',
      token: issueToken(user),
      ...user.toPublicJSON()
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Could not sign in. Please try again.' });
  }
};

/** Returns the caller's own account. Requires the auth middleware. */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json(user.toPublicJSON());
  } catch (error) {
    console.error('Fetching account failed:', error);
    res.status(500).json({ error: 'Could not load the account.' });
  }
};
