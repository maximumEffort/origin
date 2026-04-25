# UAE Infrastructure Setup Guide

> **Status:** Planning
> **Last updated:** March 2026
> **Goal:** Migrate backend + database to UAE region for data residency compliance. Keep costs minimal.

---

## Current State

| Service | Current Provider | Current Region | Problem |
|---|---|---|---|
| Database | Supabase PostgreSQL | eu-central-1 (Frankfurt) | Not in UAE — data residency risk |
| Backend API | Railway | US region | High latency for UAE users (~200ms+) |
| Website | Vercel | Edge CDN (global) | ✅ Fine — stays on Vercel |
| Admin Dashboard | Vercel | Edge CDN (global) | ✅ Fine — stays on Vercel |
| n8n (Phase 7) | Not deployed yet | — | Deploy on same UAE server |

## Target State

| Service | Target Provider | Target Region |
|---|---|---|
| Database | Self-hosted PostgreSQL (Docker) | UAE |
| Backend API | NestJS in Docker | UAE |
| n8n | Self-hosted in Docker | UAE (same server) |
| Website | Vercel (no change) | Edge CDN |
| Admin Dashboard | Vercel (no change) | Edge CDN |

---

## Hosting Options — Cost Comparison

Researched March 2026. All prices are approximate monthly costs in USD.

### Providers with UAE Region

| Provider | Plan | vCPU | RAM | Storage | Monthly Cost | Managed DB Available | Notes |
|---|---|---|---|---|---|---|---|
| **AWS me-central-1** | Lightsail (smallest) | 2 | 512 MB | 20 GB | ~$5 | Yes (RDS from ~$22/mo) | Free tier if new account |
| **AWS me-central-1** | EC2 t3.micro | 2 | 1 GB | 8 GB EBS | ~$8.50 | Yes (RDS from ~$22/mo) | +EBS storage costs |
| **Azure UAE North** | B1s VM | 1 | 1 GB | 30 GB | ~$7.59 | Yes (Flex Server from ~$12/mo) | Reservation discounts available |
| **Azure UAE North** | B1ms VM | 1 | 2 GB | 30 GB | ~$10-12 | Yes (Flex Server from ~$12/mo) | Better for Docker Compose |
| **Vultr** | Cloud Compute | 1 | 1 GB | 25 GB | ~$5 | No | UAE region availability TBC |
| **Oracle Cloud** | Always Free | 1 | 1 GB | 50 GB | **$0** | Yes (free tier) | UAE region availability TBC |

### Providers WITHOUT UAE Region (Not Recommended)

| Provider | Closest Region | Why Not |
|---|---|---|
| Hetzner | Germany / Singapore | No Middle East presence |
| Supabase | Frankfurt (EU) | No UAE region available |
| DigitalOcean | Singapore / India | UAE region unconfirmed |
| Neon | US / EU only | No Middle East |
| Contabo | EU / US / Asia | No Middle East |

---

## Recommendation: Single VPS with Docker Compose

For a startup keeping costs minimal, the cheapest viable approach is a **single VPS running Docker Compose** with PostgreSQL, NestJS backend, and n8n all on one server.

### Why This Approach

- **Cheapest:** $5-12/month total vs $30-50/month for separate managed services
- **Simple:** One server, one `docker-compose.yml`, one place to monitor
- **UAE compliant:** All data stays on the UAE server
- **n8n included:** Self-hosted n8n runs on the same server (as planned in Phase 7)
- **Easy to scale later:** When traffic grows, split into separate services

### Recommended Setup

**Primary choice: AWS Lightsail me-central-1 ($5-10/month)**

Why AWS Lightsail:
- Confirmed UAE region (me-central-1)
- Predictable flat pricing (no surprise bills)
- 1 TB transfer included
- Easy to upgrade to EC2 later if needed
- Free tier available for new accounts

**Alternative: Azure UAE North B1ms (~$10-12/month)**
- Also confirmed UAE region
- Better if already using Azure for other services
- Reservation discounts reduce cost further

---

## Step-by-Step Migration Guide

### Prerequisites

- AWS account with me-central-1 region enabled
- SSH key pair for server access
- Current Supabase database credentials (from `.env`)
- Domain `origin-auto.ae` registered

### Step 1: Provision the Server

```bash
# Option A: AWS Lightsail (recommended)
# 1. Go to https://lightsail.aws.amazon.com
# 2. Select region: Middle East (UAE) — me-central-1
# 3. Pick OS: Ubuntu 22.04 LTS
# 4. Plan: $5/month (1 GB RAM, 2 vCPU, 40 GB SSD) or $10/month (2 GB RAM)
# 5. Name: origin-uae-prod
# 6. Create instance
# 7. Attach a static IP
# 8. Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (API — temporary)

# Option B: Azure UAE North
# az vm create \
#   --resource-group origin-prod \
#   --name origin-uae-prod \
#   --location uaenorth \
#   --image Ubuntu2204 \
#   --size Standard_B1ms \
#   --admin-username origin \
#   --ssh-key-values ~/.ssh/id_rsa.pub
```

### Step 2: Install Docker on the Server

```bash
# SSH into the server
ssh ubuntu@<server-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# Log out and back in for group changes
exit
ssh ubuntu@<server-ip>
```

### Step 3: Create Docker Compose Configuration

Create `~/origin/docker-compose.yml` on the server:

```yaml
version: '3.8'

services:
  # --- PostgreSQL Database ---
  postgres:
    image: postgres:16-alpine
    container_name: origin-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: origin
      POSTGRES_USER: origin_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"  # Only accessible from localhost
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U origin_admin -d origin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # --- NestJS Backend API ---
  backend:
    image: node:20-alpine
    container_name: origin-api
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./backend:/app
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://origin_admin:${DB_PASSWORD}@postgres:5432/origin
      DIRECT_URL: postgresql://origin_admin:${DB_PASSWORD}@postgres:5432/origin
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npm ci --production && npx prisma migrate deploy && node dist/main.js"

  # --- n8n Automation Engine ---
  n8n:
    image: n8nio/n8n:latest
    container_name: origin-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      N8N_HOST: n8n.origin-auto.ae
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://n8n.origin-auto.ae/
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: origin_admin
      DB_POSTGRESDB_PASSWORD: ${DB_PASSWORD}
      GENERIC_TIMEZONE: Asia/Dubai
      TZ: Asia/Dubai
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  # --- Caddy Reverse Proxy (auto HTTPS) ---
  caddy:
    image: caddy:2-alpine
    container_name: origin-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - n8n

volumes:
  pgdata:
  n8n_data:
  caddy_data:
  caddy_config:
```

Create `~/origin/Caddyfile`:

```
api.origin-auto.ae {
    reverse_proxy backend:3001
}

n8n.origin-auto.ae {
    reverse_proxy n8n:5678
}
```

### Step 4: Migrate the Database

```bash
# On your local machine (or any machine with access to both databases)

# 1. Export from Supabase (Frankfurt)
pg_dump \
  "postgresql://postgres.cjpejonpmjuhwwymhrmk:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --no-owner --no-acl --clean --if-exists \
  > origin_backup.sql

# 2. Create the n8n database on the new server
PGPASSWORD=$DB_PASSWORD psql -h <server-ip> -U origin_admin -d origin \
  -c "CREATE DATABASE n8n;"

# 3. Import into new UAE PostgreSQL
PGPASSWORD=$DB_PASSWORD psql -h <server-ip> -U origin_admin -d origin \
  < origin_backup.sql

# 4. Verify row counts match
PGPASSWORD=$DB_PASSWORD psql -h <server-ip> -U origin_admin -d origin \
  -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

### Step 5: Deploy the Backend

```bash
# On the server
cd ~/origin

# Clone the repo (backend only)
git clone --depth 1 https://github.com/maximumEffort/Car-Leasing-Business.git temp
cp -r temp/backend ./backend
rm -rf temp

# Build the backend
cd backend
npm ci
npm run build
cd ..

# Create .env file (copy from .env.example and fill in values)
cp backend/.env.example .env
# Edit .env with production values:
# - DATABASE_URL and DIRECT_URL: point to local postgres container
# - All API keys (WhatsApp, Checkout, Twilio, SendGrid, etc.)
# - APP_URL=https://api.origin-auto.ae
# - FRONTEND_URL=https://origin-auto.ae
nano .env

# Run Prisma migrations
cd backend
npx prisma migrate deploy
cd ..

# Start everything
docker compose up -d

# Check logs
docker compose logs -f
```

### Step 6: Update Environment Variables

#### Vercel — Website (`origin-car-leasing-website`)

```bash
# Update the API URL to point to the new UAE backend
# Vercel Dashboard → origin-car-leasing-website → Settings → Environment Variables
# Change:
NEXT_PUBLIC_API_URL=https://api.origin-auto.ae

# Also update when custom domain is ready:
NEXT_PUBLIC_SITE_URL=https://origin-auto.ae
```

#### Vercel — Admin Dashboard

```bash
# Vercel Dashboard → admin project → Settings → Environment Variables
# Change:
NEXT_PUBLIC_API_URL=https://api.origin-auto.ae
```

#### Backend .env (on UAE server)

```bash
# Key changes from current .env:
NODE_ENV=production
PORT=3001
APP_URL=https://api.origin-auto.ae
FRONTEND_URL=https://origin-auto.ae
ADMIN_URL=https://admin.origin-auto.ae

# Database now points to local Docker PostgreSQL:
DATABASE_URL=postgresql://origin_admin:${DB_PASSWORD}@postgres:5432/origin
DIRECT_URL=postgresql://origin_admin:${DB_PASSWORD}@postgres:5432/origin

# CORS — update with new domains:
CORS_ALLOWED_ORIGINS=https://origin-auto.ae,https://admin.origin-auto.ae,https://www.origin-auto.ae
```

### Step 7: DNS Setup for origin-auto.ae

```
# DNS Records to configure at your .ae registrar:

# Website (Vercel)
A     @              76.76.21.21
CNAME www            cname.vercel-dns.com

# Backend API (UAE server)
A     api            <uae-server-static-ip>

# n8n Automation (UAE server)
A     n8n            <uae-server-static-ip>

# Admin Dashboard (Vercel — if using subdomain)
CNAME admin          cname.vercel-dns.com

# Email (SendGrid)
CNAME em1234         u1234.wl.sendgrid.net
TXT   @              v=spf1 include:sendgrid.net ~all
```

### Step 8: Verify Everything Works

```bash
# 1. Check backend health
curl https://api.origin-auto.ae/health

# 2. Check API docs
open https://api.origin-auto.ae/docs

# 3. Check n8n is accessible
open https://n8n.origin-auto.ae

# 4. Check website loads and connects to API
open https://origin-auto.ae

# 5. Test a vehicle search endpoint
curl https://api.origin-auto.ae/v1/vehicles?limit=5

# 6. Verify database latency (should be <5ms since it's local)
docker exec origin-db psql -U origin_admin -d origin \
  -c "EXPLAIN ANALYZE SELECT 1;"
```

---

## Post-Migration Checklist

- [ ] Database migrated and row counts verified
- [ ] Backend responding on `api.origin-auto.ae`
- [ ] n8n accessible on `n8n.origin-auto.ae`
- [ ] Vercel env vars updated to point to new API
- [ ] Website loads and fetches data from UAE backend
- [ ] Admin dashboard loads and connects to UAE backend
- [ ] SSL certificates auto-provisioned by Caddy
- [ ] Supabase Frankfurt database backed up and archived
- [ ] Railway deployment paused/deleted (no longer needed)
- [ ] Set up automated daily database backups
- [ ] Monitor server resource usage for first week

---

## Backup Strategy

```bash
# Add to crontab on the server:
# Daily backup at 3 AM GST
0 3 * * * docker exec origin-db pg_dump -U origin_admin origin | gzip > /home/ubuntu/backups/origin_$(date +\%Y\%m\%d).sql.gz

# Keep last 30 days
0 4 * * * find /home/ubuntu/backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Scaling Path (When Needed)

This single-server setup handles the launch phase. When traffic grows:

1. **First upgrade:** Increase server size ($10-20/month for 2-4 GB RAM)
2. **Split database:** Move PostgreSQL to managed RDS/Azure PostgreSQL (~$22-25/month extra)
3. **Split n8n:** Move n8n to its own small server ($5/month)
4. **Add Redis:** For session caching and rate limiting
5. **Load balancer:** When you need multiple backend instances
6. **Multi-country:** See `backend/src/config/countries.ts` for the config foundation

---

## Cost Summary

| Phase | Setup | Monthly Cost |
|---|---|---|
| **Launch (now)** | Single VPS: Docker Compose (PostgreSQL + NestJS + n8n + Caddy) | **$5-10/month** |
| **Growth** | Bigger VPS (4 GB RAM) | **$20/month** |
| **Scale** | Separate DB + backend + n8n | **$40-60/month** |
| **Enterprise** | Managed services (RDS, ECS/AKS, dedicated n8n) | **$100+/month** |

> Website and admin dashboard stay on Vercel (free tier or $20/month Pro) regardless of backend setup.
