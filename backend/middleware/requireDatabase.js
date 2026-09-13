const { isDatabaseReady } = require('../config/database');

/*
  Guards the routes that genuinely need MongoDB.

  The server now starts and serves weather without a database, so these routes
  have to say clearly why they cannot help rather than failing with a driver
  timeout thirty seconds later. 503 with a Retry-After is the honest answer:
  the request was valid, the dependency is temporarily gone, try again.
*/
module.exports = function requireDatabase(req, res, next) {
  if (isDatabaseReady()) return next();
  res.set('Retry-After', '30');
  return res.status(503).json({
    error: 'Accounts are temporarily unavailable. Weather and alerts are unaffected.',
  });
};
