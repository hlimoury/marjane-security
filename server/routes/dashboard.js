const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics (admin only)
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Total supermarkets
    const totalSupermarkets = await pool.query('SELECT COUNT(*) as count FROM supermarkets');

    // Supermarkets per region
    const perRegion = await pool.query(
      'SELECT region, COUNT(*) as count FROM supermarkets GROUP BY region ORDER BY region'
    );

    // Total instances
    const totalInstances = await pool.query('SELECT COUNT(*) as count FROM instances');

    // Recent instances
    const recentInstances = await pool.query(`
      SELECT i.*, s.name as supermarket_name, s.region
      FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    // Characteristics completion per instance (count how many of 8 are filled)
    const tables = ['dispositifs', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'scoring'];
    let totalFilled = 0;
    let totalPossible = 0;

    const instanceCount = await pool.query('SELECT COUNT(*) as count FROM instances');
    totalPossible = parseInt(instanceCount.rows[0].count) * 8;

    for (const table of tables) {
      const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      totalFilled += parseInt(count.rows[0].count);
    }

    res.json({
      total_supermarkets: parseInt(totalSupermarkets.rows[0].count),
      supermarkets_per_region: perRegion.rows,
      total_instances: parseInt(totalInstances.rows[0].count),
      recent_instances: recentInstances.rows,
      completion: {
        filled: totalFilled,
        total: totalPossible,
        percentage: totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Erreur dashboard:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
