const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const checkSupermarketAccess = async (supermarketId, user) => {
  const result = await pool.query('SELECT * FROM supermarkets WHERE id = $1', [supermarketId]);
  if (result.rows.length === 0) return { error: 'Supermarche non trouve', status: 404 };
  if ((user.role === 'region' || user.role === 'city') && result.rows[0].region !== user.region) {
    return { error: 'Acces refuse', status: 403 };
  }
  return { supermarket: result.rows[0] };
};

// GET /api/supermarket-scoring/:supermarketId
router.get('/:supermarketId', authMiddleware, async (req, res) => {
  if (req.user.role === 'city') {
    return res.status(403).json({ message: 'Acces refuse' });
  }
  try {
    const { supermarketId } = req.params;

    const access = await checkSupermarketAccess(supermarketId, req.user);
    if (access.error) return res.status(access.status).json({ message: access.error });

    const result = await pool.query(
      'SELECT * FROM supermarket_scoring WHERE supermarket_id = $1',
      [supermarketId]
    );

    if (result.rows.length === 0) {
      return res.json({ supermarket_id: parseInt(supermarketId), data: {}, exists: false });
    }

    res.json({ ...result.rows[0], exists: true });
  } catch (err) {
    console.error('Erreur get supermarket scoring:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/supermarket-scoring/:supermarketId
router.post('/:supermarketId', authMiddleware, async (req, res) => {
  if (req.user.role === 'city') {
    return res.status(403).json({ message: 'Acces refuse' });
  }
  try {
    const { supermarketId } = req.params;
    const { data } = req.body;

    const access = await checkSupermarketAccess(supermarketId, req.user);
    if (access.error) return res.status(access.status).json({ message: access.error });

    const existing = await pool.query(
      'SELECT id FROM supermarket_scoring WHERE supermarket_id = $1',
      [supermarketId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE supermarket_scoring SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE supermarket_id = $2 RETURNING *',
        [JSON.stringify(data), supermarketId]
      );
    } else {
      result = await pool.query(
        'INSERT INTO supermarket_scoring (supermarket_id, data) VALUES ($1, $2) RETURNING *',
        [supermarketId, JSON.stringify(data)]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur save supermarket scoring:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
