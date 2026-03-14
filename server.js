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
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// CORS: allow frontend origins and localhost only (PRD 4.4)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://flxvacations.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // No origin (e.g. same-origin, Postman, Bruno) or whitelisted origin
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

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
