const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOrMain } = require('../middleware/auth');

const router = express.Router();

// GET /api/supermarkets - List supermarkets (filtered by region for region users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;

    if (req.user.role === 'region') {
      // Region users can only see their own region
      result = await pool.query(
        'SELECT * FROM supermarkets WHERE region = $1 ORDER BY name',
        [req.user.region]
      );
    } else {
      // Admin and main see everything
      result = await pool.query('SELECT * FROM supermarkets ORDER BY region, name');
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Erreur liste supermarches:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/supermarkets/:id - Get single supermarket
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM supermarkets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supermarche non trouve' });
    }

    const supermarket = result.rows[0];

    // Region users can only see their own region
    if (req.user.role === 'region' && supermarket.region !== req.user.region) {
      return res.status(403).json({ message: 'Acces refuse' });
    }

    res.json(supermarket);
  } catch (err) {
    console.error('Erreur detail supermarche:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/supermarkets - Create supermarket (admin/main only)
router.post('/', authMiddleware, adminOrMain, async (req, res) => {
  try {
    const { name, region } = req.body;

    if (!name || !region) {
      return res.status(400).json({ message: 'Nom et region requis' });
    }

    const validRegions = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];
    if (!validRegions.includes(region)) {
      return res.status(400).json({ message: 'Region invalide' });
    }

    const result = await pool.query(
      'INSERT INTO supermarkets (name, region) VALUES ($1, $2) RETURNING *',
      [name, region]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur creation supermarche:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/supermarkets/:id - Update supermarket (admin/main only)
router.put('/:id', authMiddleware, adminOrMain, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region } = req.body;

    if (!name || !region) {
      return res.status(400).json({ message: 'Nom et region requis' });
    }

    const validRegions = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];
    if (!validRegions.includes(region)) {
      return res.status(400).json({ message: 'Region invalide' });
    }

    const result = await pool.query(
      'UPDATE supermarkets SET name = $1, region = $2 WHERE id = $3 RETURNING *',
      [name, region, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supermarche non trouve' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur modification supermarche:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/supermarkets/:id - Delete supermarket (admin/main only)
router.delete('/:id', authMiddleware, adminOrMain, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM supermarkets WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supermarche non trouve' });
    }

    res.json({ message: 'Supermarche supprime' });
  } catch (err) {
    console.error('Erreur suppression supermarche:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
