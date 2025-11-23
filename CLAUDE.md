# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a QR code **generator** system for Universidad Adolfo Ibáñez's computer lab with separated frontend/backend architecture:

- **Frontend**: Electron application using Next.js + React + Tailwind CSS (port 3020)
- **Backend**: Node.js REST API using Express + MySQL (port 3001)
- **Database**: MySQL managed by Flask backend (external) - this app only reads assistants status

The system **generates dynamic QR codes** (JWT tokens) that change every 60 seconds. These QR codes are scanned by the mobile app HorariosLabInf to validate credentials.

### Key Components

- **Frontend (`frontend/`)**: Electron app that displays dynamic QR codes using react-qr-code library
- **Backend (`backend/`)**: REST API with routes for JWT token generation (`/api/reader`) and assistants status (`/api/door`)
- **Database (`database/init.sql`)**: MySQL schema - only queried for checking assistants status

### Data Flow

1. Frontend requests JWT token from backend every 60 seconds
2. Backend generates signed JWT with station_id and timestamp
3. Token sent back to frontend
4. Frontend displays token as QR code using react-qr-code
5. Mobile app scans QR and validates with Flask backend
6. Backend queries database to show how many assistants are present (lab open/closed status)

## Development Commands

### Backend Development
```bash
cd backend
npm install
npm run dev          # Start with nodemon (hot reload)
npm start           # Production start
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev         # Start Electron + Next.js concurrently
npm run dev:next    # Next.js dev server only (port 3020)
npm run dev:electron # Electron process only
npm run build       # Next.js build
npm run build:electron # Build Electron app
```

### Docker Development
```bash
# Development: Backend + MySQL (recommended for Electron development)
docker-compose -f docker-compose.dev.yml up -d mysql-dev api-dev

# Full development stack
docker-compose -f docker-compose.dev.yml up -d

# Backend logs
docker-compose -f docker-compose.dev.yml logs -f api-dev

# Production deployment (no MySQL - uses external database)
docker-compose -f docker-compose.prod.yml up -d
```

## Gestión de Versiones

### Scripts de Versionado (Semántico vX.Y.Z)

Ambos proyectos (frontend y backend) incluyen scripts para manejar versiones siguiendo el estándar semántico:

**Frontend (frontend/):**
```bash
cd frontend
npm run version:patch   # 2.0.0 -> 2.0.1 (fixes y cambios pequeños)
npm run version:minor   # 2.0.0 -> 2.1.0 (nuevas funcionalidades)
npm run version:major   # 2.0.0 -> 3.0.0 (cambios grandes/breaking)
```

**Backend (backend/):**
```bash
cd backend
npm run version:patch   # 2.0.0 -> 2.0.1 (fixes y cambios pequeños)
npm run version:minor   # 2.0.0 -> 2.1.0 (nuevas funcionalidades)
npm run version:major   # 2.0.0 -> 3.0.0 (cambios grandes/breaking)
```

### Criterios de Versionado
- **Patch (Z)**: Corrección de bugs, mejoras menores de UI, optimizaciones
- **Minor (Y)**: Nuevas funcionalidades, endpoints, componentes
- **Major (X)**: Cambios arquitectónicos, breaking changes, reescrituras

### Versión Actual: v2.0.0
Las versiones se muestran automáticamente en el footer de la aplicación frontend.

## Environment Configuration

All `.env` files are now consolidated in the **root directory** and organized by sections.

### Root `.env.dev` (Development)
```
# ==========================================
# [GENERAL]
# ==========================================
NODE_ENV=development
TZ=America/Santiago

# ==========================================
# [DATABASE] - Read-only access
# ==========================================
MYSQL_HOST=localhost  # Development: localhost or mysql-dev (Docker)
                       # Production: 10.0.3.54 (external Flask database)
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# ==========================================
# [BACKEND]
# ==========================================
PORT=3001
READER_QR_SECRET=your-unique-dev-secret-here
STATION_ID=lector-web-01
TOKEN_EXPIRATION_SECONDS=60
CORS_ORIGINS=http://localhost:3020,http://127.0.0.1:3020

# ==========================================
# [FRONTEND]
# ==========================================
API_BASE_URL=http://localhost:3001/api
```

**Available environments:**
- `.env.dev` - Local development
- `.env.prod` - Production deployment
- `.env.prod-api` - Hybrid (local frontend + production API)
- `.env.build` - Docker build environment

## Key API Endpoints

- `GET /api/reader/token` - Generate JWT token for QR display (refreshes every 60s)
- `GET /api/assistants/status` - Get count of assistants present (lab status)
- `GET /health` - API health check

## Database Schema

**Important**: The database is managed by a Flask backend (separate project). This app has **read-only** access and only queries:

- `registros` table - To check which assistants are currently in the lab (Entrada/Salida tracking)

**Development**: MySQL included in docker-compose.dev.yml (database/init.sql)
**Production**: MySQL external, managed by Flask (MYSQL_HOST=10.0.3.54)

## QR Token Format

Generated JWT structure:
```json
{
  "station_id": "1",
  "timestamp": 1693234567890,
  "type": "reader_token",
  "exp": 1693234627890  // 60 seconds expiration
}
```

## Electron Integration

The frontend uses Electron's IPC (Inter-Process Communication):
- `window.electronAPI.checkConnection()` - Verify backend connectivity
- `window.electronAPI.quitApp()` - Close application
- `window.electronAPI.getAppVersion()` - Get application version
- React components use fetch() directly for API calls (tokens, assistants status)

## Development Tips

- Use `npm run dev` in frontend for full Electron development experience
- Use Docker for backend/database, local Electron for frontend development
- JWT tokens expire every 60 seconds to ensure fresh QR codes
- Assistants status determines if lab is open (shown in frontend panel)
- Frontend ports: Next.js (3020), Backend API (3001), MySQL (3306 in dev only)
- QR generation happens client-side using react-qr-code library
- All `.env.*` files are consolidated in root directory (organized by sections)
- Database is read-only for this project (managed by Flask backend)
