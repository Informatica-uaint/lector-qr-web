# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a QR code reader system for Universidad Adolfo Ibáñez's computer lab with separated frontend/backend architecture:

- **Frontend**: Electron application using Next.js + React + Tailwind CSS (port 3020)
- **Backend**: Node.js REST API using Express + MySQL (port 3001)  
- **Database**: MySQL with `registro_qr` database containing `qr_registros` table

The system processes QR codes containing student/staff information and registers entry/exit to the laboratory.

### Key Components

- **Frontend (`frontend/`)**: Electron app with camera integration using @zxing/library for QR detection
- **Backend (`backend/`)**: REST API with routes for QR processing (`/api/qr`) and database management (`/api/db`)
- **Database (`database/init.sql`)**: MySQL schema with qr_registros table for attendance tracking

### Data Flow

1. Frontend captures video stream from camera
2. @zxing/library detects QR codes in video stream
3. QR data sent to backend API via axios
4. Backend validates with Joi schema and processes through QRModel
5. Data stored in MySQL database
6. Response sent back to frontend for UI feedback

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
# Backend + MySQL only (recommended for Electron development)
docker-compose up -d mysql api

# Full stack including web frontend
docker-compose --profile web up -d

# Backend logs
docker-compose logs -f api
```

## Environment Configuration

### Backend `.env` (backend/.env)
```
MYSQL_HOST=10.0.3.54
MYSQL_USER=root
MYSQL_PASSWORD=CxJEv99!fnm1WUS6GyubBvPlqYjUP@
MYSQL_DB=registro_qr
MYSQL_PORT=3306
PORT=3001
NODE_ENV=development
```

### Frontend `.env` (frontend/.env)  
```
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api
```

## Key API Endpoints

- `POST /api/qr/process` - Process QR data and register attendance
- `GET /api/qr/recent?limit=N` - Get recent registrations 
- `GET /api/db/test` - Test database connectivity
- `GET /health` - API health check

## Database Schema

The `qr_registros` table stores attendance records:
- `id` (AUTO_INCREMENT PRIMARY KEY)
- `nombre` (VARCHAR(255)) - First name
- `apellido` (VARCHAR(255)) - Last name  
- `email` (VARCHAR(255)) - Email address
- `tipo` (ENUM: 'Entrada', 'Salida') - Entry/Exit type
- `timestamp` (TIMESTAMP) - Registration time
- `fecha` (DATE, generated) - Date derived from timestamp

## QR Data Format

Expected QR JSON structure (validated with Joi):
```json
{
  "name": "Juan",           // or "nombre"
  "surname": "Pérez",       // or "apellido" 
  "email": "juan@uai.cl",   // required
  "type": "Entrada",        // or "tipo" or "tipoUsuario"
  "timestamp": 1693234567890 // required
}
```

## Electron Integration

The frontend uses Electron's IPC (Inter-Process Communication):
- `window.electronAPI.database.processQR()` - Send QR data to backend
- `window.electronAPI.quitApp()` - Close application
- Main process handles API communication via axios

## Development Tips

- Use `npm run dev` in frontend for full Electron development experience
- Use Docker for backend/database, local Electron for frontend development  
- Camera requires HTTPS or localhost for getUserMedia API
- QR processing includes 3-second confirmation screen with automatic resume
- Frontend ports: Next.js (3020), Backend API (3001), MySQL (3306)