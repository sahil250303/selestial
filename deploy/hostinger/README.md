# Hostinger VPS deployment (temporary domain)

This project is a **single Node/Express server** that:

- serves the API under `/api/*`
- serves the Vite build output from `dist/` (SPA fallback to `dist/index.html`)

Source of truth:

- `npm start` → `node server.js` (see `package.json`)
- Express server: `server/index.js`

## 1) VPS prerequisites (Ubuntu/Debian)

### Install Node.js 18+ and build tooling

```bash
sudo apt update
sudo apt install -y curl ca-certificates git build-essential
```

Install Node 18+ (use your preferred method; below is NodeSource as an example):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### `sharp` prerequisites

This repo uses `sharp`. If `npm install` fails to build sharp on your VPS, install libvips:

```bash
sudo apt install -y libvips-dev
```

### Install Nginx + open ports

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Ensure inbound firewall allows `80` and `443` (method depends on your VPS/firewall setup).

## 2) Upload the app to the VPS

Recommended directory:

```bash
sudo mkdir -p /var/www/selestial
sudo chown -R $USER:$USER /var/www/selestial
```

Then upload your repo into `/var/www/selestial` (via git clone, SFTP, rsync, etc).

Important runtime files:

- `server/database.sqlite` (SQLite DB)
- `server/uploads/` (created automatically, but directory must be writable)

## 3) Install dependencies and build the frontend

```bash
cd /var/www/selestial
npm install
```

Notes:

- `postinstall` runs `npm run build`, which generates `dist/`.
- After build, you may optionally prune dev deps:

```bash
npm prune --omit=dev
```

## 4) Environment variables

Copy the production example, then fill values:

```bash
cp deploy/hostinger/env.production.example .env
```

Minimum recommended for production:

- `JWT_SECRET`
- `ADMIN_PASSWORD`

Optional:

- SMTP variables for order emails
- Twilio variables for OTP

## 5) systemd service

Copy the service file, edit paths/user if needed, then enable it:

```bash
sudo cp deploy/hostinger/selestial.service /etc/systemd/system/selestial.service
sudo systemctl daemon-reload
sudo systemctl enable --now selestial
sudo systemctl status selestial --no-pager
```

Logs:

```bash
sudo journalctl -u selestial -f --no-pager
```

## 6) Nginx reverse proxy (temporary domain)

1. In Hostinger hPanel, obtain your **temporary domain hostname** for the VPS.
2. Replace `__TEMP_HOSTNAME__` in the config file.
3. Install config + reload Nginx:

```bash
sudo cp deploy/hostinger/nginx-selestial.conf /etc/nginx/sites-available/selestial
sudo ln -sf /etc/nginx/sites-available/selestial /etc/nginx/sites-enabled/selestial
sudo nginx -t
sudo systemctl reload nginx
```

## 7) HTTPS (Let’s Encrypt)

If the temporary hostname resolves to your VPS and port 80 is reachable:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d __TEMP_HOSTNAME__
```

## 8) Verify

From your local machine:

- `https://__TEMP_HOSTNAME__/` loads the app
- `https://__TEMP_HOSTNAME__/api/health` returns JSON `{status:"ok", ...}`

Example:

```bash
curl -i https://__TEMP_HOSTNAME__/api/health
```

