/*
  Per-IP request caps.

  Every upstream this app calls is a free tier with a real ceiling behind it:
  Open-Meteo's forecast quota is counted per day, Nominatim's usage policy
  asks for at most one request a second. Caching absorbs repeat lookups, but
  caching only helps when the *coordinates* repeat - a script that requests a
  thousand different points in a loop generates a thousand real cache misses
  and a thousand real upstream calls, and nothing before this file stood in
  its way. A single unmetered client could have spent the whole day's weather
  quota in well under a minute.

  The numbers below are set from how a person actually uses the dashboard,
  not from a guess: switching between several cities and personas in one
  session comes nowhere near these limits (measured within this project at a
  handful of requests per minute even in a fast manual session), so a real
  user never notices this exists. A loop does.
*/

const rateLimit = require('express-rate-limit');

const respondWithReason = (reason) => (req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please slow down and try again shortly.',
    reason,
  });
};

/*
  Weather lookups: generous enough that rapidly switching cities, personas
  and the location picker in one sitting is never throttled, tight enough
  that a loop over many coordinates hits a wall in seconds rather than
  minutes.
*/
const weatherLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  // A distinct reason from Open-Meteo's own 'rateLimited': that one resets
  // overnight and says so, this one resets in under a minute, and reusing
  // the daily-quota copy here would tell someone to wait for the wrong
  // clock.
  handler: respondWithReason('tooFast'),
});

/*
  Geocoding: Nominatim's own usage policy is roughly one request a second per
  client. This is deliberately the tightest of the three, both to respect
  that policy on their servers and because our own geo/geocoding.js already
  serialises outbound Nominatim calls - a burst here would just queue up
  behind that serialiser rather than actually going anywhere faster.
*/
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respondWithReason('tooFast'),
});

/*
  Auth: a different threat entirely - not quota exhaustion but credential
  stuffing and brute-force login guessing. Tight per-IP, since a real person
  signing in or trying a handful of password attempts never approaches this,
  while a script guessing passwords does.
*/
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respondWithReason('rateLimited'),
});

module.exports = { weatherLimiter, geoLimiter, authLimiter };
