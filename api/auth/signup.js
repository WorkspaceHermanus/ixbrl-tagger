const db = require('../../lib/db');
const { hashPassword, createSession, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const pool = db.getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id',
      [email, passwordHash, name]
    );
    const userId = userRes.rows[0].id;
    const accountRes = await client.query(
      'INSERT INTO accounts (name) VALUES ($1) RETURNING id',
      [`${name}'s workspace`]
    );
    const accountId = accountRes.rows[0].id;
    await client.query(
      'INSERT INTO account_members (account_id, user_id, role) VALUES ($1,$2,$3)',
      [accountId, userId, 'owner']
    );
    await client.query('COMMIT');

    const token = await createSession(userId, accountId);
    setSessionCookie(res, token);
    res.status(200).json({ name, email });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
