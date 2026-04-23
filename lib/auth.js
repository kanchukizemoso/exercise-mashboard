const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyToken };
