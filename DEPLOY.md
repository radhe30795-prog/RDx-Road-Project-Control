# Deploy RDx ERP

Two ways — pick one:

- **A. FREE tier (₹0/month)** — Render (app) + TiDB Cloud (MySQL, free) +
  Firebase (login + file storage, free, no card needed).
  Limits: Render's free server sleeps after ~15 min idle, so the first
  page load after idle takes ~1 minute. Perfect until paying customers come.
- **B. Cheap VPS (~₹400/month)** — Hetzner/Contabo, always on, no limits.
  Use this when the company pays or customers subscribe.

---

## A. FREE deploy (Render + TiDB Cloud)

### 1. Create free accounts (15 min, all free)
1. **TiDB Cloud** — https://tidbcloud.com → sign up → Create Cluster
   (Serverless) → Connect → copy the connection string, e.g.
   `mysql://user:pass@host:4000/rdx`. Keep it safe.
2. **Render** — https://render.com → sign up (free, no card needed).
3. **Firebase** — https://console.firebase.google.com → create project →
   Add web app → copy the `firebaseConfig` values → Authentication →
   enable **Google** sign-in → Project settings → **Service accounts** →
   **Generate new private key** (free, no card) → save the JSON file.
   This key lets the server upload files to Firebase Storage (free 5 GB).

### 2. Deploy on Render
1. Render Dashboard → **New → Blueprint** → upload/connect this project
   (it contains `render.yaml`).
2. Fill every `sync: false` variable:
   - `DATABASE_URL` = TiDB connection string, `DB_SSL` stays `true`
   - Firebase values, `GOOGLE_ADMIN_EMAIL` (your email → auto-admin)
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the whole service-account JSON
     you downloaded (paste it as-is; raw or base64 both work)
3. Deploy. First boot runs DB migrations automatically.
4. Copy the Render URL, e.g. `https://rdx-road-control.onrender.com`,
   and set it as `APP_BASE_URL` in Render → Environment (redeploys).
5. Firebase Console → Authentication → Settings → **Authorized domains** →
   add your Render domain (without `https://`).

Done — open the URL and sign in with Google.

> Later, moving to the paid VPS: everything is already Docker-ready —
> just follow section B below with the same `.env` values.

---

## B. Cheap VPS deploy (Docker)

## 1. Buy a VPS
- Hetzner CX22 (~₹400/month) or Contabo VPS S — Ubuntu 24.04, 4 GB RAM.
- Note the server's public IP, e.g. `1.2.3.4`.

## 2. Point your domain (recommended)
In your domain DNS settings add an A-record:

| Host | Type | Value |
|------|------|-------|
| erp  | A    | 1.2.3.4 (your VPS IP) |

So the site opens at `https://erp.yourdomain.com`. Wait 5–10 min for DNS.

## 3. Install Docker on the VPS
SSH into the server and run:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and SSH back in
docker --version
docker compose version
```

## 4. Copy the project to the server
From your computer (where the project zip is), upload it:

```bash
scp rdx-road-project-control-redesign.zip root@1.2.3.4:/opt/
```

On the server:

```bash
cd /opt
apt install -y unzip
unzip rdx-road-project-control-redesign.zip -d rdx-erp
cd rdx-erp
```

## 5. Create the keys you need (10 minutes)
You must create these once in your own accounts:

1. **Firebase (Google login)** — https://console.firebase.google.com
   - Create project → Add web app → copy the `firebaseConfig` values
     (`apiKey`, `appId`, `authDomain`, `messagingSenderId`, `projectId`,
     `storageBucket`) into `.env`.
   - Authentication → Sign-in method → enable **Google**.
   - Authentication → Settings → Authorized domains → add `erp.yourdomain.com`.
2. **Firebase Storage (file storage, free 5 GB, no card)** —
   Project settings → Service accounts → Generate new private key →
   paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.
   (Alternative: set `STORAGE_BACKEND=s3` and use Cloudflare R2 / AWS S3
   with the `S3_*` variables — R2 needs a card on file to activate.)

## 6. Fill `.env` and start

```bash
cp .env.example .env
nano .env     # fill every value (see comments inside)
```

Then build and start everything (app + MySQL):

```bash
docker compose up -d --build
```

Run the database tables once:

```bash
docker compose run --rm migrate
```

Check it is running:

```bash
docker compose ps
docker compose logs -f app
```

Open `http://1.2.3.4:3000` — you should see the login page.
Sign in with the `GOOGLE_ADMIN_EMAIL` account first (it becomes admin).

## 7. HTTPS with Caddy (auto SSL, simplest)
On the server:

```bash
apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
erp.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
systemctl reload caddy
```

Done — `https://erp.yourdomain.com` now works with automatic HTTPS.
Also set `APP_BASE_URL=https://erp.yourdomain.com` in `.env` and restart:

```bash
docker compose up -d
```

## Useful commands
```bash
docker compose logs -f app     # live app logs
docker compose up -d --build   # rebuild after code changes
docker compose run --rm migrate # re-run after schema changes
docker compose down            # stop everything (data stays in db_data volume)
```

## Notes
- Backups: the MySQL data lives in the `db_data` volume. Back it up with
  `docker compose exec db mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" rdx > backup.sql`
- The Manus-only features (Forge AI/storage, Manus debug tools) were removed
  during migration. Everything else — dashboard, DPR, billing, HR, reports —
  works exactly as before.
