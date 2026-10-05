const crypto = require('crypto');
const pool = require('../config/db');

const CATEGORY_LABELS = {
  dispositifs: 'Dispositifs',
  interpellations: 'Interpellations',
  accidents: 'Accidents',
  autres_incidents: 'Autres incidents',
  formations: 'Formations',
  reclamations: 'Réclamations',
  anomalies: 'Anomalies',
  controle_rm: 'Contrôle RM',
};

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const assignedStoreIds = async (agentId) => {
  const result = await pool.query(
    'SELECT supermarket_id FROM agent_stores WHERE agent_id = $1',
    [agentId]
  );
  return result.rows.map((row) => row.supermarket_id);
};

const loadInstance = async (instanceId) => {
  const result = await pool.query(`
    SELECT i.*, s.region, s.name AS supermarket_name
    FROM instances i
    JOIN supermarkets s ON s.id = i.supermarket_id
    WHERE i.id = $1
  `, [instanceId]);
  return result.rows[0] || null;
};

const sealedCategories = async (instanceId) => {
  const result = await pool.query(
    'SELECT category FROM data_seals WHERE instance_id = $1',
    [instanceId]
  );
  return result.rows.map((row) => row.category);
};

const agentCanAccessStore = async (user, supermarketId, region) => {
  if (user.role !== 'agent') return true;
  if (region && user.region && region !== user.region) return false;
  const ids = await assignedStoreIds(user.id);
  return ids.map(Number).includes(Number(supermarketId));
};

const agentCanEditMonth = (user) => user.role !== 'agent';

const agentCanWriteCategory = async (user, instance, category) => {
  if (user.role !== 'agent') return { ok: true };
  if (!instance) return { ok: false, status: 404, message: 'Instance non trouvée' };
  if (!(await agentCanAccessStore(user, instance.supermarket_id, instance.region))) {
    return { ok: false, status: 403, message: 'Accès refusé' };
  }
  const seals = await sealedCategories(instance.id);
  if (seals.includes(category)) {
    return { ok: false, status: 403, message: 'Ces données ont été validées et ne peuvent plus être modifiées' };
  }
  return { ok: true };
};

const notifyRegion = async ({ agent, instance, kind, category, title }) => {
  await logAgentActivity({
    agent,
    action: kind === 'month' ? 'month_created' : 'data_saved',
    category,
    supermarketName: instance.supermarket_name || null,
    details: title,
  });

  const parent = await pool.query('SELECT parent_id FROM users WHERE id = $1', [agent.id]);
  const regionUserId = parent.rows[0]?.parent_id;
  if (!regionUserId) return;

  const existing = await pool.query(`
    SELECT id FROM agent_notifications
    WHERE region_user_id = $1
      AND instance_id = $2
      AND kind = $3
      AND COALESCE(category, '') = COALESCE($4, '')
      AND validated_at IS NULL
  `, [regionUserId, instance.id, kind, category || null]);

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE agent_notifications SET title = $1, created_at = CURRENT_TIMESTAMP, is_seen = FALSE WHERE id = $2',
      [title, existing.rows[0].id]
    );
  } else {
    await pool.query(`
      INSERT INTO agent_notifications
        (region_user_id, agent_id, kind, instance_id, supermarket_id, category, title)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [regionUserId, agent.id, kind, instance.id, instance.supermarket_id, category || null, title]);
  }
};

const logAgentActivity = async ({ agent, action, details, supermarketName = null, category = null }) => {
  if (!agent || agent.role !== 'agent') return;
  await pool.query(`
    INSERT INTO agent_activity
      (agent_id, agent_username, region, action, supermarket_name, category, details)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [agent.id, agent.username, agent.region || null, action, supermarketName, category, details]);
};

const mergeAgentEntries = (existingEntries = [], incomingEntries = [], agentId) => {
  const existing = existingEntries.map((entry) => ({
    ...entry,
    _id: entry._id || crypto.randomUUID(),
    created_by: entry.created_by ?? null,
  }));
  const existingById = new Map(existing.map((entry) => [entry._id, entry]));
  const keptOwnedIds = new Set();
  const ownedUpdates = new Map();
  const newcomers = [];

  incomingEntries.forEach((entry) => {
    const stored = entry._id ? existingById.get(entry._id) : null;
    if (stored && Number(stored.created_by) === Number(agentId)) {
      keptOwnedIds.add(stored._id);
      ownedUpdates.set(stored._id, { ...entry, _id: stored._id, created_by: agentId });
      return;
    }
    if (!stored) {
      newcomers.push({ ...entry, _id: crypto.randomUUID(), created_by: agentId });
    }
  });

  const merged = [];
  existing.forEach((stored) => {
    if (Number(stored.created_by) === Number(agentId)) {
      if (keptOwnedIds.has(stored._id)) merged.push(ownedUpdates.get(stored._id));
      return;
    }
    merged.push(stored);
  });
  return [...merged, ...newcomers];
};

const monthLabel = (month, year) => `${MONTHS[month] || month} ${year}`;

module.exports = {
  CATEGORY_LABELS,
  assignedStoreIds,
  loadInstance,
  sealedCategories,
  agentCanAccessStore,
  agentCanEditMonth,
  agentCanWriteCategory,
  mergeAgentEntries,
  notifyRegion,
  logAgentActivity,
  monthLabel,
};
