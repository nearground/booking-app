# PUERTO VALLARTA TODAY - Docker Deployment Guide

This guide covers development and production deployment for the PUERTO VALLARTA TODAY stack.

## Architecture

The project runs as Docker services:

- Frontend (React)
- Backend (Express API)
- Database (MySQL)
- Optional helpers: phpMyAdmin and local R2 worker in development

## Access URLs

- Frontend (development): <http://localhost:8080>
- Frontend (production): <http://localhost>
- Backend API: <http://localhost:4000>
- phpMyAdmin (host only): <http://localhost:8081>

## Cloudflare Tunnel Deployment

For a tunnel running on the host computer, route `puertovallarta.today` to
`http://localhost:8080` and start the hardened overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
```

Docker Compose 2.24.4 or newer is required for the overlay's port replacement.
Always include both files for tunnel rebuilds, restarts, and updates. This keeps
the same project, database volume, and local media volume as development; it
does not create a disposable database.

The overlay:

- Serves a production frontend build with Nginx, without Vite, HMR, or source mounts.
- Runs the backend in production mode without source mounts.
- Publishes only loopback endpoints; API, MySQL, local storage, and phpMyAdmin
  cannot be reached directly from another LAN device.
- Sets the public URL and CORS origin to `https://puertovallarta.today`,
  uses same-origin media URLs, and requires HTTPS-only cookies.
- Disables automatic schema synchronization and scheduling. Apply migrations
  deliberately and run a scheduler separately if the deployment needs one.

Set `JWT_SECRET` in the ignored root `.env` before starting. Generate it with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The backend refuses to start with a missing secret, fewer than 32 non-padding
characters, or the known example value. Rotation signs out existing users.
Never commit the generated secret or paste it into tickets or logs.
Set unique `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` values for a new database.
For an existing MySQL volume, changing `.env` alone does not rotate stored
passwords; coordinate SQL account changes and application configuration.

Use `https://puertovallarta.today` for authenticated testing. Plain HTTP on a
phone's LAN address is intentionally unavailable in tunnel mode. If you switch
back to local hot reload with `docker compose up -d --build`, stop the public
tunnel first; development mode must not be published. The dev server rejects
the public hostname as an additional safeguard.

Cloudflare Access is recommended for demos and must be configured in your
Cloudflare account; this repository does not configure Access policies or DNS.
Keep Docker and dependencies patched. The overlay still uses local MySQL,
Redis, and a development R2 worker; it is not a complete managed-production
deployment. Public media remains publicly readable by object URL. Use test
data for demos, protect backups, and do not store private documents there.

The tunnel requires no inbound port forwarding. Remove any obsolete Windows
firewall exception if you no longer need LAN development access.

## Prerequisites

- Docker 20.10+
- Docker Compose 2+
- At least 2 GB free disk space (4 GB recommended)

## Production-Safe Sequence (Recommended)

Use this sequence for resilient releases.

Before shipping, run the full E2E checklist in
[E2E_TESTING.md](docs/legacy/E2E_TESTING.md).

1. Prepare production environment values in `.env`.
2. Apply database migrations.
3. Start production services.
4. Keep scheduler enabled on only one worker instance.
5. Verify backend startup logs.

### 1) Prepare `.env` for production

Set these values explicitly:

- `DB_SYNC_ON_STARTUP=false`
- `DB_SYNC_FORCE=false`
- `SCHEDULER_SYNC_ENABLED=false` (for regular API replicas)
- `COOKIE_SECURE=true`
- `CORS_ALLOWED_ORIGINS` to strict trusted origins only

### 2) Apply database migrations

```bash
docker-compose -f docker-compose.prod.yml run --rm backend npx sequelize-cli db:migrate
```

### 3) Start production services

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4) Run scheduler in exactly one place

Recommended approach:

- Keep `SCHEDULER_SYNC_ENABLED=false` on all API replicas.
- Run a dedicated worker/container with `SCHEDULER_SYNC_ENABLED=true`.

### 5) Verify startup logs

```bash
docker-compose -f docker-compose.prod.yml logs --tail=120 backend
```

Expected indicators include:

- `Database sync on startup is disabled; migrations should be applied separately`
- Scheduler enabled/disabled state matching your deployment topology

## Development Deployment

### Start (with hot reload)

```bash
docker-compose up -d --build
```

### Verify services

```bash
docker-compose ps
```

### Logs

```bash
docker-compose logs -f
```

### Development Stop

```bash
docker-compose down
```

## Production Deployment

### Start

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Stop

```bash
docker-compose -f docker-compose.prod.yml down
```

### Production Logs

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## Helper Commands

You can also use helper scripts and Make targets.

### Windows helper

```cmd
docker-manager.bat prod-deploy
```

### Linux/macOS helper

```bash
./docker-manager.sh prod-deploy
```

### Makefile

```bash
make prod-deploy
```

`prod-deploy` performs migration-first rollout and then prints backend startup logs.

## Database Access

```bash
docker-compose exec database mysql -u staybooker -p
```

Inside MySQL:

```sql
USE staybooker;
SHOW TABLES;
```

## Troubleshooting

### Port already allocated

- Check host port usage and stop conflicting services.
- Or change port mappings in compose files.

### Backend cannot connect to database

- Inspect DB logs:

```bash
docker-compose logs database
```

- Confirm `*_DB_*` values in `.env`.

### Backend startup issues

- Inspect backend logs:

```bash
docker-compose logs backend
```

- Verify JWT, CORS, cookie, and startup control environment variables.

### Frontend blank page

- Verify frontend container health.
- Inspect frontend logs:

```bash
docker-compose logs frontend
```

### Full reset

```bash
docker-compose down -v
docker-compose up -d --build
```

Warning: this removes persisted Docker volume data.


## Organization site wildcard routing (production launch only)

No Cloudflare changes are needed for local development or seeded demos. After creating a fresh development database and running the existing seeders, open `/o/martinllc` or `/o/testcompany1`, `/o/testcompany2`, `/o/testcompany3` on the main localhost/LAN frontend. The demo organizations showcase the classic, editorial and immersive templates. Media defaults to no logo/cover until an admin uploads it.

At production launch, an operator must manually:

1. Add a Cloudflare wildcard DNS record `*.puertovallarta.today` pointing to the existing tunnel.
2. Add a matching Tunnel ingress rule for `*.puertovallarta.today` to the production web service, before the catch-all rule. Keep the existing apex `puertovallarta.today` ingress and origin rules.
3. Verify that a one-level host such as `sample.puertovallarta.today` reaches the same frontend/nginx service and that the API remains proxied to the existing backend.

These DNS/tunnel steps are deferred until production launch; the application does not make them. Do not widen `COOKIE_DOMAIN`: organization sites remain separate hosts and booking continues on the main site.
