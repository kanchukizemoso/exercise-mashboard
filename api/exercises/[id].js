const { getPool, ensureSchema } = require('../../lib/db');
const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).end();

  await ensureSchema();
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.query;
  const db = getPool();
  await db.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [id, user.id]);
  res.json({ success: true });
};
