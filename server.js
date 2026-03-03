const path = require('path');
const express = require('express');
const cors = require('cors');

// Load .env: config/ first (dev defaults), then root (server .env wins via override)
const configEnv = path.join(__dirname, 'config', '.env');
require('dotenv').config({ path: configEnv });
require('dotenv').config({ override: true });

const connectDB = require('./config/db');

const propertyRoutes = require('./routes/property');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);

// Root – quick test
app.get('/', (req, res) => {
  res.send('Hola Jables');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FLX Vacations API' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
