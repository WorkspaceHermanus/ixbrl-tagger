const { resolveSession } = require('./auth');

// Wraps an API handler so it only runs when a valid session cookie is present.
// Attaches req.auth = { sessionId, userId, accountId } for the handler to use —
// every DB query downstream MUST filter by req.auth.accountId.
function requireAuth(handler) {
  return async (req, res) => {
    const session = await resolveSession(req);
    if (!session) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    req.auth = session;
    return handler(req, res);
  };
}

module.exports = { requireAuth };
