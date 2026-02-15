const jwt = require('jsonwebtoken');

// Verify JWT token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// Check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acces refuse - admin uniquement' });
  }
  next();
};

// Check if user is admin or main
const adminOrMain = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'main') {
    return res.status(403).json({ message: 'Acces refuse' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly, adminOrMain };
