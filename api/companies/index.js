const db = require('../../lib/db');
const { requireAuth } = require('../../lib/guard');

function toClientShape(row) {
  return {
    id: row.id,
    name: row.name,
    regNumber: row.reg_number,
    yearEnd: row.year_end,
    framework: row.framework,
    status: row.status,
    tagCount: row.tag_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    // List only — deliberately excludes the heavy `session` JSONB blob.
    const { rows } = await db.query(
      `SELECT id, name, reg_number, year_end, framework, status, tag_count, created_at, updated_at
       FROM companies WHERE account_id = $1 ORDER BY updated_at DESC`,
      [req.auth.accountId]
    );
    res.status(200).json(rows.map(toClientShape));
    return;
  }

  if (req.method === 'POST') {
    const { id, name, regNumber, yearEnd, framework } = req.body || {};
    if (!id || !name) { res.status(400).json({ error: 'id and name are required' }); return; }
    const { rows } = await db.query(
      `INSERT INTO companies (id, account_id, name, reg_number, year_end, framework)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, reg_number, year_end, framework, status, tag_count, created_at, updated_at`,
      [id, req.auth.accountId, name, regNumber || null, yearEnd || null, framework || null]
    );
    res.status(201).json(toClientShape(rows[0]));
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
