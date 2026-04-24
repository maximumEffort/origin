# n8n Setup Guide — Origin Car Leasing Platform

This guide covers the deployment, configuration, and ongoing management of n8n for the Origin car leasing platform in Dubai. All automations run on a self-hosted n8n instance in a UAE-region server to comply with data residency requirements.

---

## Prerequisites

Before starting the n8n setup, ensure you have:

### Infrastructure
- **Server:** UAE-region (Azure UAE North `uaenorth` or AWS me-central-1 `me-central-1`)
  - Minimum: 2 vCPU, 4GB RAM, 50GB SSD
  - Recommended: 4 vCPU, 8GB RAM, 100GB SSD for production
- **Operating System:** Ubuntu 20.04 LTS or later (Linux-preferred for cost and compatibility)
- **Docker & Docker Compose:** Version 20.10+ and 1.29+
  - Install: `curl -fsSL https://get.docker.com | sh && sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose`

### Domain & SSL
- **Domain:** `n8n.[domain].ae` (e.g., `n8n.origin.ae`)
- **DNS A record:** Point to your server's public IP
- **SSL certificate:** Valid certificate for the domain
  - Option A (Recommended): Let's Encrypt (free, auto-renewing via Certbot)
  - Option B: Purchase from SSL provider (Cloudflare, DigiCert, etc.)

### Third-Party Credentials
Have ready (from earlier setup):
- WhatsApp Business Access Token and Phone Number ID
- Twilio Account SID and Auth Token
- SendGrid API Key
- Firebase Service Account JSON
- Checkout.com API keys (optional)
- Tabby API key (optional)

### Database
- **PostgreSQL 12+** (self-hosted or managed service)
  - n8n stores workflow definitions, execution history, and credentials in PostgreSQL
  - Managed options: Azure Database for PostgreSQL (UAE region), AWS RDS PostgreSQL (me-central-1)

---

## Option A: Docker Compose (Recommended)

Self-hosting n8n via Docker Compose provides full control, compliance with UAE data residency, and cost efficiency for single-server deployments.

### Step 1: Prepare the Server

```bash
# SSH into your UAE-region server
ssh ubuntu@[your-server-ip]

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Create Directory Structure

```bash
# Create n8n project directory
mkdir -p /opt/n8n
cd /opt/n8n

# Create subdirectories
mkdir -p data logs backups certs
chmod 755 data logs backups certs
```

### Step 3: Create Environment File

Create `/opt/n8n/.env` with all required variables:

```env
# n8n Core
N8N_HOST=n8n.origin.ae
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_PATH=/
N8N_EXPOSE_API=true
NODE_ENV=production
WEBHOOK_TUNNEL_URL=https://n8n.origin.ae/

# Database (PostgreSQL)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=[generate-strong-password]
DB_POSTGRESDB_SSL=true

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
ENCRYPTION_KEY=[generate-32-char-hex-string]

# Backend API Integration
BACKEND_API_URL=https://api.origin.ae/v1
BACKEND_API_KEY=[generate-jwt-or-api-key]
BACKEND_REQUEST_TIMEOUT=30000

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=[from-meta-business]
WHATSAPP_PHONE_NUMBER_ID=[from-meta-business]
WHATSAPP_BUSINESS_ACCOUNT_ID=[from-meta-business]

# Twilio
TWILIO_ACCOUNT_SID=[from-twilio]
TWILIO_AUTH_TOKEN=[from-twilio]
TWILIO_FROM_NUMBER=+971XXXXXXXXX

# SendGrid
SENDGRID_API_KEY=[from-sendgrid]
SENDGRID_FROM_EMAIL=noreply@origin.ae
SENDGRID_FROM_NAME=Origin Car Leasing

# Firebase
FIREBASE_PROJECT_ID=[from-firebase]
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", ...}

# Admin & Team Contacts
ADMIN_WHATSAPP_NUMBER=+971XXXXXXXXX
ADMIN_EMAIL=admin@origin.ae
FLEET_MANAGER_WHATSAPP=+971XXXXXXXXX
FLEET_MANAGER_EMAIL=fleet@origin.ae
SALES_TEAM_PHONES=+971XXXXXXXXX,+971YYYYYYYYY
SALES_MANAGER_PHONE=+971XXXXXXXXX
COMPANY_NAME=Origin

# Frontend URLs
FRONTEND_URL=https://origin.ae
CUSTOMER_PORTAL_URL=https://portal.origin.ae
ADMIN_PORTAL_URL=https://admin.origin.ae

# Logging & Monitoring
LOG_LEVEL=info
LOG_OUTPUT=console
N8N_LOG_FILE_COUNT_MAX=10
N8N_LOG_FILES_MAX_SIZE_MB=100

# Security
WEBHOOK_SECRET=[generate-random-string-32-chars]
```

**Generate secure values:**
```bash
# Generate ENCRYPTION_KEY (32 hex chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate WEBHOOK_SECRET (32 random chars)
openssl rand -base64 32

# Generate DB password (16+ chars)
openssl rand -base64 16

# For FIREBASE_SERVICE_ACCOUNT_JSON, paste entire JSON on one line (escape quotes)
```

### Step 4: Create docker-compose.yml

Create `/opt/n8n/docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_POSTGRESDB_DATABASE}
      POSTGRES_USER: ${DB_POSTGRESDB_USER}
      POSTGRES_PASSWORD: ${DB_POSTGRESDB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - n8n-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_POSTGRESDB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # Load from .env file
      N8N_HOST: ${N8N_HOST}
      N8N_PORT: ${N8N_PORT}
      N8N_PROTOCOL: ${N8N_PROTOCOL}
      N8N_PATH: ${N8N_PATH}
      N8N_EXPOSE_API: ${N8N_EXPOSE_API}
      NODE_ENV: ${NODE_ENV}
      WEBHOOK_TUNNEL_URL: ${WEBHOOK_TUNNEL_URL}

      # Database
      DB_TYPE: ${DB_TYPE}
      DB_POSTGRESDB_HOST: ${DB_POSTGRESDB_HOST}
      DB_POSTGRESDB_PORT: ${DB_POSTGRESDB_PORT}
      DB_POSTGRESDB_DATABASE: ${DB_POSTGRESDB_DATABASE}
      DB_POSTGRESDB_USER: ${DB_POSTGRESDB_USER}
      DB_POSTGRESDB_PASSWORD: ${DB_POSTGRESDB_PASSWORD}
      DB_POSTGRESDB_SSL: ${DB_POSTGRESDB_SSL}

      # Encryption
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}

      # Third-party APIs
      BACKEND_API_URL: ${BACKEND_API_URL}
      BACKEND_API_KEY: ${BACKEND_API_KEY}
      WHATSAPP_ACCESS_TOKEN: ${WHATSAPP_ACCESS_TOKEN}
      WHATSAPP_PHONE_NUMBER_ID: ${WHATSAPP_PHONE_NUMBER_ID}
      WHATSAPP_BUSINESS_ACCOUNT_ID: ${WHATSAPP_BUSINESS_ACCOUNT_ID}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      TWILIO_FROM_NUMBER: ${TWILIO_FROM_NUMBER}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      SENDGRID_FROM_EMAIL: ${SENDGRID_FROM_EMAIL}
      SENDGRID_FROM_NAME: ${SENDGRID_FROM_NAME}
      FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
      FIREBASE_SERVICE_ACCOUNT_JSON: ${FIREBASE_SERVICE_ACCOUNT_JSON}

      # Admin Contacts
      ADMIN_WHATSAPP_NUMBER: ${ADMIN_WHATSAPP_NUMBER}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      FLEET_MANAGER_WHATSAPP: ${FLEET_MANAGER_WHATSAPP}
      FLEET_MANAGER_EMAIL: ${FLEET_MANAGER_EMAIL}
      SALES_TEAM_PHONES: ${SALES_TEAM_PHONES}
      SALES_MANAGER_PHONE: ${SALES_MANAGER_PHONE}
      COMPANY_NAME: ${COMPANY_NAME}

      # Frontend URLs
      FRONTEND_URL: ${FRONTEND_URL}
      CUSTOMER_PORTAL_URL: ${CUSTOMER_PORTAL_URL}
      ADMIN_PORTAL_URL: ${ADMIN_PORTAL_URL}

      # Logging
      LOG_LEVEL: ${LOG_LEVEL}
      LOG_OUTPUT: ${LOG_OUTPUT}
      N8N_LOG_FILE_COUNT_MAX: ${N8N_LOG_FILE_COUNT_MAX}
      N8N_LOG_FILES_MAX_SIZE_MB: ${N8N_LOG_FILES_MAX_SIZE_MB}

      # Security
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}

    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./data:/data
      - ./logs:/logs
    networks:
      - n8n-network
    labels:
      - "com.example.description=n8n Workflow Automation"

  # Traefik Reverse Proxy (Alternative to nginx)
  traefik:
    image: traefik:v2.10
    container_name: n8n-traefik
    restart: unless-stopped
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@origin.ae"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./certs/letsencrypt:/letsencrypt
    networks:
      - n8n-network
    labels:
      - "traefik.enable=true"

volumes:
  postgres_data:
  n8n_data:

networks:
  n8n-network:
    driver: bridge
```

### Step 5: Configure Traefik for SSL

Create `/opt/n8n/traefik/config.yml` for n8n routing:

```yaml
# dynamic_conf.yml
http:
  routers:
    n8n:
      rule: "Host(`n8n.origin.ae`)"
      service: n8n
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - auth

  services:
    n8n:
      loadBalancer:
        servers:
          - url: "http://n8n:5678"

  middlewares:
    auth:
      basicAuth:
        users:
          - "admin:[hashed-bcrypt-password]"
```

Generate a bcrypt hash for admin password:
```bash
docker run --rm caddy htpasswd -c -b -B 10 /dev/null admin MySecurePassword123 | cut -d: -f2
```

### Step 6: Deploy with Docker Compose

```bash
cd /opt/n8n

# Pull images and start containers
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f n8n

# Monitor database health
docker-compose logs postgres
```

Expected output:
```
CONTAINER ID   IMAGE                  STATUS
xyz123         n8nio/n8n              Up 2 minutes (healthy)
abc456         postgres:15-alpine     Up 2 minutes (healthy)
def789         traefik:v2.10          Up 2 minutes
```

### Step 7: Verify Installation

```bash
# Test n8n API endpoint
curl -k -H "Authorization: Bearer [your-jwt-token]" https://n8n.origin.ae/api/v1/workflows

# Check SSL certificate
openssl s_client -connect n8n.origin.ae:443 -servername n8n.origin.ae

# Verify database connection
docker-compose exec postgres psql -U n8n -d n8n -c "SELECT version();"
```

---

## Option B: n8n Cloud (Early-Stage Alternative)

For initial evaluation or if self-hosting is not immediately feasible, n8n Cloud is available. However, it is **not recommended for production** due to data residency concerns.

### Limitations (Why Not for Production)
- Data stored in n8n Cloud infrastructure (US/EU), not UAE region
- Higher cost at scale (usage-based billing)
- Less control over uptime/availability
- Cannot integrate with internal tools without internet exposure

### If Using n8n Cloud (Temporary):
1. Sign up at https://n8n.cloud
2. Create new workspace
3. Import workflows from JSON files (same as Docker setup)
4. Configure credentials in Settings → Credentials
5. Plan migration to self-hosted before going live

---

## Post-Installation Configuration

### Step 1: Initial Admin Setup

1. Navigate to `https://n8n.origin.ae` in browser
2. On first load, you'll see **Setup Wizard**:
   - Email: `admin@origin.ae`
   - Password: Create strong password (16+ chars, mixed case, numbers, symbols)
   - Save to password manager
3. Click **Finish Setup**

### Step 2: Import Workflows

1. In n8n dashboard, click **Workflows** (left sidebar)
2. Click **+ New** → **Import from file**
3. Upload each JSON file from `/automations/workflows/`:
   - `01-booking-confirmation.json`
   - `02-kyc-alert.json`
   - `03-lease-reminder.json`
   - `04-payment-sequence.json`
   - `05-fleet-maintenance.json`
   - `06-daily-digest.json`
   - `07-lead-management.json`
4. Verify workflow structure displays correctly
5. Click **Save**

### Step 3: Configure Credentials

1. Go to **Settings** → **Credentials** (left sidebar)
2. For each credential type, click **+ New Credential**:

#### WhatsApp Credential
- **Credential Type:** HTTP Request (custom)
- **Name:** WhatsApp Business API
- **Auth type:** Bearer Token
- **Token:** Paste `WHATSAPP_ACCESS_TOKEN` from `.env`
- **Test:** Leave blank for now, test via webhook

#### Twilio Credential
- **Credential Type:** Twilio
- **Account SID:** `TWILIO_ACCOUNT_SID`
- **Auth Token:** `TWILIO_AUTH_TOKEN`
- **Test:** Click "Test" to verify

#### SendGrid Credential
- **Credential Type:** SendGrid
- **API Key:** `SENDGRID_API_KEY`
- **Test:** Click "Test" to verify

#### Firebase Credential
- **Credential Type:** Firebase
- **Service Account JSON:** Paste entire JSON from `.env`
- **Test:** Click "Test" to verify

#### Backend API (NestJS)
- **Credential Type:** HTTP Request (custom)
- **Name:** Origin Backend API
- **Auth type:** Bearer Token
- **Token:** `BACKEND_API_KEY`
- **Base URL:** `BACKEND_API_URL`
- **Test:** Click "Test" (requires backend running)

### Step 4: Configure Environment Variables in n8n

Some variables should also be set inside n8n for easier access by workflows:

1. Go to **Settings** → **Environment Variables** (if available in your n8n version)
2. Add key-value pairs:
   - `ADMIN_WHATSAPP_NUMBER`
   - `ADMIN_EMAIL`
   - `COMPANY_NAME`
   - Etc.

Alternatively, reference them from `.env` in the docker-compose setup (already injected into n8n container).

### Step 5: Test Each Workflow

#### Test Webhook-Triggered Workflows
Use Postman or curl to send test payloads:

```bash
# Test booking-confirmation webhook
curl -X POST https://n8n.origin.ae/webhook/booking-confirmation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -d '{
    "bookingId": "BOOK-2026-00123",
    "customerName": "Test Customer",
    "customerPhone": "+971501234567",
    "customerEmail": "test@example.com",
    "language": "en",
    "vehicleModel": "BYD Qin DM-i",
    "leaseDuration": 30,
    "monthlyRate": 1200,
    "depositAmount": 2500,
    "startDate": "2026-04-15",
    "paymentUrl": "https://checkout.origin.ae/invoice/TEST-001"
  }'
```

Expected response:
```json
{
  "status": "queued",
  "workflowId": "abc123",
  "executionId": "xyz789"
}
```

#### Test Cron-Triggered Workflows
1. Open workflow in n8n editor
2. Click **Execute Workflow** button (top right)
3. Workflow runs immediately; check **Execution History** for results

### Step 6: Enable Workflows

For webhook workflows:
1. Open workflow in editor
2. Click **Save** button
3. Toggle **Active** switch ON (right sidebar)

For cron workflows:
1. Open workflow in editor
2. Verify **Cron** node has correct schedule
3. Click **Save**
4. Toggle **Active** switch ON

---

## Security Configuration

### Basic Authentication for n8n UI

To require login for accessing the n8n dashboard:

```env
# Add to .env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=[bcrypt-hashed-password]
```

Generate hashed password (bcrypt with cost 10):
```bash
docker run --rm caddy htpasswd -c -b -B 10 /dev/null admin YourSecurePassword | cut -d: -f2
```

### Webhook Authentication

All webhooks from the backend include a bearer token:

```
Authorization: Bearer [WEBHOOK_SECRET]
```

In each webhook node, validate the token:

1. Open **Webhook** node
2. In **Authentication** dropdown, select **Bearer Token**
3. Paste `WEBHOOK_SECRET` value
4. Check **Validate Authorization Header**

### IP Allowlisting (Optional)

If backend is on a fixed IP, restrict webhook access:

1. Configure Traefik middleware in traefik config:

```yaml
middlewares:
  ipwhitelist:
    ipWhiteList:
      sourceRange:
        - "203.0.113.0/24"  # Replace with backend IP range
```

2. Apply middleware to n8n router:

```yaml
routers:
  n8n:
    middlewares:
      - ipwhitelist
```

### Database SSL/TLS

Ensure PostgreSQL connection uses SSL:

```env
DB_POSTGRESDB_SSL=true
```

For self-hosted PostgreSQL, create certificates:
```bash
# Generate self-signed cert for PostgreSQL
docker exec n8n-postgres bash -c "
  openssl req -new -x509 -days 365 -nodes \
  -out /var/lib/postgresql/server.crt \
  -keyout /var/lib/postgresql/server.key \
  -subj '/CN=postgres'
"
```

### Encryption Key Rotation

The `ENCRYPTION_KEY` encrypts sensitive data (API keys, credentials). To rotate:

1. Generate new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

2. Update `.env` with new key
3. Restart n8n:
   ```bash
   docker-compose restart n8n
   ```

**Important:** Old credentials must be re-entered after rotation.

---

## Monitoring & Logging

### n8n Built-in Monitoring

**Execution History:**
- Dashboard → Workflows → Select workflow → **Execution History**
- View status (success/failed), duration, error messages
- Default retention: 30 days (configurable)

**Logs:**
- Open workflow → Right sidebar → **Execution Details** → **Logs**
- View node-by-node output, debug info

### Docker Logs

```bash
# View real-time n8n logs
docker-compose logs -f n8n

# View PostgreSQL logs
docker-compose logs -f postgres

# View all services
docker-compose logs
```

### Log Forwarding (Optional)

Forward logs to a centralized service (CloudWatch, DataDog, ELK):

In `.env`:
```env
LOG_OUTPUT=file,console
N8N_LOG_FILE_LOCATION=/logs/n8n.log
```

Mount logs directory and stream to your logging service.

### Alerts for Failed Workflows

Create a webhook workflow that monitors execution failures:

1. Create new workflow: **Monitor Workflow Failures**
2. Trigger: **Cron** (every 5 minutes)
3. Action:
   ```
   → Get execution list (API call to n8n internal API)
   → Filter failed executions
   → Send alert to ADMIN_EMAIL
   ```

### Metrics to Monitor

- **Workflow execution success rate** (target: >95%)
- **API response time** (target: <5s for webhooks)
- **Database size** (archive old logs if >50GB)
- **Disk usage** (alert if >80%)
- **Memory usage** (n8n should stay <2GB in normal operation)

---

## Backup & Disaster Recovery

### Automated Database Backups

Create a backup script (`/opt/n8n/backup.sh`):

```bash
#!/bin/bash

# Backup PostgreSQL database
BACKUP_DIR=/opt/n8n/backups
BACKUP_FILE="$BACKUP_DIR/n8n-db-$(date +%Y%m%d-%H%M%S).sql"

docker-compose exec -T postgres pg_dump -U n8n n8n | gzip > "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "n8n-db-*.sql.gz" -mtime +7 -delete

# Copy to cloud storage (Azure Blob or AWS S3)
az storage blob upload \
  --account-name "originbackups" \
  --container-name "n8n" \
  --name "$(basename $BACKUP_FILE)" \
  --file "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"
```

Schedule via cron (daily at 2 AM):
```bash
crontab -e
# Add line:
0 2 * * * /opt/n8n/backup.sh
```

### n8n Data Export

Export workflow definitions regularly:

1. Dashboard → **Workflows**
2. For each workflow, click **...** → **Download**
3. Store in version control (`automations/workflows/`)

### Full System Backup

For complete disaster recovery:

```bash
# Backup entire /opt/n8n directory
tar -czf /backups/n8n-$(date +%Y%m%d).tar.gz /opt/n8n

# Upload to cloud
aws s3 cp /backups/n8n-*.tar.gz s3://origin-backups/n8n/ --sse AES256
```

### Disaster Recovery Plan

**If n8n server fails:**

1. Provision new server in same UAE region
2. Install Docker & Docker Compose
3. Restore `/opt/n8n` from backup:
   ```bash
   tar -xzf /backups/n8n-YYYYMMDD.tar.gz -C /
   ```
4. Update DNS A record to new server IP
5. Restart containers:
   ```bash
   cd /opt/n8n
   docker-compose up -d
   ```
6. Verify workflows are active

**RTO (Recovery Time Objective):** 30 minutes
**RPO (Recovery Point Objective):** 24 hours

---

## Scaling & Performance Tuning

### For High-Volume Usage

As the platform grows, optimize n8n performance:

1. **Increase n8n container resources:**
   ```yaml
   # In docker-compose.yml
   services:
     n8n:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
           reservations:
             cpus: '1'
             memory: 2G
   ```

2. **PostgreSQL tuning:**
   ```env
   # In .env
   DB_POSTGRESDB_POOL_MAX=20
   DB_POSTGRESDB_POOL_MIN=5
   ```

3. **Workflow concurrency:**
   - Limit concurrent executions per workflow to avoid overwhelming backend:
     ```
     Workflow Settings → Execution → Max Concurrent Executions: 5
     ```

4. **Archive old execution history:**
   ```sql
   -- In PostgreSQL, delete executions older than 90 days
   DELETE FROM execution
   WHERE started_at < NOW() - INTERVAL '90 days';
   ```

### Load Balancing (Multi-Instance)

For multiple n8n instances behind load balancer:

1. Use shared PostgreSQL (external managed service)
2. Use shared Redis for workflow queue
3. Configure Traefik with multiple n8n upstreams:

```yaml
services:
  n8n-1:
    ...
  n8n-2:
    ...
  n8n-3:
    ...

# traefik config
http:
  services:
    n8n:
      loadBalancer:
        servers:
          - url: "http://n8n-1:5678"
          - url: "http://n8n-2:5678"
          - url: "http://n8n-3:5678"
```

---

## Maintenance & Updates

### Regular Maintenance Tasks

**Weekly:**
- [ ] Review execution history for errors
- [ ] Check failed workflows and fix issues
- [ ] Monitor disk/memory usage
- [ ] Test backup restoration process

**Monthly:**
- [ ] Review and rotate API credentials/tokens
- [ ] Update workflow message templates if needed
- [ ] Archive old execution logs
- [ ] Review cost (if using managed services)

**Quarterly:**
- [ ] Upgrade n8n to latest stable version
- [ ] Rotate encryption keys
- [ ] Conduct security audit
- [ ] Review and optimize slow workflows

### Upgrading n8n

```bash
# Check current version
docker-compose exec n8n npm list n8n

# Update to latest stable
cd /opt/n8n
docker-compose pull n8n
docker-compose up -d n8n

# Verify health
docker-compose ps
docker-compose logs -f n8n
```

**Always backup before upgrading:**
```bash
/opt/n8n/backup.sh
```

---

## Troubleshooting

### Common Issues

#### Webhook Returns 401 Unauthorized
**Cause:** Bearer token mismatch
**Fix:**
1. Verify `WEBHOOK_SECRET` in `.env` matches in workflow node
2. Ensure header is `Authorization: Bearer [token]`
3. Check webhook node has auth enabled

#### Workflow Execution Hangs
**Cause:** Timeout, slow API, or dead lock
**Fix:**
1. Set timeout in HTTP request nodes: **Request Timeout: 10000ms**
2. Check backend API is responsive
3. Review logs in execution history

#### PostgreSQL Connection Error
**Cause:** Database not ready, wrong credentials
**Fix:**
```bash
# Check database health
docker-compose exec postgres pg_isready -U n8n

# Verify credentials in .env
# Restart PostgreSQL
docker-compose restart postgres
```

#### High Memory Usage
**Cause:** Large workflow payloads, long-running executions
**Fix:**
1. Split large workflows into sub-workflows
2. Increase container memory limit
3. Archive old execution history
4. Clear n8n cache:
   ```bash
   docker-compose exec n8n rm -rf /home/node/.n8n/cache
   ```

### Getting Help

- **n8n Documentation:** https://docs.n8n.io
- **Community Forum:** https://community.n8n.io
- **GitHub Issues:** https://github.com/n8n-io/n8n/issues

---

## Appendix: Environment Variables Quick Reference

| Variable | Example | Purpose |
|---|---|---|
| `N8N_HOST` | `n8n.origin.ae` | Public domain for n8n |
| `N8N_PROTOCOL` | `https` | Use SSL |
| `DB_POSTGRESDB_HOST` | `postgres` | PostgreSQL container name |
| `ENCRYPTION_KEY` | `abc123...` | Encrypt sensitive data |
| `WEBHOOK_SECRET` | `xyz789...` | Authenticate incoming webhooks |
| `WHATSAPP_ACCESS_TOKEN` | From Meta | WhatsApp API token |
| `TWILIO_ACCOUNT_SID` | From Twilio | Twilio account identifier |
| `SENDGRID_API_KEY` | From SendGrid | Email API key |
| `FIREBASE_PROJECT_ID` | From Firebase | Push notification service |
| `BACKEND_API_URL` | `https://api.origin.ae/v1` | NestJS backend endpoint |
| `ADMIN_EMAIL` | `admin@origin.ae` | Alert recipient |

---

## Version History

| Date | Version | Changes |
|---|---|---|
| 2026-03-30 | 1.0.0 | Initial n8n setup guide for Origin platform |
