const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All correct (accented) subcategory names across every category
const ALL_CANONICAL = [
  // Anomalies AXE 1
  'Sol sale', 'Cagettes / supports sales', 'Déchets visibles en surface de vente',
  'Moucherons', 'Insectes rampants', 'Rongeurs',
  'Tenue des salariés non conforme', 'Check-out caisse sale',
  // Anomalies AXE 2
  'Produit abîmé', 'Produit périmé',
  'Rupture rayon Marché (Fruits & Légumes)', 'Rupture rayon Épicerie',
  'Rupture rayon Boucherie', 'Rupture rayon Fromage',
  'Rupture multiple rayons', 'Rupture rayon Poissonnerie',
  // Anomalies AXE 3
  'Allée bloquée', 'Palette dangereuse', 'Issue de secours obstruée',
  'Moyens d\'incendie bloqués', 'Sol glissant', 'Réserve non rangée',
  'Frigo encombré', 'Porte frigo ouverte', 'Non port des EPI',
  'Absence de l\'ADS en poste',
  // Anomalies AXE 4
  'Attente critique stand fromage', 'Attente critique stand boucherie',
  'Attente critique stand Poissonnerie', 'Attente critique Balance FLEG',
  'File d\'attente critique caisses', 'Nombre de caisses ouvertes insuffisant',
  'Conflit visible entre salariés', 'Comportement non professionnel (personnel)',
  'Comportement non professionnel ADS',
  // Interpellations rayons
  'Biscuiterie', 'Épicerie', 'DPH', 'Liquide', 'Non alimentaire', 'PF',
  // Accidents causes
  'Chutes et glissades', 'Manutention manuelle', 'Hachoirs', 'Trancheuse',
  'Scie Électrique boucherie', 'Outils tranchants', 'Chutes d\'objets',
  'Agressions et violences', 'Autres',
  // Autres incidents types
  'Départ de feu', 'Agression envers le personnel', 'Passage des autorités',
  'Sinistre déclaré par un client', 'Acte de sécurisation', 'Autre',
  // Autres incidents sous-types
  'Défauts électriques', 'Équipements de froid', 'Équipement de cuisson',
  'Actes de malveillance', 'Accumulation de déchets', 'Travaux par point chaud',
  // Formations types
  'Incendie', 'SST', 'Intégration',
  // Réclamations motifs
  'Produit périmé',
  'Produit impropre (abîmé, moisi, odeur suspecte, rupture de la chaîne du froid)',
  'Produits endommagés (emballage déchiré, boîte cabossée, etc.)',
  'Produits non conformes (étiquette, poids indiqué, etc.)',
  'Produit manquant dans un pack ou une boîte',
  'Erreur de prix en caisse (écart entre prix affiché et facture)',
  'Promotions non appliquées ou mal expliquées',
  'Attente trop longue aux caisses', 'Erreur de rendu monnaie',
  'Problème avec les moyens de paiement (CB, chèques, bons d\'achat, cartes de fidélité...)',
  'Double facturation ou oubli d\'annulation d\'un article',
  'Manque d\'accueil (courtoisie, indifférence)',
  'Comportement inapproprié d\'un employé ou agent de sécurité',
  'Manque de disponibilité du personnel pour aider',
  'Hygiène insuffisante (sol, odeurs, toilettes, etc.)',
  'Hygiène et nuisibles (présence de cafards, moucherons, charançons, rats, souris)',
  'Sécurité du magasin (vols, sentiment d\'insécurité)',
  'Problèmes de stationnement (parking plein, sécurité, produits manquants)',
  'Nuisances sonores (musique trop forte, annonces trop fréquentes)',
  // Contrôle RM sous-types
  'PGC', 'Marché', 'N.AL',
  'Contrôle entrepôt', 'Contrôle fournisseurs direct',
];

const stripAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Build lookup: stripped lowercase → canonical accented form
const CANONICAL_LOOKUP = {};
ALL_CANONICAL.forEach(name => {
  CANONICAL_LOOKUP[stripAccents(name).toLowerCase()] = name;
});

const normalizeSubCategory = (name) => {
  if (!name) return name;
  const key = stripAccents(name).toLowerCase();
  return CANONICAL_LOOKUP[key] || name;
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
    const detailsByMotif = {};

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

          // For reclamations: track detail breakdown per motif
          if (type === 'reclamations' && entry.detail) {
            if (!detailsByMotif[sub]) detailsByMotif[sub] = {};
            const det = entry.detail;
            detailsByMotif[sub][det] = (detailsByMotif[sub][det] || 0) + 1;
          }
        });
      });
    });

    const subCategoriesArray = Object.entries(subCategoryStats)
      .map(([name, count]) => {
        const item = {
          name,
          count,
          supermarketCount: supermarketsBySubCategory[name]?.size || 0
        };
        if (type === 'reclamations' && detailsByMotif[name]) {
          item.details = Object.entries(detailsByMotif[name])
            .map(([detail, cnt]) => ({ name: detail, count: cnt }))
            .sort((a, b) => b.count - a.count);
        }
        return item;
      })
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
    const { region, year, month, detail } = req.query;
    const decodedSubcat = decodeURIComponent(subcat);
    const decodedDetail = detail ? decodeURIComponent(detail) : null;
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
        const motifMatches = normalizedSubs.includes(decodedSubcat);
        const detailMatches = !decodedDetail || (entry.detail && entry.detail === decodedDetail);
        const includeEntry = motifMatches && (type !== 'reclamations' || !decodedDetail || detailMatches);
        if (includeEntry) {
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
      subDetail: decodedDetail || null,
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

// GET /api/dashboard/totals - Totals per supermarket per category (all users)
router.get('/totals', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    const userRole = req.user.role;
    const userRegion = req.user.region;
    const isCity = userRole === 'city';

    let where = 'WHERE 1=1';
    const params = [];
    let pi = 1;

    if (userRole === 'region' || userRole === 'city') {
      where += ` AND s.region = $${pi++}`;
      params.push(userRegion);
    }
    if (year) { where += ` AND i.year = $${pi++}`; params.push(parseInt(year)); }
    if (month) { where += ` AND i.month = $${pi++}`; params.push(parseInt(month)); }

    const categories = isCity
      ? ['anomalies']
      : ['anomalies', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'controle_rm'];

    const regionParam = (userRole === 'region' || userRole === 'city') ? [userRegion] : [];
    let smQuery = 'SELECT id, name, region FROM supermarkets';
    if (regionParam.length) smQuery += ' WHERE region = $1';
    smQuery += ' ORDER BY name';
    const smResult = await pool.query(smQuery, regionParam);

    let yearsQuery = 'SELECT DISTINCT i.year FROM instances i JOIN supermarkets s ON i.supermarket_id = s.id';
    if (regionParam.length) yearsQuery += ' WHERE s.region = $1';
    yearsQuery += ' ORDER BY year DESC';
    const yearsResult = await pool.query(yearsQuery, regionParam);

    const categoryData = {};

    for (const cat of categories) {
      const query = `
        SELECT s.id as supermarket_id, t.data
        FROM ${cat} t
        JOIN instances i ON t.instance_id = i.id
        JOIN supermarkets s ON i.supermarket_id = s.id
        ${where}
      `;
      const result = await pool.query(query, params);

      const perSupermarket = {};
      let grandTotal = 0;
      const subCategoryTotals = {};

      result.rows.forEach(row => {
        const smId = row.supermarket_id;
        if (!perSupermarket[smId]) perSupermarket[smId] = { total: 0, details: {} };

        const entries = row.data?.entries || [];
        entries.forEach(entry => {
          perSupermarket[smId].total++;
          grandTotal++;

          let subs = [];
          if (cat === 'anomalies') subs = entry.sous_categories || [];
          else if (cat === 'interpellations') subs = entry.rayons || (entry.rayon ? [entry.rayon] : []);
          else if (cat === 'accidents') subs = entry.cause ? [entry.cause] : [];
          else if (cat === 'autres_incidents') subs = entry.type ? [entry.type] : [];
          else if (cat === 'formations') subs = entry.type ? [entry.type] : [];
          else if (cat === 'reclamations') subs = entry.motif ? [entry.motif] : [];
          else if (cat === 'controle_rm') {
            const lbl = entry.type === 'entrepot' ? 'Contrôle entrepôt' : 'Contrôle fournisseurs direct';
            subs = entry.sous_type ? [`${lbl} — ${entry.sous_type}`] : [];
          }

          subs.forEach(rawSub => {
            if (!rawSub) return;
            const sub = normalizeSubCategory(rawSub);
            perSupermarket[smId].details[sub] = (perSupermarket[smId].details[sub] || 0) + 1;
            subCategoryTotals[sub] = (subCategoryTotals[sub] || 0) + 1;
          });
        });
      });

      categoryData[cat] = { total: grandTotal, subCategoryTotals, perSupermarket };
    }

    res.json({
      supermarkets: smResult.rows,
      categories: categoryData,
      years: yearsResult.rows.map(r => r.year),
      isCity,
    });
  } catch (err) {
    console.error('Erreur totals:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/dashboard/migrate-regions - Reassign supermarket regions + create ZAYD BENCHEIKH account
router.post('/migrate-regions', authMiddleware, adminOnly, async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');

    const stripAcc = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normName = (n) => stripAcc(n.replace(/^MM\s+/i, '').trim()).toUpperCase();

    const REGION_STORES = {
      'REGION CENTRE 1': [
        'TWIN', '2 MARS', 'PANORAMIQUE', 'ROCHE NOIRE',
        'SIDI OTHMANE', 'SIDI MAAROUF O VILLAGE', 'SIDI MAAROUF', 'CASA ALMAZ', 'TAH',
        'INARA', 'BERRECHID', 'CASA OASIS', 'VERTINTA',
        'BERNOUSSI', 'DAR BOUAAZA CGI', 'DAR BOUAAZA', 'BO-VILLAGE II', 'VILLE VERTE',
        'QUARTIER LES HOPITAUX', 'QUARTIER LES', 'BOUSKOURA VICTORIA',
        'EL JADIDA ESSALAM', 'EL JADIDA', 'ELJADIDA NAJD',
        'CASA LAYMOUNE', 'BOUSKOURA BO VILLAGE 1', 'BOUSKOURA BO',
      ],
      'REGION CENTRE 02': [
        'BEAUSEJOUR', 'PAQUET', 'CIL', 'AIN SEBAA MEKOUAR', 'AIN SEBAA',
        'LIBERTE', 'RYAD ANFA', 'CASA FOURAT', 'GHANDI',
        'EMILE ZOLA', 'IBNOUTACHAFINE', 'BENSLIMANE', 'HERMITAGE',
        'MOHAMEDIA PARC', 'MOHAMEDIA', 'CASA OULFA', 'TADDART', 'CASA PALMIER',
        'LAMENAIS', 'AERIA MALL', 'AERIA', 'SIDI MOUMEN', 'RAHMA',
        'CASA VAL FLEURI', 'CHEFCHAOUNI', 'LISSASFA',
      ],
      'REGION CENTRE NORD': [
        'RABAT CITY CENTER', 'RABAT OCEAN 2', 'RABAT OCEAN', 'RABAT CHAMPION',
        'RABAT MABELLA', 'RABAT ELMENZEH INDIGO III', 'RABAT',
        'ZAER', 'TEMARA', 'HARHOURA',
        'SALE BAB LAKWASS', 'SALE ELJADIDA', 'SALE',
        'HAY RIAD', 'EL MENZEH MAJORELLE', 'EL MENZEH', 'ELMENZEH',
        'BOUZNIKA MANDARONA', 'BOUZNIKA',
        'AHMED CHAOUQI', 'AHMED CHAOUKI',
        'KENITRA MAAMOURA', 'KENITRA', 'SOUK LARBAA',
        'DAR ESSALAM', 'TIFELT', 'MABELLA', 'MAJORELLE', 'INDIGO', 'OCEAN', 'CHAMPION',
      ],
      'REGION SUD': [
        'GUELIZ', 'MARRAKECH SEMLALIA II', 'MARRAKECH SEMLALIA', 'MARRAKECH IZDIHAR', 'MARRAKECH',
        'BENI MELLAL TAKADOUM', 'BENI MELLAL', 'SAFI 1', 'SAFI',
        'TARGA', 'AGADIR EL HOUDA', 'AGADIR TALBORJT', 'AGADIR HAY MOHAMMADI', 'AGADIR',
        'KHOURIBGA', 'UM6P BENGUERIR', 'BENGUERIR', 'BENGRIR',
        'OULED TEIMA', 'SEMLALIA', 'IZDIHAR', 'TALBORJT', 'TAKADOUM',
      ],
      'REGION NORD': [
        'TANGER BOULEVARD', 'TANGER CITY CENTER', 'TANGER VAL FLEURI',
        'TANGER IBERIA', 'TANGER CASTILLA', 'TANGER TOROS', 'TANGER MOUJAHIDINE', 'TANGER',
        'TETOUAN BOUJARAH', 'TETOUAN WILAYA', 'TETOUAN',
        'MARTIL', 'ROMANA',
        'MOUJAHIDINE', 'BOUJARAH', 'WILAYA', 'IBERIA', 'CASTILLA', 'TOROS', 'BOULEVARD',
      ],
      'REGION ORIENT': [
        'FES SALAM', 'FES SEFROU', 'FES FONTAINE', 'FES CDC', 'FES',
        'MEKNES ZAITOUN', 'MEKNES HAMRIA', 'MEKNES',
        'ERRACHIDIA', 'MIDELT', 'EL HAJEB', 'OUJDA MEDINA', 'OUJDA', 'TAZA',
        'ZAITOUN', 'FONTAINE', 'HAMRIA', 'CDC', 'SEFROU', 'SALAM',
      ],
    };

    const STORE_TO_REGION = {};
    for (const [region, names] of Object.entries(REGION_STORES)) {
      for (const name of names) STORE_TO_REGION[name] = region;
    }
    const SORTED_KEYS = Object.keys(STORE_TO_REGION).sort((a, b) => b.length - a.length);

    const allSupermarkets = await pool.query('SELECT id, name, region FROM supermarkets');
    let updated = 0;
    const unmatched = [];

    for (const sm of allSupermarkets.rows) {
      const norm = normName(sm.name);
      let newRegion = STORE_TO_REGION[norm] || null;

      if (!newRegion) {
        for (const key of SORTED_KEYS) {
          if (norm.includes(key)) {
            newRegion = STORE_TO_REGION[key];
            break;
          }
        }
      }

      if (!newRegion) {
        unmatched.push(sm.name);
        continue;
      }

      if (newRegion !== sm.region) {
        await pool.query('UPDATE supermarkets SET region = $1 WHERE id = $2', [newRegion, sm.id]);
        updated++;
      }
    }

    // Move 'nord' user (Larbi Blala) to REGION CENTRE NORD
    await pool.query("UPDATE users SET region = 'REGION CENTRE NORD' WHERE username = 'nord'");

    // Create ZAYD BENCHEIKH user if not exists
    let userCreated = false;
    const existingUser = await pool.query("SELECT id FROM users WHERE username = 'zayd'");
    if (existingUser.rows.length === 0) {
      const hash = await bcrypt.hash('zayd2026', 10);
      await pool.query(
        "INSERT INTO users (username, password_hash, role, region) VALUES ('zayd', $1, 'region', 'REGION NORD')",
        [hash]
      );
      userCreated = true;
    }

    // Create anomalies account for CENTRE NORD if not exists
    const existingAno = await pool.query("SELECT id FROM users WHERE username = 'anocentrenord'");
    if (existingAno.rows.length === 0) {
      const hash = await bcrypt.hash('anocentrenord123', 10);
      await pool.query(
        "INSERT INTO users (username, password_hash, role, region) VALUES ('anocentrenord', $1, 'city', 'REGION CENTRE NORD')",
        [hash]
      );
    }

    res.json({
      message: `Migration régions terminée: ${updated} magasins réassignés. Compte nord → CENTRE NORD. Compte ZAYD: ${userCreated ? 'créé (user: zayd / pass: zayd2026)' : 'existait déjà'}`,
      unmatched: unmatched.length > 0 ? unmatched : undefined,
    });
  } catch (err) {
    console.error('Erreur migration régions:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
