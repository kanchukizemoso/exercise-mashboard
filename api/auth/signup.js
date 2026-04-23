const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, ensureSchema } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  await ensureSchema();
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = getPool();
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email.toLowerCase(), password_hash]
  );
  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, email: user.email });
};
