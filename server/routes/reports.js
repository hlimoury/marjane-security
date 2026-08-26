const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/reports/send - Send report to admin
router.post('/send', authMiddleware, async (req, res) => {
  if (req.user.role === 'city' || req.user.role === 'demo') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const { reportData, periodLabel, categories, supermarketCount } = req.body;

    if (!reportData || !categories || categories.length === 0) {
      return res.status(400).json({ message: 'Données du rapport requises' });
    }

    const result = await pool.query(
      `INSERT INTO sent_reports (sender_id, sender_username, sender_region, period_label, categories, supermarket_count, report_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [req.user.id, req.user.username, req.user.region || null, periodLabel, categories, supermarketCount || 0, reportData]
    );

    res.status(201).json({
      message: 'Rapport envoyé avec succès',
      id: result.rows[0].id,
      sent_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Erreur envoi rapport:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reports - List reports (admin: all, others: own)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `SELECT id, sender_username, sender_region, period_label, categories,
                      supermarket_count, is_read, is_downloaded, read_at, downloaded_at, created_at
               FROM sent_reports ORDER BY created_at DESC`;
      params = [];
    } else {
      query = `SELECT id, sender_username, sender_region, period_label, categories,
                      supermarket_count, is_read, is_downloaded, read_at, downloaded_at, created_at
               FROM sent_reports WHERE sender_id = $1 ORDER BY created_at DESC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur liste rapports:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reports/unread-count - Unread count for admin badge
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.json({ count: 0 });
    const result = await pool.query('SELECT COUNT(*) as count FROM sent_reports WHERE is_read = FALSE');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// GET /api/reports/:id - Get full report
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM sent_reports WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const report = result.rows[0];

    if (req.user.role !== 'admin' && report.sender_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Mark as read if admin viewing
    if (req.user.role === 'admin' && !report.is_read) {
      await pool.query('UPDATE sent_reports SET is_read = TRUE, read_at = NOW() WHERE id = $1', [id]);
      report.is_read = true;
      report.read_at = new Date();
    }

    res.json(report);
  } catch (err) {
    console.error('Erreur détail rapport:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/reports/:id/downloaded - Mark as downloaded
router.put('/:id/downloaded', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE sent_reports SET is_downloaded = TRUE, downloaded_at = NOW() WHERE id = $1',
      [id]
    );
    res.json({ message: 'Marqué comme téléchargé' });
  } catch (err) {
    console.error('Erreur mise à jour rapport:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reports/last-sent - Last sent report info for current user
router.get('/user/last-sent', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, created_at, is_read, is_downloaded, read_at, downloaded_at
       FROM sent_reports WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.json(null);
  }
});

module.exports = router;
