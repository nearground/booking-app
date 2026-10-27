---
sidebar_label: Docker setup
sidebar_position: 3
---

# PUERTO VALLARTA TODAY - Docker Setup Summary

## ✅ What Has Been Completed

Your PUERTO VALLARTA TODAY application is now fully dockerized with a complete container orchestration setup.

## 📁 Files Created

### Root Directory (`d:\Docker\booking-app-react\`)
- ✅ `docker-compose.yml` - Main orchestration file
- ✅ `.env` - Environment configuration (already created)
- ✅ `.env.example` - Environment template
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - Comprehensive documentation
- ✅ `QUICKSTART.md` - Quick reference guide
- ✅ `DEPLOYMENT.md` - Detailed deployment guide
- ✅ `Makefile` - Make commands for easy management
- ✅ `docker-manager.sh` - Linux/Mac management script
- ✅ `docker-manager.bat` - Windows management script
- ✅ `init-db/init.sql` - Database initialization

### Frontend Directory (`frontend/`)
- ✅ `Dockerfile` - Multi-stage build configuration
- ✅ `nginx.conf` - Nginx web server configuration
- ✅ `.dockerignore` - Build exclusion rules

### Backend Directory (`pv-today-hotel-booking-express-api/`)
- ✅ `Dockerfile` - Node.js production configuration
- ✅ `.dockerignore` - Build exclusion rules
- ✅ `server/app.js` - Updated CORS configuration (modified)

## 🏗️ Architecture

```
┌─────────────────── Docker Compose ───────────────────┐
│                                                        │
│  Frontend (Port 80)         Backend (Port 4000)       │
│  ┌──────────────┐           ┌──────────────┐         │
│  │    Nginx     │           │   Node.js    │         │
│  │              │──Proxy──► │   Express    │         │
│  │ React Build  │           │     API      │         │
│  └──────────────┘           └──────┬───────┘         │
│                                    │                  │
│                           Database (Port 3306)        │
│                           ┌──────────────┐            │
│                           │    MySQL     │            │
│                           │     8.0      │            │
│                           └──────────────┘            │
│                                                        │
│              pv-today-network                      │
└────────────────────────────────────────────────────────┘
```

## 🚀 How to Start

### Option 1: Using Helper Scripts (Easiest)

**Windows:**
```cmd
docker-manager.bat start
```

**Linux/Mac:**
```bash
chmod +x docker-manager.sh
./docker-manager.sh start
```

### Option 2: Using Make (If you have make installed)
```bash
make start
```

### Option 3: Direct Docker Compose
```bash
docker-compose up -d --build
```

## 🌐 Access Points

Once running:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:4000
- **MySQL Database**: localhost:3306

## 📋 Quick Commands

### View Logs
```bash
docker-compose logs -f
```

### Check Status
```bash
docker-compose ps
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

## 🔧 Configuration

### Environment Variables (`.env` file)
```
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=staybooker
MYSQL_USER=staybooker
MYSQL_PASSWORD=password123
JWT_SECRET=your-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

**⚠️ IMPORTANT**: Change `JWT_SECRET` and passwords for production!

### Booking confirmation emails

Email is sent by the backend, not a separate Compose service. Set
`NOTIFICATIONS_PROVIDER=smtp` and configure `NOTIFICATIONS_FROM_EMAIL`,
`SPACEMAIL_HOST`, `SPACEMAIL_PORT`, `SPACEMAIL_SECURE`, `SPACEMAIL_USER`, and
`SPACEMAIL_PASS` in the root `.env`. The `console` provider only logs messages;
`disabled` does not send anything.

Single-quote SMTP passwords containing `$`, for example
`SPACEMAIL_PASS='your-literal-password'`, so Compose does not interpolate parts
of the password. Never commit credentials. Apply environment changes with
`docker compose up -d --no-deps backend`; restarting alone does not reload them.

Checkout commits the booking before attempting email, then stores
`metadata.confirmationEmail` on the order with `status` (`sent` or `failed`) and
`attemptedAt`. Checkout and confirmation responses expose this as
`confirmationEmail`; the guest receipt preserves it without exposing its
capability metadata. `sent` means the email provider accepted the message,
not that it reached the inbox. Transport connection, greeting and socket
timeouts bound the SMTP wait.

In development builds, the confirmation page and account booking list warn when
sending failed, without asking customers to book again. Production builds hide
email failure and unknown-status diagnostics; backend logging and persisted
status remain enabled. Orders created before this flag was added have unknown
email status. No automatic retry or resend is performed.

## 🐳 Services

### 1. Database (MySQL)
- **Image**: mysql:8.0
- **Port**: 3306
- **Volume**: `mysql_data` (persists data)
- **Health Check**: Enabled

### 2. Backend (Express API)
- **Build**: Custom Dockerfile
- **Port**: 4000
- **Depends On**: Database
- **Features**: JWT auth, CORS, Sequelize ORM

### 3. Frontend (React + Nginx)
- **Build**: Multi-stage Dockerfile
- **Port**: 80
- **Depends On**: Backend
- **Features**: Optimized build, API proxy, gzip compression

## 📊 Build Process

First build takes **5-10 minutes** depending on your system:

1. **Frontend Build** (~3-5 min):
   - Install npm dependencies
   - Build React app
   - Create nginx image

2. **Backend Build** (~2-3 min):
   - Install npm dependencies
   - Create node image

3. **Database Setup** (~1-2 min):
   - Pull MySQL image
   - Initialize database
   - Run init scripts

## ✨ Features

### Frontend Features
- ✅ Production-optimized React build
- ✅ Nginx web server
- ✅ API proxy (no CORS issues)
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ SPA routing support

### Backend Features
- ✅ Production Node.js environment
- ✅ Updated CORS configuration
- ✅ Database connection with Sequelize
- ✅ Auto database sync
- ✅ Health checks
- ✅ JWT authentication ready

### Database Features
- ✅ MySQL 8.0
- ✅ Persistent data storage
- ✅ Initialization scripts
- ✅ Health monitoring
- ✅ Automated backups support

## 🔍 Monitoring & Debugging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f database
```

### Access Container Shell
```bash
# Backend
docker-compose exec backend sh

# Database
docker-compose exec database bash

# Access MySQL
docker-compose exec database mysql -u staybooker -p
```

### Check Health
```bash
docker-compose ps
```

All services should show "healthy" status.

## 🛠️ Development Workflow

### Make Code Changes

**Frontend:**
1. Edit files in `frontend/`
2. Rebuild: `docker-compose up -d --build frontend`

**Backend:**
1. Edit files in `pv-today-hotel-booking-express-api/`
2. Rebuild: `docker-compose up -d --build backend`

### Local Development (Without Docker)

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**Backend:**
```bash
cd pv-today-hotel-booking-express-api
npm install
npm run start:dev
```

## 🚨 Troubleshooting

### Port Already in Use
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Frontend
  - "4001:4000"  # Backend
```

### Database Connection Failed
Wait for database initialization:
```bash
docker-compose logs database
```

### Services Not Starting
Check Docker is running:
```bash
docker ps
```

### Clear and Restart
```bash
docker-compose down -v
docker-compose up -d --build
```

## 📚 Documentation

Refer to these files for detailed information:
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick reference
- `DEPLOYMENT.md` - Deployment guide
- `.env.example` - Configuration options

## 🎯 Next Steps

1. **Test the Application**
   - Start services: `docker-compose up -d --build`
   - Access http://localhost
   - Test user registration/login
   - Test hotel booking features

2. **Customize Configuration**
   - Comment `.env` file
   - Update passwords and secrets
   - Configure as needed

3. **Production Preparation**
   - Change `JWT_SECRET` to strong random value
   - Use strong database passwords
   - Configure SSL/TLS certificates
   - Set up monitoring and logging
   - Plan backup strategy

4. **Deploy to Production**
   - Choose hosting platform (AWS, Azure, GCP, DigitalOcean, etc.)
   - Set up CI/CD pipeline
   - Configure domain and DNS
   - Enable HTTPS
   - Set up monitoring

## ⚠️ Important Notes

1. **Security**: The default credentials are for development only. **Always** change them for production!

2. **Data Persistence**: Database data is stored in Docker volume `mysql_data`. Use `docker-compose down -v` to delete it.

3. **First Run**: The first build takes several minutes. Subsequent starts are much faster.

4. **Windows Users**: Use `docker-manager.bat` or Command Prompt/PowerShell for commands.

5. **Linux/Mac Users**: Make scripts executable with `chmod +x docker-manager.sh`.

## 💡 Tips

- Use `docker-compose logs -f` to watch logs in real-time
- Use `docker-compose ps` to check service status
- Use `docker-compose restart` to restart without rebuilding
- Use `docker-compose down -v` to clean everything and start fresh
- Use `make help` to see all available commands (if make is installed)

## 🎉 Success Checklist

- [x] Created Dockerfiles for frontend and backend
- [x] Created docker-compose.yml for orchestration
- [x] Configured MySQL database service
- [x] Set up networking between services
- [x] Added health checks for reliability
- [x] Created environment configuration
- [x] Updated CORS for Docker networking
- [x] Added nginx for frontend serving
- [x] Created helper scripts for management
- [x] Added comprehensive documentation
- [x] Set up persistent storage for database

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f [service]`
2. Verify status: `docker-compose ps`
3. Comment configuration: `docker-compose config`
4. Check Docker is running: `docker ps`
5. Try clean restart: `docker-compose down -v && docker-compose up -d --build`

---

**Your PUERTO VALLARTA TODAY application is ready to run! 🚀**

Start with: `docker-compose up -d --build`
Access at: http://localhost

Happy booking! 🏨
