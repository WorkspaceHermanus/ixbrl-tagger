const db = require('../../lib/db');
const { resolveSession } = require('../../lib/auth');

module.exports = async (req, res) => {
  const session = await resolveSession(req);
  if (!session) { res.status(401).json({ error: 'Not signed in' }); return; }

  const { rows } = await db.query('SELECT name, email FROM users WHERE id = $1', [session.userId]);
  const user = rows[0];
  if (!user) { res.status(401).json({ error: 'Not signed in' }); return; }

  res.status(200).json({ name: user.name, email: user.email });
};
