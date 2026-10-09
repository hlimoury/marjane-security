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

const agentCanWriteCategory = async (user, instance) => {
  if (user.role !== 'agent') return { ok: true };
  if (!instance) return { ok: false, status: 404, message: 'Instance non trouvée' };
  if (!(await agentCanAccessStore(user, instance.supermarket_id, instance.region))) {
    return { ok: false, status: 403, message: 'Accès refusé' };
  }
  return { ok: true };
};

const notifyRegion = async ({ agent, instance, kind, category, entryId = null, title }) => {
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
      AND COALESCE(entry_id, '') = COALESCE($5, '')
      AND validated_at IS NULL
  `, [regionUserId, instance.id, kind, category || null, entryId || null]);

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE agent_notifications SET title = $1, created_at = CURRENT_TIMESTAMP, is_seen = FALSE WHERE id = $2',
      [title, existing.rows[0].id]
    );
    return;
  }

  await pool.query(`
    INSERT INTO agent_notifications
      (region_user_id, agent_id, kind, instance_id, supermarket_id, category, entry_id, title)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [regionUserId, agent.id, kind, instance.id, instance.supermarket_id, category || null, entryId || null, title]);
};

const entrySignature = (entry) => {
  const copy = { ...entry };
  delete copy.validated;
  delete copy.validated_at;
  delete copy.validated_by;
  return JSON.stringify(copy);
};

const notifyChangedEntries = async ({ agent, instance, category, beforeEntries = [], afterEntries = [] }) => {
  const before = new Map(beforeEntries.filter((entry) => entry._id).map((entry) => [entry._id, entry]));
  for (const entry of afterEntries) {
    if (Number(entry.created_by) !== Number(agent.id) || entry.validated) continue;
    const previous = before.get(entry._id);
    if (previous && entrySignature(previous) === entrySignature(entry)) continue;
    const verb = previous ? 'modifié' : 'ajouté';
    await notifyRegion({
      agent,
      instance,
      kind: 'data',
      category,
      entryId: entry._id,
      title: `${agent.username} a ${verb} une entrée ${CATEGORY_LABELS[category] || category} — ${instance.supermarket_name} (${monthLabel(instance.month, instance.year)})`,
    });
  }
};

const setEntriesValidation = async (db, instanceId, category, entryId, validated, userId) => {
  if (category === 'dispositifs') {
    const row = await db.query('SELECT data FROM dispositifs WHERE instance_id = $1', [instanceId]);
    if (!row.rows.length) return;
    const data = { ...(row.rows[0].data || {}), _validated: validated, _validated_by: validated ? userId : null };
    await db.query('UPDATE dispositifs SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE instance_id = $2', [JSON.stringify(data), instanceId]);
    return;
  }

  const tables = ['interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'controle_rm'];
  if (!tables.includes(category)) return;
  const row = await db.query(`SELECT data FROM ${category} WHERE instance_id = $1`, [instanceId]);
  if (!row.rows.length) return;
  const data = row.rows[0].data || {};
  const entries = (data.entries || []).map((entry) => {
    if (entryId && entry._id !== entryId) return entry;
    return {
      ...entry,
      _id: entry._id || crypto.randomUUID(),
      validated,
      validated_by: validated ? userId : null,
    };
  });
  await db.query(
    `UPDATE ${category} SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE instance_id = $2`,
    [JSON.stringify({ ...data, entries }), instanceId]
  );
  await db.query('DELETE FROM data_seals WHERE instance_id = $1 AND category = $2', [instanceId, category]);
};

const logAgentActivity = async ({ agent, action, details, supermarketName = null, category = null }) => {
  if (!agent || agent.role !== 'agent') return;
  await pool.query(`
    INSERT INTO agent_activity
      (agent_id, agent_username, region, action, supermarket_name, category, details)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [agent.id, agent.username, agent.region || null, action, supermarketName, category, details]);
};

const mergeAgentEntries = (existingEntries = [], incomingEntries = [], agentId, categoryLocked = false) => {
  const existing = existingEntries.map((entry) => ({
    ...entry,
    _id: entry._id || crypto.randomUUID(),
    created_by: entry.created_by ?? null,
    validated: Boolean(entry.validated) || categoryLocked,
  }));
  const existingById = new Map(existing.map((entry) => [entry._id, entry]));
  const keptOwnedIds = new Set();
  const ownedUpdates = new Map();
  const newcomers = [];

  incomingEntries.forEach((entry) => {
    const stored = entry._id ? existingById.get(entry._id) : null;
    if (stored?.validated) return;
    if (stored && Number(stored.created_by) === Number(agentId)) {
      keptOwnedIds.add(stored._id);
      ownedUpdates.set(stored._id, { ...entry, _id: stored._id, created_by: agentId, validated: false });
      return;
    }
    if (!stored) {
      newcomers.push({ ...entry, _id: crypto.randomUUID(), created_by: agentId, validated: false });
    }
  });

  const merged = [];
  existing.forEach((stored) => {
    if (stored.validated || Number(stored.created_by) !== Number(agentId)) {
      merged.push(stored);
      return;
    }
    if (keptOwnedIds.has(stored._id)) merged.push(ownedUpdates.get(stored._id));
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
  notifyChangedEntries,
  setEntriesValidation,
  notifyRegion,
  logAgentActivity,
  monthLabel,
};
