# Hostinger Deployment Guide for Selestial

This project is a **Full-Stack Node.js (Express) + React (Vite) Application**.
- **Frontend**: React 19 SPA (built into `dist/`)
- **Backend**: Node/Express API serving `/api/*` and static SPA fallback
- **Database**: SQLite (`server/database.sqlite`) or optional Turso Cloud SQLite

---

## ⚡ Quick Deployment via Hostinger hPanel (Web / Cloud Hosting)

Hostinger Cloud and Web Hosting plans include a built-in **Node.js Application Manager** in hPanel.

### Step 1: Create the Upload Package
You can generate the ready-to-upload production bundle with one command on your computer:
```bash
npm run package:hostinger
```
This generates `selestial-hostinger-deploy.zip` in your project root containing:
- `dist/` (Pre-built production frontend)
- `server/` (Backend routes, database models, uploads)
- `server.js` (Root startup entry point)
- `package.json` & `package-lock.json`
- `.env.example` (Production configuration template)

---

### Step 2: Configure Node.js in Hostinger hPanel
1. Log in to **Hostinger hPanel**.
2. Go to **Websites** → Click **Manage** on your domain.
3. In the sidebar or search bar, navigate to **Advanced** → **Node.js**.
4. Configure the settings:
   - **Node.js version**: `20.x` or `22.x` (LTS recommended)
   - **Application root**: `public_html` (or `selestial` if placing in a subfolder)
   - **Application startup file**: `server.js`
   - **Application URL**: Select your live domain (e.g., `https://yourdomain.com`)
5. Click **Create** or **Save**.

---

### Step 3: Upload Files via File Manager
1. In hPanel, go to **Files** → **File Manager** (Access files for your domain).
2. Open your Application root (e.g. `public_html`).
3. Click **Upload** (top right) → Choose `selestial-hostinger-deploy.zip`.
4. Right-click the uploaded `.zip` file and select **Extract** (extract directly into your application root).
5. Delete the `.zip` file after extracting.

---

### Step 4: Configure Environment Variables (`.env`)
1. In File Manager inside your application root, rename `.env.example` to `.env` (or create `.env`).
2. Edit `.env` with your production values:

```env
# Server
PORT=3000
NODE_ENV=production

# Domain & CORS (Replace with your actual domain!)
SITE_URL=https://yourdomain.com
ALLOWED_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Authentication
JWT_SECRET=generate-a-random-64-character-secret-key-here
ADMIN_PASSWORD=YourStrongAdminPasswordHere!

# Database
SQLITE_DB_PATH=./server/database.sqlite

# Optional: Email Notifications (Hostinger Webmail / Gmail SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=orders@yourdomain.com
SMTP_PASS=your_email_password
ADMIN_EMAIL=admin@yourdomain.com
STORE_NAME=Selestial

# Optional: Twilio / Stripe
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

---

### Step 5: Install Dependencies & Start Application
1. Return to **hPanel** → **Advanced** → **Node.js**.
2. Click **Run npm install** (or **Install Dependencies**).
3. If you have SSH access enabled, you can also run:
   ```bash
   npm install --omit=dev
   ```
4. Click **Restart** (or **Start Application**).

---

### Step 6: Verify Live Deployment
- **Frontend**: Open `https://yourdomain.com/` in your browser.
- **Health Check**: Open `https://yourdomain.com/api/health` → Should return `{"status":"ok"}`.
- **Admin Panel**: Go to `https://yourdomain.com/admin` and log in with username `admin` and your `ADMIN_PASSWORD`.

---

## 🛠️ Alternative: Hostinger VPS Deployment (Ubuntu / Debian)

If you are using a Hostinger KVM VPS with SSH root access:

### 1. VPS Setup
```bash
sudo apt update && sudo apt install -y curl ca-certificates git build-essential nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Upload App to `/var/www/selestial`
```bash
sudo mkdir -p /var/www/selestial
sudo chown -R $USER:$USER /var/www/selestial
# Copy your project files or clone repo into /var/www/selestial
cd /var/www/selestial
npm install
npm run build
cp deploy/hostinger/env.production.example .env
# Edit .env with your secrets:
nano .env
```

### 3. Setup systemd Service
```bash
sudo cp deploy/hostinger/selestial.service /etc/systemd/system/selestial.service
sudo systemctl daemon-reload
sudo systemctl enable --now selestial
sudo systemctl status selestial
```

### 4. Setup Nginx Reverse Proxy & SSL
1. Edit `deploy/hostinger/nginx-selestial.conf` and replace `YOUR_DOMAIN` with your domain.
2. Link and enable Nginx site:
```bash
sudo cp deploy/hostinger/nginx-selestial.conf /etc/nginx/sites-available/selestial
sudo ln -sf /etc/nginx/sites-available/selestial /etc/nginx/sites-enabled/selestial
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
