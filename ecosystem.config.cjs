/**
 * PM2 ecosystem file for vaca-api.
 * Run from app directory: pm2 start ecosystem.config.cjs
 * cwd ensures .env is found; PORT avoids default 3000 if .env not loaded.
 */
module.exports = {
  apps: [
    {
      name: 'vaca-api',
      script: 'server.js',
      cwd: '/var/www/apps/vaca-api',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '7000' },
    },
  ],
};
