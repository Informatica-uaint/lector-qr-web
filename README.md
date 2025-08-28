# QR Lector - Laboratorio Informática UAI

Sistema de lectura QR moderno con arquitectura separada frontend/backend.

## Estructura del proyecto

```
lector/
├── frontend/          # Aplicación Electron + Next.js + React
│   ├── pages/         # Páginas React
│   ├── public/        # Archivos Electron (main.js, preload.js)
│   ├── styles/        # CSS/Tailwind
│   └── package.json
├── backend/           # API REST Node.js + Express
│   ├── routes/        # Rutas de la API
│   ├── models/        # Modelos de datos
│   ├── config/        # Configuración DB
│   └── server.js
└── README.md
```

## Instalación y Ejecución

### 1. Instalar dependencias

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

**Backend (`backend/.env`):**
```env
MYSQL_HOST=10.0.3.54
MYSQL_USER=root
MYSQL_PASSWORD=CxJEv99!fnm1WUS6GyubBvPlqYjUP@
MYSQL_DB=registro_qr
MYSQL_PORT=3306
PORT=3001
NODE_ENV=development
```

**Frontend (`frontend/.env`):**
```env
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api
```

### 3. Ejecutar el sistema

**Terminal 1 - Backend API:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend Electron:**
```bash
cd frontend
npm run dev
```

## Arquitectura

### Backend API (Puerto 3001)
- **Framework**: Node.js + Express
- **Base de datos**: MySQL (conexión directa)
- **Endpoints principales**:
  - `POST /api/qr/process` - Procesa códigos QR
  - `GET /api/db/test` - Prueba conexión DB
  - `GET /health` - Estado de la API

### Frontend (Puerto 3015)
- **Framework**: Electron + Next.js + React
- **Cámara**: HTML5 getUserMedia API
- **QR Detection**: @zxing/library
- **Comunicación**: Axios HTTP requests a la API

## Funcionalidades

- **Escaneo automático continuo** - Sin clicks manuales
- **Cámara HTML5 nativa** - Rendimiento superior
- **API REST separada** - Mejor arquitectura y escalabilidad
- **Validación de datos** - Schema validation con Joi
- **Manejo de errores robusto** - Timeouts y fallbacks
- **Interfaz moderna** - React + Tailwind CSS

## Endpoints de la API

### QR Processing
```http
POST /api/qr/process
Content-Type: application/json

{
  "qrData": {
    "name": "Juan",
    "surname": "Pérez",
    "email": "juan.perez@uai.cl",
    "timestamp": 1693234567890
  }
}
```

### Database Status
```http
GET /api/db/test
GET /api/db/status
POST /api/db/reconnect
```

## Desarrollo

**Modo desarrollo con hot reload:**
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev
```

**Build para producción:**
```bash
# Frontend
cd frontend && npm run build:electron
```

## Ventajas de la nueva arquitectura

| Aspecto | Antes (Monolítico) | Ahora (Separado) |
|---------|-------------------|------------------|
| **Escalabilidad** | Limitada | Alta |
| **Mantenimiento** | Complejo | Simple |
| **Testing** | Difícil | Fácil |
| **Deploy** | Monolítico | Independiente |
| **Performance** | Medio | Alto |
| **Seguridad** | Básica | Mejorada |