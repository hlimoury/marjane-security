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

const agentCanEditMonth = (user, instance) => {
  if (user.role !== 'agent') return true;
  return Number(instance.created_by) === Number(user.id) && !instance.validated_at;
};

const agentCanWriteCategory = async (user, instance, category) => {
  if (user.role !== 'agent') return { ok: true };
  if (!instance) return { ok: false, status: 404, message: 'Instance non trouvée' };
  if (!(await agentCanAccessStore(user, instance.supermarket_id, instance.region))) {
    return { ok: false, status: 403, message: 'Accès refusé' };
  }
  if (Number(instance.created_by) !== Number(user.id)) {
    return { ok: false, status: 403, message: 'Vous pouvez modifier seulement les mois que vous avez créés' };
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

const monthLabel = (month, year) => `${MONTHS[month] || month} ${year}`;

module.exports = {
  CATEGORY_LABELS,
  assignedStoreIds,
  loadInstance,
  sealedCategories,
  agentCanAccessStore,
  agentCanEditMonth,
  agentCanWriteCategory,
  notifyRegion,
  logAgentActivity,
  monthLabel,
};
