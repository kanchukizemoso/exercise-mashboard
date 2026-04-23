const { getPool, ensureSchema } = require('../../lib/db');
const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  await ensureSchema();
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const db = getPool();

  if (req.method === 'GET') {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await db.query(
      'SELECT * FROM exercises WHERE user_id = $1 AND date = $2 ORDER BY created_at ASC',
      [user.id, date]
    );
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { type, duration, calories, notes, logged_time, date } = req.body;
    if (!type || !duration) return res.status(400).json({ error: 'type and duration are required' });

    const result = await db.query(
      `INSERT INTO exercises (user_id, type, duration, calories, notes, logged_time, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user.id, type, duration, calories || 0, notes || '', logged_time || '', date || new Date().toISOString().slice(0, 10)]
    );
    return res.status(201).json(result.rows[0]);
  }

  res.status(405).end();
};
