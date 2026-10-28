# PUERTO VALLARTA TODAY Hotel Booking - Docker Setup

This repository contains the full-stack PUERTO VALLARTA TODAY Hotel Booking application with Docker containerization.

## Architecture

The application consists of five docker services:

1. **Frontend** - React application served by Nginx
2. **Backend** - Express.js API server
3. **Database** - MySQL 8.0
4. **Blob Storage** - Cloudflare R2
5. **Caching** - Redis

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Cloudflare Wrangler

## Quick Start

### Development Mode (with Hot Reload)

1. **Clone the repository and navigate to the root directory**

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Set `JWT_SECRET` to a unique random value of at least 32 characters in `.env`.
   The backend refuses missing, short, or known example secrets. Generate one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Set unique database passwords for a new installation. For public access via
   Cloudflare Tunnel, use the [hardened tunnel deployment](DEPLOYMENT.md#cloudflare-tunnel-deployment)
   instead of exposing the development server.

   To run the fresh-database seeding command below, fill in the blank
   `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_DEMO_PASSWORD` entries
   in `.env`; leaving either password blank causes seeding to fail. Both
   passwords must be at least 10 characters and should be distinct, local-only
   credentials. `SEED_ADMIN_EMAIL` is the login for the seeded administrator;
   the demo password is shared by seeded demo accounts. `SEED_DATABASE` is set
   to the configured `MYSQL_DATABASE` by Compose. The seed command opts into
   seeding for that run only; ordinary backend starts keep it disabled.

   For example, generate two different passwords and paste the output into
   `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

3. **Build and start all services**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Internal project work/docs (development): http://localhost:8080/internal/docs/
   - Backend API: http://localhost:4000
   - phpMyAdmin: http://localhost:8081
   - MySQL: localhost:3306

   To open it on a phone, connect the phone to the same network and visit
   `http://<computer-LAN-IP>:8080` (replace `<computer-LAN-IP>` with the
   computer's local network address). Allow port 8080 through the computer's
   firewall if prompted.

5. **Start developing!** Any changes to your source code will automatically reload.

   The internal docs site provides a visual dashboard of committed Epics, Stories,
   Tasks, and Git history. Task documents are authoritative for scope/status;
   implementation commits are linked using `Work-Item: <full-task-id>` trailers.

### Production Mode

For production deployment:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Access the application at:
- Frontend: http://localhost
- Backend API: http://localhost:4000

## Docker Commands

### Development Mode (with hot reload)
```bash
# Start services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Stop services
docker-compose down
```

### Production Mode
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Start with rebuild
docker-compose -f docker-compose.prod.yml up -d --build

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### General Commands
```bash
# View logs
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f database

# Remove everything (including volumes)
docker-compose down -v

# Start seed dependencies, then apply startup, generic demo, and showcase scenarios
docker compose up -d --wait database r2-local redis
docker compose run --rm --no-deps -e SEED_FACTORY_ENABLED=true backend sh -c "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all"

# Destructive: removes development volumes, then migrates, seeds all scenarios, and starts the stack
# Bash / Git Bash
docker compose down -v && docker compose build backend && docker compose up -d --wait database r2-local redis && docker compose run --rm --no-deps -e SEED_FACTORY_ENABLED=true backend sh -c "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all" && docker compose up --build -d

# Windows PowerShell
cmd.exe /c 'docker compose down -v && docker compose build backend && docker compose up -d --wait database r2-local redis && docker compose run --rm --no-deps -e SEED_FACTORY_ENABLED=true backend sh -c "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all" && docker compose up --build -d'


```

The original `/o/testcompany1`, `/o/testcompany2`, and `/o/testcompany3` demos
remain intact. Three additional organizations demonstrate the experience templates:

| URL | Showcase |
| --- | --- |
| `/o/house-party` | Free private-venue parties, single evening sessions, and opted-in guest lists |
| `/o/food-tours` | Food tour with uploaded hero video, poster, and pinned guest reviews |
| `/o/default-tours` | Coastal tour with the default uploaded-photo carousel |

Showcase media is uploaded to the local R2 worker, so `R2_DEV_TOKEN` must be
configured and `r2-local` must be healthy before seeding. The showcase scenario
has its own manifest: it can be added to an already-seeded development database
without replacing the existing generic demo records.

## Service Details

### Frontend (React)
**Development Mode:**
- **Port**: 3000
- **Server**: React Development Server with Hot Module Replacement
- **Features**: 
  - Live code reloading
  - Source maps for debugging
  - Fast refresh
  - Environment variables from .env files

**Production Mode:**
- **Port**: 80
- **Server**: Nginx
- **Build**: Multi-stage build (Node.js for building, Nginx for serving)
- **Features**: 
  - Optimized production build
  - Gzip compression
  - Static asset caching
  - API proxy to backend

### Backend (Express.js)
**Development Mode:**
- **Port**: 4000
- **Tool**: Nodemon for auto-restart on file changes
- **Features**:
  - Live code reloading
  - Detailed error messages
  - Source code hot reload

**Production Mode:**
- **Port**: 4000
- **Features**:
  - Optimized for performance
  - Production dependencies only

**Common Features (Both Modes):**
- RESTful API
- JWT authentication
- CORS enabled for frontend
- Sequelize ORM for database
- Auto database sync on startup

### Database (MySQL)
- **Port**: 3306
- **Version**: MySQL 8.0
- **Data**: Persisted in Docker volume `mysql_data`
- **Features**:
  - Health checks
  - Auto initialization scripts support

### phpMyAdmin
- **Port**: 8080
- **Features**: Web-based MySQL administration interface

## Development

### Hot Reload Development Mode

The Docker setup includes hot reload capability for both frontend and backend services, allowing you to see changes instantly without rebuilding containers.

#### How It Works

- **Backend**: Uses `nodemon` to watch for file changes in the Express API
- **Frontend**: Uses React's development server with hot module replacement (HMR)
- **Volume Mounts**: Source code is mounted into containers, so changes on your host machine are reflected immediately
- **Port Changes**: Frontend runs on port 3000 (dev server) instead of port 80 (production nginx)

#### Access Points (Development Mode)
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- phpMyAdmin: http://localhost:8080
- MySQL: localhost:3306

#### Usage

The current `docker-compose.yml` is configured for development with hot reload. Simply:

```bash
# Start with hot reload enabled
docker-compose up -d --build

# View logs to see hot reload in action
docker-compose logs -f backend
docker-compose logs -f frontend

# Make changes to your code - they will be reflected automatically!
```

#### Switching to Production Mode

To run in production mode without hot reload:

```bash
# Use the production compose file
docker-compose -f docker-compose.prod.yml up -d --build
```

Or manually update `docker-compose.yml`:
1. Change services to use `Dockerfile` instead of `Dockerfile.dev`
2. Change frontend port mapping from `3000:3000` to `80:80`
3. Remove volume mounts for source code
4. Set `NODE_ENV=production`

#### Development Tips

- **Backend changes**: Nodemon will automatically restart the server when you modify files in `pv-today-hotel-booking-express-api/server/`
- **Frontend changes**: React HMR will update the browser without full page reload when you modify files in `frontend/src/`
- **File watching**: The `CHOKIDAR_USEPOLLING=true` environment variable ensures file watching works properly in Docker on all operating systems
- **node_modules**: Anonymous volumes prevent your host's node_modules from being mounted, keeping container dependencies separate

### Running in development mode

For local development without Docker:

**Backend:**
```bash
cd pv-today-hotel-booking-express-api
npm install
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Local R2 Instance (Wrangler)

Run a local Cloudflare R2-compatible worker from the repository root:

```bash
cd r2-local
npm install
npm run dev
```

Default local endpoint:
- Worker base URL: http://127.0.0.1:8787
- Health: `GET /health`
- Put object: `PUT /objects/<key>`
- Get object: `GET /objects/<key>`
- Delete object: `DELETE /objects/<key>`
- List objects: `GET /objects?prefix=<prefix>`

You can also launch it through helpers:
- Windows: `docker-manager.bat r2`
- Linux/Mac: `./docker-manager.sh r2`
- Make: `make r2-start`

### Environment Variables

**Backend (.env):**
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 4000)
- `PROD_DB_NAME` - Database name
- `PROD_DB_USER` - Database user
- `PROD_DB_PASS` - Database password
- `PROD_DB_HOST` - Database host
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time
- `MEDIA_PUBLIC_BASE_URL` - Base URL used to resolve stored media object keys

## Troubleshooting

### Services not starting
Check logs for specific service:
```bash
docker-compose logs backend
```

### Database connection issues
Ensure the database is healthy before backend starts:
```bash
docker-compose ps
```

### Port conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml`:

**Development mode ports:**
- Frontend: 3000
- Backend: 4000
- phpMyAdmin: 8080
- MySQL: 3306

**Production mode ports:**
- Frontend: 80
- Backend: 4000
- phpMyAdmin: 8080
- MySQL: 3306

Example change:
```yaml
ports:
  - "8080:3000"  # Change 3000 to 8080 or any available port
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
```

## Production Deployment

For production:

1. Use the production docker-compose file:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. Update all passwords and secrets in `.env`:
   - Change `MYSQL_ROOT_PASSWORD`
   - Change `MYSQL_PASSWORD`
   - Set strong `JWT_SECRET`

3. Configure proper CORS origins in backend

4. Consider using Docker secrets for sensitive data

5. Set up SSL/TLS certificates for HTTPS (use a reverse proxy like Nginx or Traefik)

6. Configure proper logging and monitoring

7. Set up backup strategy for MySQL data volume

## Network

All services communicate through a custom bridge network `pv-today-network`. This allows services to communicate using service names as hostnames.

## Volumes

- `mysql_data`: Persists MySQL database data across container restarts

## Health Checks

Services include health checks to ensure proper startup order and reliability:
- **Database**: MySQL ping check
- **Backend**: HTTP endpoint check on port 4000
- **Frontend** (production mode only): Nginx availability check on port 80

Note: Health checks are not used for frontend in development mode as the React dev server doesn't require them.

## License

See LICENSE file in respective project directories.

## Additional Docs

- R2 storage design and API contract:
  [R2 storage plan](docs/reference/r2-storage-plan.md)
https://huggingface.co/Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled?clone=true




https://github.com/oobabooga/text-generation-webui/discussions/6714     Oobabooga is deprecated for MCP

https://changeblogger.org/blog/save-copilot-premium-requests-vs-code

https://www.checkfront.com/