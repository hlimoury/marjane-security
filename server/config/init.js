const pool = require('./db');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'main', 'region')),
        region VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS supermarkets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        region VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS instances (
        id SERIAL PRIMARY KEY,
        supermarket_id INTEGER REFERENCES supermarkets(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL CHECK (year >= 2020),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(supermarket_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS dispositifs (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS interpellations (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accidents (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS autres_incidents (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS formations (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reclamations (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS anomalies (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scoring (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS controle_rm (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER UNIQUE REFERENCES instances(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS supermarket_scoring (
        id SERIAL PRIMARY KEY,
        supermarket_id INTEGER UNIQUE REFERENCES supermarkets(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS supermarket_dispositifs (
        id SERIAL PRIMARY KEY,
        supermarket_id INTEGER UNIQUE REFERENCES supermarkets(id) ON DELETE CASCADE,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sent_reports (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        sender_username VARCHAR(100) NOT NULL,
        sender_region VARCHAR(100),
        period_label VARCHAR(200),
        categories TEXT[],
        supermarket_count INTEGER DEFAULT 0,
        report_data JSONB NOT NULL DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        is_downloaded BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        downloaded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Allow 'city' role in users table (safe to run on existing DB)
    await pool.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'main', 'region', 'city'));
    `);

    console.log('Tables creees avec succes');

    // Clean up old-format anomalie entries (old format used 'categorie' field, new uses 'axe')
    const oldAnomalies = await pool.query(
      "DELETE FROM anomalies WHERE data->'entries' IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(data->'entries') elem WHERE elem->>'categorie' IS NOT NULL) RETURNING id"
    );
    if (oldAnomalies.rows.length > 0) {
      console.log(`Supprime ${oldAnomalies.rows.length} anomalie(s) ancien format`);
    }

    // Seed default users
    const defaultUsers = [
      { username: 'admin', password: 'admin123', role: 'admin', region: null },
      { username: 'main', password: 'main123', role: 'main', region: null },
      { username: 'centre1', password: 'centre1123', role: 'region', region: 'REGION CENTRE 1' },
      { username: 'centre2', password: 'centre2123', role: 'region', region: 'REGION CENTRE 02' },
      { username: 'nord', password: 'nord123', role: 'region', region: 'REGION CENTRE NORD' },
      { username: 'sud', password: 'sud123', role: 'region', region: 'REGION SUD' },
      { username: 'zayd', password: 'zayd2026', role: 'region', region: 'REGION NORD' },
      { username: 'orient', password: 'orient123', role: 'region', region: 'REGION ORIENT' },
      { username: 'anocentre1', password: 'anocentre1123', role: 'city', region: 'REGION CENTRE 1' },
      { username: 'anocentre02', password: 'anocentre02123', role: 'city', region: 'REGION CENTRE 02' },
      { username: 'anocentrenord', password: 'anocentrenord123', role: 'city', region: 'REGION CENTRE NORD' },
      { username: 'anosud', password: 'anosud123', role: 'city', region: 'REGION SUD' },
      { username: 'anonord', password: 'anonord123', role: 'city', region: 'REGION NORD' },
      { username: 'anoorient', password: 'anoorient123', role: 'city', region: 'REGION ORIENT' },
    ];

    // Clean up old city* accounts
    await pool.query("DELETE FROM users WHERE username IN ('citycentre1','citycentre02','citysud','cityorient','citynord')");

    for (const user of defaultUsers) {
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(user.password, 10);
        await pool.query(
          'INSERT INTO users (username, password_hash, role, region) VALUES ($1, $2, $3, $4)',
          [user.username, hash, user.role, user.region]
        );
        console.log(`Utilisateur cree: ${user.username}`);
      } else if (user.role === 'city') {
        const hash = await bcrypt.hash(user.password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, user.username]);
      }
    }

    console.log('Initialisation terminee');
  } catch (err) {
    console.error('Erreur initialisation DB:', err);
    throw err;
  }
};

module.exports = initDatabase;
