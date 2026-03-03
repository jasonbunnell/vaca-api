# Deploy vaca-api to Digital Ocean

This guide deploys the vaca-api backend to a Digital Ocean droplet (e.g. Fedora on **happy-hound**). The API runs as a systemd service and can be exposed via Nginx + HTTPS.

## Prerequisites

- A Digital Ocean droplet (e.g. Fedora 41) with SSH access as `root` or a sudo user.
- MongoDB Atlas cluster (or another MongoDB) with a production user and network access for the droplet IP.
- Domain (e.g. `api.flxvacations.com`) pointing to the droplet IP, or plan to use the same host under a path (e.g. `flxvacations.com/api`).

---

## 1. Server setup (one-time)

SSH into the droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

### Install Node.js and Git (Fedora)

```bash
sudo dnf -y update
sudo dnf -y install git nginx nodejs
node -v   # should be 18+ or 20+
```

### Create app user and directory

```bash
sudo useradd -r -m -d /var/www/vaca-api -s /sbin/nologin vacaapi 2>/dev/null || true
sudo mkdir -p /var/www/vaca-api
sudo chown -R vacaapi:vacaapi /var/www/vaca-api
```

---

## 2. Deploy the app

### Clone (or pull) the repo

If `/var/www/vaca-api` is **empty**:

```bash
cd /var/www/vaca-api
sudo git clone git@github.com:jasonbunnell/vaca-api.git .
sudo chown -R vacaapi:vaca-api /var/www/vaca-api
```

If the repo **already exists**:

```bash
cd /var/www/vaca-api
sudo git fetch --all
sudo git reset --hard origin/main
sudo chown -R vacaapi:vaca-api /var/www/vaca-api
```

### Install dependencies

```bash
sudo -u vacaapi bash -lc 'cd /var/www/vaca-api && npm ci --omit=dev'
```

### Create production `.env`

Create `/var/www/vaca-api/.env` (do not commit this file):

```bash
sudo nano /var/www/vaca-api/.env
```

Example (replace with your real values):

```env
NODE_ENV=production
PORT=7000

MONGODB_URI=mongodb+srv://vacation-api.8ots0yy.mongodb.net/?retryWrites=true&w=majority&appName=vacation-api
MONGODB_USERNAME=vaca_api_prod
MONGODB_PASSWORD=YOUR_PROD_PASSWORD

JWT_SECRET=YOUR_STRONG_JWT_SECRET
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30d
```

Important: use **URI without credentials** and set `MONGODB_USERNAME` / `MONGODB_PASSWORD` (your `config/db.js` injects them). In Atlas **Network Access**, allow your droplet’s public IP.

Then:

```bash
sudo chown vacaapi:vacaapi /var/www/vaca-api/.env
sudo chmod 600 /var/www/vaca-api/.env
```

---

## 3. Systemd service

Create the unit file:

```bash
sudo nano /etc/systemd/system/vaca-api.service
```

Paste (do **not** use `EnvironmentFile` — the app loads `.env` via dotenv):

```ini
[Unit]
Description=vaca-api
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=vacaapi
WorkingDirectory=/var/www/vaca-api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vaca-api
sudo systemctl status vaca-api --no-pager
```

Test locally on the server:

```bash
curl -sS http://127.0.0.1:7000/api/health
```

You should see: `{"status":"ok","message":"FLX Vacations API"}`.

---

## 4. Nginx reverse proxy (optional but recommended)

Expose the API on port 80/443 and optionally add HTTPS.

### Create Nginx config

```bash
sudo nano /etc/nginx/conf.d/vaca-api.conf
```

For a **subdomain** (e.g. `api.flxvacations.com`):

```nginx
server {
  listen 80;
  server_name api.flxvacations.com;

  location / {
    proxy_pass http://127.0.0.1:7000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Or to serve under **same host** (e.g. `flxvacations.com/api`), add this `location` to the existing server block for `flxvacations.com`:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:7000/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Fedora: allow Nginx to connect to Node (SELinux)

```bash
sudo setsebool -P httpd_can_network_connect 1
```

### Reload Nginx

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### Firewall (firewalld)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 5. HTTPS with Let’s Encrypt (optional)

```bash
sudo dnf -y install certbot python3-certbot-nginx
sudo certbot --nginx -d api.flxvacations.com
```

Use the URL you chose (subdomain or same host) when running certbot.

---

## 6. Frontend configuration

Point the flxvacations.com frontend at the deployed API:

- **Subdomain:** set `NUXT_PUBLIC_API_BASE=https://api.flxvacations.com` (or your API subdomain) where the frontend is built/run.
- **Same host:** set `NUXT_PUBLIC_API_BASE=https://flxvacations.com` so requests go to `https://flxvacations.com/api/properties`, etc.

---

## Useful commands

| Action | Command |
|--------|---------|
| View logs | `sudo journalctl -u vaca-api -n 100 --no-pager` |
| Restart API | `sudo systemctl restart vaca-api` |
| Status | `sudo systemctl status vaca-api` |
| Pull latest and restart | `cd /var/www/vaca-api && sudo git pull && sudo -u vacaapi npm ci --omit=dev && sudo systemctl restart vaca-api` |

---

## Troubleshooting

- **503 / “Events image base not configured”** — That’s for the **frontend** (flxvacations.com) event images, not vaca-api. See the events-image server route and `eventsImageBase` in the Nuxt app.
- **MongoDB connection failed** — Check Atlas Network Access (add droplet IP), and that `MONGODB_URI` / `MONGODB_USERNAME` / `MONGODB_PASSWORD` in `/var/www/vaca-api/.env` are correct.
- **Nginx 502** — Ensure `vaca-api` is running (`systemctl status vaca-api`) and SELinux allows Nginx to connect: `sudo setsebool -P httpd_can_network_connect 1`.
