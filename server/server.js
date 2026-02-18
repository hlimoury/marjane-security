const express = require('express');
const cors = require('cors');
require('dotenv').config();

const initDatabase = require('./config/init');
const authRoutes = require('./routes/auth');
const supermarketRoutes = require('./routes/supermarkets');
const instanceRoutes = require('./routes/instances');
const caracteristiqueRoutes = require('./routes/caracteristiques');
const dashboardRoutes = require('./routes/dashboard');
const supermarketDispositifsRoutes = require('./routes/supermarket-dispositifs');
const supermarketScoringRoutes = require('./routes/supermarket-scoring');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/supermarkets', supermarketRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/caracteristiques', caracteristiqueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/supermarket-dispositifs', supermarketDispositifsRoutes);
app.use('/api/supermarket-scoring', supermarketScoringRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur Marjane en marche' });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Impossible de demarrer le serveur:', err);
    process.exit(1);
  });
