const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const userRoutes = require('./routes/user');
const i18nRoutes = require('./routes/i18n');
const geoRoutes = require('./routes/geo');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running! ✅' });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Mausam API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      weather: '/api/weather',
      users: '/api/users',
      preferences: '/api/preferences',
      i18n: '/api/i18n',
      geo: '/api/geo'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/geo', geoRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌤️ Mausam Backend running on http://localhost:${PORT}`);
});
