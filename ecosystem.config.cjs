/**
 * PM2 ecosystem file for vaca-api.
 * Run from app directory: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'vaca-api',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      // .env is loaded by the app via dotenv
    },
  ],
};
