const db = require('../../lib/db');
const { verifyPassword, createSession, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const { rows } = await db.query(
    'SELECT id, name, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  const ok = user && await verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const memberRes = await db.query(
    'SELECT account_id FROM account_members WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [user.id]
  );
  const accountId = memberRes.rows[0] && memberRes.rows[0].account_id;
  if (!accountId) {
    res.status(500).json({ error: 'Account not found for this user' });
    return;
  }

  const token = await createSession(user.id, accountId);
  setSessionCookie(res, token);
  res.status(200).json({ name: user.name, email });
};
