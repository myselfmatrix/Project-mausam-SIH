const jwt = require('jsonwebtoken');

/**
 * Verifies the `Authorization: Bearer <token>` header and puts the caller's id
 * on req.userId.
 *
 * `optional: true` lets a route accept both signed-in and anonymous callers —
 * it attaches req.userId when a valid token is present and simply moves on
 * when it isn't.
 */
function requireAuth({ optional = false } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (!token || scheme !== 'Bearer') {
      if (optional) return next();
      return res.status(401).json({ error: 'Sign in to continue.' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload.sub;
      req.userEmail = payload.email;
      return next();
    } catch (err) {
      if (optional) return next();
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Your session expired. Please sign in again.' : 'Invalid session.'
      });
    }
  };
}

module.exports = { requireAuth };
