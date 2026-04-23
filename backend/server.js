require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      duration INTEGER NOT NULL,
      calories INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      logged_time VARCHAR(10),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Database ready.');
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- Auth routes ---

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email.toLowerCase(), password_hash]
  );
  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, email: user.email });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email });
});

// --- Exercise routes (protected) ---

app.get('/api/exercises', authMiddleware, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    'SELECT * FROM exercises WHERE user_id = $1 AND date = $2 ORDER BY created_at ASC',
    [req.user.id, date]
  );
  res.json(result.rows);
});

app.get('/api/exercises/week', authMiddleware, async (req, res) => {
  const result = await pool.query(`
    SELECT date, SUM(duration) AS total_duration, SUM(calories) AS total_calories
    FROM exercises
    WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY date ORDER BY date ASC
  `, [req.user.id]);
  res.json(result.rows);
});

app.post('/api/exercises', authMiddleware, async (req, res) => {
  const { type, duration, calories, notes, logged_time, date } = req.body;
  if (!type || !duration) return res.status(400).json({ error: 'type and duration are required' });

  const result = await pool.query(
    `INSERT INTO exercises (user_id, type, duration, calories, notes, logged_time, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, type, duration, calories || 0, notes || '', logged_time || '', date || new Date().toISOString().slice(0, 10)]
  );
  res.status(201).json(result.rows[0]);
});

app.delete('/api/exercises/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

initDb()
  .then(() => app.listen(port, () => console.log(`Server running on http://localhost:${port}`)))
  .catch(err => { console.error('Failed to connect to DB:', err.message); process.exit(1); });
