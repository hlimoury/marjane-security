const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Canonical names (accented) for all subcategories across all categories
const CANONICAL_NAMES = {
  // Anomalies - AXE 2
  'Produit abime': 'Produit abîmé',
  'Produit perime': 'Produit périmé',
  'Rupture rayon Marche (Fruits & Legumes)': 'Rupture rayon Marché (Fruits & Légumes)',
  'Rupture rayon Epicerie': 'Rupture rayon Épicerie',
  // Anomalies - AXE 1
  'Dechets visibles en surface de vente': 'Déchets visibles en surface de vente',
  'Tenue des salaries non conforme': 'Tenue des salariés non conforme',
  // Anomalies - AXE 3
  'Allee bloquee': 'Allée bloquée',
  'Palette dangereuse': 'Palette dangereuse',
  'Issue de secours obstruee': 'Issue de secours obstruée',
  'Moyens d\'incendie bloques': 'Moyens d\'incendie bloqués',
  'Reserve non rangee': 'Réserve non rangée',
  'Frigo encombre': 'Frigo encombré',
  'Non port des EPI': 'Non port des EPI',
  'Absence de l\'ADS en poste': 'Absence de l\'ADS en poste',
  // Anomalies - AXE 4
  'Attente critique stand boucherie': 'Attente critique stand boucherie',
  'Attente critique stand fromage': 'Attente critique stand fromage',
  // Accidents
  'Chutes et glissades': 'Chutes et glissades',
  'Scie Electrique boucherie': 'Scie Électrique boucherie',
  // Autres incidents
  'Depart de feu': 'Départ de feu',
  'Defauts electriques': 'Défauts électriques',
  'Equipements de froid': 'Équipements de froid',
  'Equipement de cuisson': 'Équipement de cuisson',
  'Chutes d\'objets': 'Chutes d\'objets',
  // Reclamations
  'Produit impropre (abime, moisi, odeur suspecte, rupture de la chaine du froid)': 'Produit impropre (abîmé, moisi, odeur suspecte, rupture de la chaîne du froid)',
  'Produits endommages (emballage dechire, boite cabossee, etc.)': 'Produits endommagés (emballage déchiré, boîte cabossée, etc.)',
  'Produits non conformes (etiquette, poids indique, etc.)': 'Produits non conformes (étiquette, poids indiqué, etc.)',
  'Erreur de prix en caisse (ecart entre prix affiche et facture)': 'Erreur de prix en caisse (écart entre prix affiché et facture)',
  'Promotions non appliquees ou mal expliquees': 'Promotions non appliquées ou mal expliquées',
  'Hygiene insuffisante (sol, odeurs, toilettes, etc.)': 'Hygiène insuffisante (sol, odeurs, toilettes, etc.)',
  'Hygiene et nuisibles (presence de cafards, moucherons, charancons, rats, souris)': 'Hygiène et nuisibles (présence de cafards, moucherons, charançons, rats, souris)',
  'Securite du magasin (vols, sentiment d\'insecurite)': 'Sécurité du magasin (vols, sentiment d\'insécurité)',
  'Problemes de stationnement (parking plein, securite, produits manquants)': 'Problèmes de stationnement (parking plein, sécurité, produits manquants)',
  'Nuisances sonores (musique trop forte, annonces trop frequentes)': 'Nuisances sonores (musique trop forte, annonces trop fréquentes)',
  'Comportement inapproprie d\'un employe ou agent de securite': 'Comportement inapproprié d\'un employé ou agent de sécurité',
  'Manque de disponibilite du personnel pour aider': 'Manque de disponibilité du personnel pour aider',
  // Controle RM
  'Marche': 'Marché',
  'Controle entrepot': 'Contrôle entrepôt',
  'Controle fournisseurs direct': 'Contrôle fournisseurs direct',
};

// Strip diacritics for comparison
const stripAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Build a fast lookup: stripped → canonical
const CANONICAL_LOOKUP = {};
Object.values(CANONICAL_NAMES).forEach(canonical => {
  CANONICAL_LOOKUP[stripAccents(canonical).toLowerCase()] = canonical;
});
Object.keys(CANONICAL_NAMES).forEach(old => {
  CANONICAL_LOOKUP[stripAccents(old).toLowerCase()] = CANONICAL_NAMES[old];
});

// Normalize a subcategory name: return canonical accented form if known
const normalizeSubCategory = (name) => {
  if (!name) return name;
  if (CANONICAL_NAMES[name]) return CANONICAL_NAMES[name];
  const key = stripAccents(name).toLowerCase();
  if (CANONICAL_LOOKUP[key]) return CANONICAL_LOOKUP[key];
  return name;
};

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
        COALESCE(jsonb_array_length(crm.data->'entries'), 0) as controle_rm_count,
        CASE WHEN interp.id IS NOT NULL THEN 1 ELSE 0 END as has_interpellations,
        CASE WHEN acc.id IS NOT NULL THEN 1 ELSE 0 END as has_accidents,
        CASE WHEN ai.id IS NOT NULL THEN 1 ELSE 0 END as has_autres_incidents,
        CASE WHEN form.id IS NOT NULL THEN 1 ELSE 0 END as has_formations,
        CASE WHEN rec.id IS NOT NULL THEN 1 ELSE 0 END as has_reclamations,
        CASE WHEN ano.id IS NOT NULL THEN 1 ELSE 0 END as has_anomalies,
        CASE WHEN crm.id IS NOT NULL THEN 1 ELSE 0 END as has_controle_rm,
        CASE WHEN disp.id IS NOT NULL AND disp.data IS NOT NULL AND disp.data != '{}'::jsonb THEN 1 ELSE 0 END as has_dispositifs
      FROM instances i
      JOIN supermarkets s ON i.supermarket_id = s.id
      LEFT JOIN interpellations interp ON i.id = interp.instance_id
      LEFT JOIN accidents acc ON i.id = acc.instance_id
      LEFT JOIN autres_incidents ai ON i.id = ai.instance_id
      LEFT JOIN formations form ON i.id = form.instance_id
      LEFT JOIN reclamations rec ON i.id = rec.instance_id
      LEFT JOIN anomalies ano ON i.id = ano.instance_id
      LEFT JOIN controle_rm crm ON i.id = crm.instance_id
      LEFT JOIN dispositifs disp ON i.id = disp.instance_id
      ORDER BY i.year DESC, i.month DESC
    `);

    // 2) Supermarket-level data (scoring)
    const supermarketData = await pool.query(`
      SELECT
        s.id, s.name, s.region,
        CASE WHEN ss.id IS NOT NULL THEN 1 ELSE 0 END as has_scoring
      FROM supermarkets s
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
        rayons.forEach(rawR => {
          const r = normalizeSubCategory(rawR);
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
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'controle_rm'];
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
        } else if (type === 'controle_rm') {
          const typeLabel = entry.type === 'entrepot' ? 'Contrôle entrepôt' : 'Contrôle fournisseurs direct';
          subCategories = entry.sous_type ? [`${typeLabel} — ${entry.sous_type}`] : [];
        }

        subCategories.forEach(rawSub => {
          if (!rawSub) return;
          const sub = normalizeSubCategory(rawSub);
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
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'controle_rm'];
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
        } else if (type === 'controle_rm') {
          const typeLabel = entry.type === 'entrepot' ? 'Contrôle entrepôt' : 'Contrôle fournisseurs direct';
          subCategories = entry.sous_type ? [`${typeLabel} — ${entry.sous_type}`] : [];
        }

        const normalizedSubs = subCategories.map(s => normalizeSubCategory(s));
        if (normalizedSubs.includes(decodedSubcat)) {
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
    const validTypes = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'controle_rm'];
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

// POST /api/dashboard/migrate-accents - One-time migration to fix old data without accents
router.post('/migrate-accents', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tables = ['anomalies', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'controle_rm'];
    let totalUpdated = 0;

    for (const table of tables) {
      const rows = await pool.query(`SELECT id, instance_id, data FROM ${table}`);

      for (const row of rows.rows) {
        const entries = row.data?.entries;
        if (!entries || !Array.isArray(entries)) continue;

        let changed = false;
        const updatedEntries = entries.map(entry => {
          const updated = { ...entry };

          if (table === 'anomalies' && Array.isArray(updated.sous_categories)) {
            const fixed = updated.sous_categories.map(s => {
              const n = normalizeSubCategory(s);
              if (n !== s) changed = true;
              return n;
            });
            updated.sous_categories = fixed;
          }
          if (table === 'interpellations') {
            if (Array.isArray(updated.rayons)) {
              const fixed = updated.rayons.map(s => {
                const n = normalizeSubCategory(s);
                if (n !== s) changed = true;
                return n;
              });
              updated.rayons = fixed;
            }
            if (updated.rayon) {
              const n = normalizeSubCategory(updated.rayon);
              if (n !== updated.rayon) { changed = true; updated.rayon = n; }
            }
          }
          if (table === 'accidents' && updated.cause) {
            const n = normalizeSubCategory(updated.cause);
            if (n !== updated.cause) { changed = true; updated.cause = n; }
          }
          if (table === 'autres_incidents') {
            if (updated.type) {
              const n = normalizeSubCategory(updated.type);
              if (n !== updated.type) { changed = true; updated.type = n; }
            }
            if (updated.sous_type) {
              const n = normalizeSubCategory(updated.sous_type);
              if (n !== updated.sous_type) { changed = true; updated.sous_type = n; }
            }
          }
          if (table === 'formations' && updated.type) {
            const n = normalizeSubCategory(updated.type);
            if (n !== updated.type) { changed = true; updated.type = n; }
          }
          if (table === 'reclamations' && updated.motif) {
            const n = normalizeSubCategory(updated.motif);
            if (n !== updated.motif) { changed = true; updated.motif = n; }
          }
          if (table === 'controle_rm' && updated.sous_type) {
            const n = normalizeSubCategory(updated.sous_type);
            if (n !== updated.sous_type) { changed = true; updated.sous_type = n; }
          }

          return updated;
        });

        if (changed) {
          await pool.query(
            `UPDATE ${table} SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify({ entries: updatedEntries }), row.id]
          );
          totalUpdated++;
        }
      }
    }

    res.json({ message: `Migration terminée: ${totalUpdated} enregistrements mis à jour` });
  } catch (err) {
    console.error('Erreur migration accents:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
