const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, ensureSchema } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  await ensureSchema();
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getPool();
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email });
};
