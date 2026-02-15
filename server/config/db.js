const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('Connecte a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL:', err);
});

module.exports = pool;
