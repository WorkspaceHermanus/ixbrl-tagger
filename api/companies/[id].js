const db = require('../../lib/db');
const { requireAuth } = require('../../lib/guard');

function toClientShape(row, includeSession) {
  const out = {
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
  if (includeSession) out.session = row.session;
  return out;
}

module.exports = requireAuth(async (req, res) => {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query(
      'SELECT * FROM companies WHERE id = $1 AND account_id = $2',
      [id, req.auth.accountId]
    );
    if (!rows.length) { res.status(404).json({ error: 'Not found' }); return; }
    res.status(200).json(toClientShape(rows[0], true));
    return;
  }

  if (req.method === 'PUT') {
    const { entity, taxKey, ps, pe, ccy, dec, tagCount, tags, rows: dataRows } = req.body || {};
    const session = { entity, taxKey, ps, pe, ccy, dec, tags: tags || [], rows: dataRows || [] };
    const status = (tagCount || 0) > 0 ? 'in_progress' : 'draft';

    const { rows } = await db.query(
      `UPDATE companies
       SET session = $1, tag_count = $2, status = $3, name = COALESCE($4, name), updated_at = now()
       WHERE id = $5 AND account_id = $6
       RETURNING *`,
      [JSON.stringify(session), tagCount || 0, status, entity || null, id, req.auth.accountId]
    );
    if (!rows.length) { res.status(404).json({ error: 'Not found' }); return; }
    res.status(200).json(toClientShape(rows[0], true));
    return;
  }

  if (req.method === 'DELETE') {
    const { rowCount } = await db.query(
      'DELETE FROM companies WHERE id = $1 AND account_id = $2',
      [id, req.auth.accountId]
    );
    if (!rowCount) { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
