const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    // 1) All instance-level data with category entry counts in one query
    const instanceData = await pool.query(`
      SELECT
        i.id as instance_id, i.month, i.year, i.supermarket_id, i.created_at,
        s.name as supermarket_name, s.region,
        COALESCE(jsonb_array_length(interp.data->'entries'), 0) as interpellations_count,
        COALESCE(jsonb_array_length(acc.data->'entries'), 0) as accidents_count,
        COALESCE(jsonb_array_length(ai.data->'entries'), 0) as autres_incidents_count,
        COALESCE(jsonb_array_length(form.data->'entries'), 0) as formations_count,
        COALESCE(jsonb_array_length(rec.data->'entries'), 0) as reclamations_count,
        COALESCE(jsonb_array_length(ano.data->'entries'), 0) as anomalies_count,
        CASE WHEN interp.id IS NOT NULL THEN 1 ELSE 0 END as has_interpellations,
        CASE WHEN acc.id IS NOT NULL THEN 1 ELSE 0 END as has_accidents,
        CASE WHEN ai.id IS NOT NULL THEN 1 ELSE 0 END as has_autres_incidents,
        CASE WHEN form.id IS NOT NULL THEN 1 ELSE 0 END as has_formations,
        CASE WHEN rec.id IS NOT NULL THEN 1 ELSE 0 END as has_reclamations,
        CASE WHEN ano.id IS NOT NULL THEN 1 ELSE 0 END as has_anomalies
      FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      LEFT JOIN interpellations interp ON i.id = interp.instance_id
      LEFT JOIN accidents acc ON i.id = acc.instance_id
      LEFT JOIN autres_incidents ai ON i.id = ai.instance_id
      LEFT JOIN formations form ON i.id = form.instance_id
      LEFT JOIN reclamations rec ON i.id = rec.instance_id
      LEFT JOIN anomalies ano ON i.id = ano.instance_id
      ORDER BY i.year DESC, i.month DESC
    `);

    // 2) Supermarket-level data (dispositifs & scoring)
    const supermarketData = await pool.query(`
      SELECT
        s.id, s.name, s.region,
        CASE WHEN sd.id IS NOT NULL THEN 1 ELSE 0 END as has_dispositifs,
        CASE WHEN ss.id IS NOT NULL THEN 1 ELSE 0 END as has_scoring
      FROM supermarkets s
      LEFT JOIN supermarket_dispositifs sd ON s.id = sd.supermarket_id
      LEFT JOIN supermarket_scoring ss ON s.id = ss.supermarket_id
      ORDER BY s.region, s.name
    `);

    // 3) Interpellation details for rayon breakdown
    const interpDetails = await pool.query(`
      SELECT interp.data
      FROM interpellations interp
      JOIN instances i ON interp.instance_id = i.id
    `);

    // Build rayon stats from interpellation entries
    const rayonStats = {};
    interpDetails.rows.forEach(row => {
      const entries = row.data?.entries || [];
      entries.forEach(entry => {
        const rayons = entry.rayons || (entry.rayon ? [entry.rayon] : []);
        rayons.forEach(r => {
          rayonStats[r] = (rayonStats[r] || 0) + 1;
        });
      });
    });

    // 4) Accident details for type breakdown
    const accidentDetails = await pool.query(`
      SELECT acc.data
      FROM accidents acc
    `);
    const accidentTypeStats = {};
    accidentDetails.rows.forEach(row => {
      const entries = row.data?.entries || [];
      entries.forEach(entry => {
        const t = entry.type || 'Autre';
        accidentTypeStats[t] = (accidentTypeStats[t] || 0) + 1;
      });
    });

    // 5) Anomalies details for category breakdown
    const anomalyDetails = await pool.query(`
      SELECT ano.data
      FROM anomalies ano
    `);
    const anomalyCategoryStats = {};
    anomalyDetails.rows.forEach(row => {
      const entries = row.data?.entries || [];
      entries.forEach(entry => {
        const cat = entry.category || 'Autre';
        anomalyCategoryStats[cat] = (anomalyCategoryStats[cat] || 0) + 1;
      });
    });

    res.json({
      instances: instanceData.rows,
      supermarkets: supermarketData.rows,
      rayon_stats: rayonStats,
      accident_type_stats: accidentTypeStats,
      anomaly_category_stats: anomalyCategoryStats,
    });
  } catch (err) {
    console.error('Erreur dashboard:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/dashboard/category/:type/subcategories - Get sub-category statistics
router.get('/category/:type/subcategories', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { type } = req.params;
    const { region, year, month } = req.query;
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }

    let query = `
      SELECT t.data, i.id as instance_id, i.month, i.year, i.supermarket_id,
             s.name as supermarket_name, s.region
      FROM ${type} t
      JOIN instances i ON t.instance_id = i.id
      JOIN supermarkets s ON i.supermarket_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (region) {
      query += ` AND s.region = $${paramIndex++}`;
      params.push(region);
    }
    if (year) {
      query += ` AND i.year = $${paramIndex++}`;
      params.push(parseInt(year));
    }
    if (month) {
      query += ` AND i.month = $${paramIndex++}`;
      params.push(parseInt(month));
    }

    const result = await pool.query(query, params);

    const subCategoryStats = {};
    const supermarketsBySubCategory = {};

    result.rows.forEach(row => {
      const entries = row.data?.entries || [];
      entries.forEach(entry => {
        let subCategories = [];

        if (type === 'anomalies') {
          subCategories = entry.sous_categories || [];
        } else if (type === 'interpellations') {
          subCategories = entry.rayons || (entry.rayon ? [entry.rayon] : []);
        } else if (type === 'accidents') {
          subCategories = entry.cause ? [entry.cause] : [];
        } else if (type === 'autres_incidents') {
          subCategories = entry.type ? [entry.type] : [];
        } else if (type === 'formations') {
          subCategories = entry.type ? [entry.type] : [];
        } else if (type === 'reclamations') {
          subCategories = entry.motif ? [entry.motif] : [];
        }

        subCategories.forEach(sub => {
          if (!sub) return;
          subCategoryStats[sub] = (subCategoryStats[sub] || 0) + 1;

          if (!supermarketsBySubCategory[sub]) {
            supermarketsBySubCategory[sub] = new Set();
          }
          supermarketsBySubCategory[sub].add(row.supermarket_id);
        });
      });
    });

    const subCategoriesArray = Object.entries(subCategoryStats)
      .map(([name, count]) => ({
        name,
        count,
        supermarketCount: supermarketsBySubCategory[name]?.size || 0
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      type,
      total: subCategoriesArray.reduce((sum, s) => sum + s.count, 0),
      subCategories: subCategoriesArray
    });
  } catch (err) {
    console.error('Erreur dashboard subcategories:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/dashboard/category/:type/subcategory/:subcat - Get supermarkets for a sub-category
router.get('/category/:type/subcategory/:subcat', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { type, subcat } = req.params;
    const { region, year, month } = req.query;
    const decodedSubcat = decodeURIComponent(subcat);
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }

    let query = `
      SELECT t.data, i.id as instance_id, i.month, i.year, i.supermarket_id,
             s.name as supermarket_name, s.region
      FROM ${type} t
      JOIN instances i ON t.instance_id = i.id
      JOIN supermarkets s ON i.supermarket_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (region) {
      query += ` AND s.region = $${paramIndex++}`;
      params.push(region);
    }
    if (year) {
      query += ` AND i.year = $${paramIndex++}`;
      params.push(parseInt(year));
    }
    if (month) {
      query += ` AND i.month = $${paramIndex++}`;
      params.push(parseInt(month));
    }

    query += ` ORDER BY s.name, i.year DESC, i.month DESC`;

    const result = await pool.query(query, params);

    const supermarketMap = {};
    const entries = [];

    result.rows.forEach(row => {
      const rowEntries = row.data?.entries || [];
      rowEntries.forEach(entry => {
        let subCategories = [];

        if (type === 'anomalies') {
          subCategories = entry.sous_categories || [];
        } else if (type === 'interpellations') {
          subCategories = entry.rayons || (entry.rayon ? [entry.rayon] : []);
        } else if (type === 'accidents') {
          subCategories = entry.cause ? [entry.cause] : [];
        } else if (type === 'autres_incidents') {
          subCategories = entry.type ? [entry.type] : [];
        } else if (type === 'formations') {
          subCategories = entry.type ? [entry.type] : [];
        } else if (type === 'reclamations') {
          subCategories = entry.motif ? [entry.motif] : [];
        }

        if (subCategories.includes(decodedSubcat)) {
          entries.push({
            ...entry,
            instance_id: row.instance_id,
            supermarket_id: row.supermarket_id,
            supermarket_name: row.supermarket_name,
            region: row.region,
            month: row.month,
            year: row.year,
          });

          if (!supermarketMap[row.supermarket_id]) {
            supermarketMap[row.supermarket_id] = {
              id: row.supermarket_id,
              name: row.supermarket_name,
              region: row.region,
              count: 0,
              instances: new Set()
            };
          }
          supermarketMap[row.supermarket_id].count++;
          supermarketMap[row.supermarket_id].instances.add(`${row.month}/${row.year}`);
        }
      });
    });

    const supermarkets = Object.values(supermarketMap).map(sm => ({
      ...sm,
      instances: Array.from(sm.instances)
    })).sort((a, b) => b.count - a.count);

    res.json({
      type,
      subCategory: decodedSubcat,
      totalEntries: entries.length,
      supermarkets,
      entries
    });
  } catch (err) {
    console.error('Erreur dashboard subcategory detail:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/dashboard/category/:type - Get all entries for a category with full context
router.get('/category/:type', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }

    const result = await pool.query(`
      SELECT t.data, i.id as instance_id, i.month, i.year, i.supermarket_id,
             s.name as supermarket_name, s.region
      FROM ${type} t
      JOIN instances i ON t.instance_id = i.id
      JOIN supermarkets s ON i.supermarket_id = s.id
      ORDER BY i.year DESC, i.month DESC, s.name
    `);

    const entries = [];
    result.rows.forEach(row => {
      const rowEntries = row.data?.entries || [];
      rowEntries.forEach(entry => {
        entries.push({
          ...entry,
          instance_id: row.instance_id,
          supermarket_id: row.supermarket_id,
          supermarket_name: row.supermarket_name,
          region: row.region,
          month: row.month,
          year: row.year,
        });
      });
    });

    res.json(entries);
  } catch (err) {
    console.error('Erreur dashboard category:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
