const path = require('path');
const express = require('express');
const cors = require('cors');

// Load .env: config/ first (dev defaults), then root (server .env wins via override)
const configEnv = path.join(__dirname, 'config', '.env');
require('dotenv').config({ path: configEnv });
require('dotenv').config({ override: true });

const connectDB = require('./config/db');

const propertyRoutes = require('./routes/property');
const amenityRoutes = require('./routes/amenity');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const subscriptionRoutes = require('./routes/subscription');
const { handleWebhook } = require('./controllers/subscription');
const { getSitemap, getRobotsTxt } = require('./controllers/sitemap');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// In production, vaca-api runs behind Nginx. Trust the immediate upstream's
// X-Forwarded-For header (set by Nginx in docs/nginx-api-proxy.conf) so that
// `req.ip` is the real client address instead of 127.0.0.1. Required for
// per-IP rate limiting to work correctly. The `1` means "trust 1 hop" — safer
// than `true`, which would trust any spoofed XFF chain.
app.set('trust proxy', 1);

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
// Stripe webhook needs the RAW body for signature verification, so it MUST be
// mounted before express.json(). express.json() parses the body and discards
// the raw bytes, which would break stripe.webhooks.constructEvent.
app.post(
  '/api/subscriptions/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Root – quick test
app.get('/', (req, res) => {
  res.send('Hola Jables');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FLX Vacations API' });
});

// SEO (F-10.1, F-10.2)
app.get('/sitemap.xml', getSitemap);
app.get('/robots.txt', getRobotsTxt);

// Error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
