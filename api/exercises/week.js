const { getPool, ensureSchema } = require('../../lib/db');
const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  await ensureSchema();
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const db = getPool();
  const result = await db.query(`
    SELECT date, SUM(duration) AS total_duration, SUM(calories) AS total_calories
    FROM exercises
    WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY date ORDER BY date ASC
  `, [user.id]);

  res.json(result.rows);
};
