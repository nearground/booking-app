# PUERTO VALLARTA TODAY - Quick Start

## First-Time Setup

1. Copy the environment file.

```bash
cp .env.example .env
```

Windows Command Prompt alternative:

```cmd
copy .env.example .env
```

1. Edit `.env` as needed (defaults work for local development).

## Docker Manager Scripts

### Windows

```cmd
docker-manager.bat start
docker-manager.bat stop
docker-manager.bat logs
docker-manager.bat status
docker-manager.bat clean
docker-manager.bat prod-deploy
```

### Linux/macOS

```bash
chmod +x docker-manager.sh
./docker-manager.sh start
./docker-manager.sh stop
./docker-manager.sh logs
./docker-manager.sh status
./docker-manager.sh clean
./docker-manager.sh prod-deploy
```

`prod-deploy` runs a migration-first production release sequence using `docker-compose.prod.yml`.

## Direct Docker Compose

### Showcase seed media

The demo seeder uploads the checked-in showcase images, hero video, and poster to
the same R2 storage worker used by API media uploads. Start `r2-local` and configure
matching `R2_DEV_TOKEN` values before seeding; no running API or login is required.
Development Compose mounts `frontend/public` read-only at `/demo-assets` and sets
`SHOWCASE_MEDIA_ASSETS_DIR` for the backend.

Outside Compose, the seeder defaults to the repository's `frontend/public`.
For production or backend-only installations, provide that complete asset directory
and set `SHOWCASE_MEDIA_ASSETS_DIR` to its absolute path, plus an accessible
`R2_WORKER_BASE_URL` and matching `R2_DEV_TOKEN`. Missing assets or failed uploads
abort seeding rather than persisting broken media keys. Repeated uploads of unchanged
fixtures use deterministic, owner-scoped keys and safely overwrite the same objects.

### Start services

```bash
docker-compose up -d --build
```

### Stop services

```bash
docker-compose down
```

### View logs

```bash
docker-compose logs -f
```

Service-specific logs:

```bash
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f database
```

### Check status

```bash
docker-compose ps
```

### Rebuild a specific service

```bash
docker-compose up -d --build frontend
docker-compose up -d --build backend
```

### Production-safe deployment

```bash
docker-compose -f docker-compose.prod.yml run --rm backend npx sequelize-cli db:migrate
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml logs --tail=120 backend
```

### Access MySQL

```bash
docker-compose exec database mysql -u staybooker -p
```

### Clean all containers and volumes

```bash
docker-compose down -v
```

## End-to-End Testing

Run the complete organizer-recruiting and security-hardening validation checklist:

- [E2E_TESTING.md](docs/legacy/E2E_TESTING.md)

## Access URLs

- Frontend: <http://localhost:3000> (development)
- Backend API: <http://localhost:4000>
- Database host: `localhost:3306`

## Local R2 (Wrangler)

In Docker Compose development mode, `r2-local` starts automatically with backend.

If running outside Docker:

```bash
cd r2-local
npm install
npm run dev
```

Endpoints:

- <http://127.0.0.1:8787/health>
- `PUT http://127.0.0.1:8787/objects/<key>`
- `GET http://127.0.0.1:8787/objects/<key>`

## Troubleshooting

### Port already in use

- Stop conflicting process, or
- Change compose port mapping (example):

```yaml
ports:
  - "8080:80"
```

### Database connection failed

```bash
docker-compose logs database
```

### Backend errors

```bash
docker-compose logs backend
```

### Start fresh

```bash
docker-compose down -v
docker-compose up -d --build
```

## Run Without Docker

### Backend

```bash
cd pv-today-hotel-booking-express-api
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```
