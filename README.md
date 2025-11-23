# 🎯 QR Generator - Laboratorio Informática UAI

Sistema moderno de generación de códigos QR dinámicos para el control de acceso al laboratorio de informática de la Universidad Adolfo Ibáñez.

## 📋 Descripción

Sistema completo con arquitectura separada frontend/backend que **genera QR codes dinámicos** que cambian cada 60 segundos. Estos QR son escaneados por la aplicación móvil HorariosLabInf para validar credenciales contra el backend Flask.

> **Nueva arquitectura**: Este sistema genera tokens JWT firmados que se visualizan como QR codes. La app móvil escanea estos QR y valida las credenciales con el backend Flask.

### 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │◄──►│     Backend     │◄──►│     Database    │
│                 │    │                 │    │                 │
│ Electron        │    │ Node.js         │    │ MySQL           │
│ + Next.js       │    │ + Express       │    │ (solo consultas)│
│ + React         │    │ + JWT           │    │                 │
│ + Tailwind      │    │ + Helmet        │    │                 │
│ + react-qr-code │    │                 │    │                 │
│                 │    │                 │    │                 │
│ Port: 3020      │    │ Port: 3001      │    │ Port: 3306      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### ✨ Características Principales

- 🔄 **QR Dinámico** - Token JWT que cambia cada 60 segundos
- 🔒 **Seguridad JWT** - Tokens firmados con secret key
- 📱 **Aplicación nativa** - Electron para mejor rendimiento
- 🔐 **Seguridad robusta** - CORS, Rate limiting, Helmet
- 🌐 **API REST** - Arquitectura escalable y mantenible
- 📊 **Logging inteligente** - Solo en desarrollo
- 👥 **Estado de Ayudantes** - Muestra cuántos ayudantes están presentes
- 🐳 **Docker ready** - Desarrollo y producción
- ⚙️ **Multi-entorno** - Dev, Prod, Testing configurations

## 🚀 Quick Start

### 1. Configuración de Entorno
```bash
# Copiar template de configuración (consolidado en root)
cp .env.dev.example .env.dev

# Editar .env.dev con valores reales
# IMPORTANTE: Configurar READER_QR_SECRET para JWT
# Los archivos .env están organizados por secciones: [BACKEND], [FRONTEND], [DATABASE], etc.
```

### 2. Instalación
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 3. Desarrollo
```bash
# Opción 1: Scripts individuales
cd backend && npm run dev     # Terminal 1
cd frontend && npm run dev    # Terminal 2

# Opción 2: WebStorm configurations
# Ejecutar "Full Development" desde WebStorm
```

## 📚 Documentación

### 📖 Guías Principales
- [📋 **Setup Environment**](./docs/SETUP_ENV.md) - Configuración inicial completa
- [🔧 **WebStorm Configs**](./docs/WEBSTORM_CONFIGS.md) - Configuraciones del IDE
- [🔐 **Security Summary**](./docs/SECURITY_SUMMARY.md) - Medidas de seguridad

### 📁 Documentación Detallada
- [🏗️ **Backend Architecture**](./docs/backend-architecture.md) - Estructura del backend
- [🖥️ **Frontend Architecture**](./docs/frontend-architecture.md) - Estructura del frontend
- [🗄️ **Database Schema**](./docs/database.md) - Esquema y tablas
- [🌐 **API Documentation**](./docs/api-endpoints.md) - Endpoints disponibles
- [⚙️ **Environment Configs**](./docs/environment-configuration.md) - Variables de entorno
- [🐳 **Docker Setup**](./docs/docker.md) - Configuración Docker
- [💻 **Development Workflow**](./docs/development-workflow.md) - Flujo de desarrollo

## 🛠️ Tecnologías

### Backend (Node.js)
```json
{
  "framework": "Express.js",
  "database": "MySQL 8.0 (solo consultas, gestionada por Flask)",
  "authentication": "JWT (jsonwebtoken)",
  "security": "Helmet + CORS + Rate Limiting",
  "logging": "Custom Logger (dev-only)",
  "containerization": "Docker"
}
```

### Frontend (Electron)
```json
{
  "ui": "React + Next.js",
  "styling": "Tailwind CSS",
  "qr-generation": "react-qr-code",
  "desktop": "Electron 27+",
  "http": "Axios",
  "icons": "React Icons"
}
```

## 🔧 Comandos Disponibles

### Backend
```bash
npm run dev              # Desarrollo (.env.dev)
npm run dev:prod-api     # Dev con API prod (.env.prod-api)
npm run start:prod       # Producción (.env.prod)
npm run version:patch    # Incrementar versión patch
npm run version:minor    # Incrementar versión minor
npm run version:major    # Incrementar versión major
```

### Frontend
```bash
npm run dev              # Electron + Next.js (.env.dev)
npm run dev:next         # Solo Next.js (.env.dev)
npm run dev:web-prod-api # Con API producción (.env.prod-api)
npm run build:prod       # Build producción (.env.prod)
npm run version:patch    # Incrementar versión patch
npm run version:minor    # Incrementar versión minor
npm run version:major    # Incrementar versión major
```

### Docker
```bash
# Desarrollo (incluye MySQL local)
docker-compose -f docker-compose.dev.yml up

# Solo API + DB (para desarrollo frontend local)
docker-compose -f docker-compose.dev.yml up mysql-dev api-dev

# Producción (sin MySQL - usa base de datos externa)
docker-compose -f docker-compose.prod.yml up
```

## 📊 Flujo de Generación de QR

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───►│   Backend   │───►│  JWT Sign   │───►│  QR Display │
│   Request   │    │  /api/reader│    │   Token     │    │  react-qr-  │
│             │    │   /token    │    │             │    │    code     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

1. Frontend solicita token cada 60 segundos
2. Backend genera JWT con station_id y timestamp
3. JWT firmado con READER_QR_SECRET
4. Token convertido a QR code con react-qr-code
5. QR mostrado en pantalla principal
6. App móvil escanea QR y valida con backend Flask
```

## 🚦 Estados del Sistema

| Estado | Frontend | Backend | Base de Datos |
|--------|----------|---------|---------------|
| ✅ **Operativo** | QR + Ayudantes | API + JWT | MySQL Externa Conectada |
| ⚠️ **Parcial** | Solo QR | API sin DB | MySQL Desconectada |
| ❌ **Error** | Sin token | API caída | Error de conexión |

## 🔒 Seguridad

### Medidas Implementadas
- ✅ **CORS** configurado por entorno
- ✅ **Rate Limiting** (10000 req/15min)
- ✅ **Helmet.js** headers de seguridad
- ✅ **JWT Signing** tokens firmados con secret
- ✅ **Token Expiration** 60 segundos de validez
- ✅ **Environment Variables** protegidas
- ✅ **Logs filtrados** por NODE_ENV
- ✅ **Database Read-Only** acceso solo lectura a DB externa

### Configuración por Entorno
- 🔧 **Development**: Logs completos, CORS permisivo
- 🔐 **Production**: Logs mínimos, CORS restrictivo
- 🧪 **Testing**: Configuración híbrida

## 🤝 Contribución

1. **Fork** del repositorio
2. **Clone** tu fork locally
3. **Setup** environment con `.example` files
4. **Develop** usando WebStorm configs
5. **Test** localmente
6. **Submit** Pull Request

## 📝 Estructura de Archivos

```
generador-qr/
├── 📁 backend/                 # API Node.js
│   ├── 📁 config/             # Configuración DB (read-only)
│   ├── 📁 models/             # Modelos de datos (solo queries SELECT)
│   ├── 📁 routes/             # Endpoints API
│   │   ├── readerToken.js    # Generación de tokens JWT
│   │   └── door.js           # Estado de ayudantes
│   ├── 📁 utils/              # Utilidades (logger)
│   └── 📄 server.js           # Servidor principal
├── 📁 frontend/               # App Electron
│   ├── 📁 pages/              # Páginas React
│   │   └── index.js          # ReaderTokenDisplay
│   ├── 📁 public/             # Electron main/preload
│   └── 📁 utils/              # Utilidades logger
├── 📁 database/               # Scripts SQL (solo para dev local)
├── 📁 docs/                   # Documentación detallada
├── 📁 .github/workflows/      # CI/CD GitHub Actions
├── 📄 .env.*                  # Variables de entorno (root)
└── 📄 docker-compose.*.yml    # Configuraciones Docker
```

## 📞 Soporte

- **Documentación**: [./docs/](./docs/)
- **Issues**: GitHub Issues
- **Universidad**: Laboratorio Informática UAI

---

**🎓 Universidad Adolfo Ibáñez - Laboratorio de Informática**
*Sistema desarrollado para la generación de códigos QR dinámicos de acceso*
