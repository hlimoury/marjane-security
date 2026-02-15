const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, region: user.region },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        region: user.region
      }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, region FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur /me:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
