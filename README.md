# 🎯 QR Lector - Laboratorio Informática UAI

Sistema moderno de lectura de códigos QR para el control de acceso al laboratorio de informática de la Universidad Adolfo Ibáñez.

## 📋 Descripción

Sistema completo con arquitectura separada frontend/backend que permite el registro automático de entrada y salida de estudiantes y personal mediante códigos QR.

> Nueva lógica: el lector ahora **genera un QR dinámico** y la app móvil HorariosLabInf lo escanea para validar credenciales contra el backend Flask.

### 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │◄──►│     Backend     │◄──►│     Database    │
│                 │    │                 │    │                 │
│ Electron        │    │ Node.js         │    │ MySQL           │
│ + Next.js       │    │ + Express       │    │ + Esquemas      │
│ + React         │    │ + Joi           │    │ + Triggers      │
│ + Tailwind      │    │ + Helmet        │    │                 │
│                 │    │                 │    │                 │
│ Port: 3020      │    │ Port: 3001      │    │ Port: 3306      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### ✨ Características Principales

- 🎥 **Escaneo automático continuo** - Detección QR sin clicks
- 📱 **Aplicación nativa** - Electron para mejor rendimiento 
- 🔒 **Seguridad robusta** - CORS, Rate limiting, Helmet
- 🌐 **API REST** - Arquitectura escalable y mantenible
- 📊 **Logging inteligente** - Solo en desarrollo
- 🐳 **Docker ready** - Desarrollo y producción
- ⚙️ **Multi-entorno** - Dev, Prod, Testing configurations

## 🚀 Quick Start

### 1. Configuración de Entorno
```bash
# Copiar templates de configuración
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev

# Editar archivos .env con valores reales
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
  "database": "MySQL 8.0",
  "validation": "Joi",
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
  "qr": "@zxing/library",
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
```

### Frontend
```bash
npm run dev              # Electron + Next.js (.env.dev)
npm run dev:next         # Solo Next.js (.env.dev) 
npm run dev:web-prod-api # Con API producción (.env.prod-api)
npm run build:prod       # Build producción (.env.prod)
```

### Docker
```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml up

# Solo API + DB (para desarrollo frontend local)
docker-compose -f docker-compose.dev.yml up mysql-dev api-dev

# Producción
docker-compose -f docker-compose.prod.yml up
```

## 📊 Flujo de Datos QR

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Cámara    │───►│   ZXing     │───►│ Validación  │───►│  Database   │
│  getUserMedia  │    │  Detection  │    │    Joi      │    │   MySQL     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

1. Captura video en tiempo real
2. Detección automática de QR
3. Validación de esquema y timestamp  
4. Determinación automática Entrada/Salida
5. Registro en tabla correspondiente
6. Confirmación visual (3 segundos)
7. Reanudación automática del escaneo
```

## 🚦 Estados del Sistema

| Estado | Frontend | Backend | Base de Datos |
|--------|----------|---------|---------------|
| ✅ **Operativo** | Cámara + Escaneo | API + Logs | MySQL Conectada |
| ⚠️ **Parcial** | Solo interfaz | API sin DB | MySQL Desconectada |
| ❌ **Error** | Sin cámara | API caída | Error de conexión |

## 🔒 Seguridad

### Medidas Implementadas
- ✅ **CORS** configurado por entorno
- ✅ **Rate Limiting** (100 req/15min)
- ✅ **Helmet.js** headers de seguridad
- ✅ **Input Validation** con Joi schemas
- ✅ **Environment Variables** protegidas
- ✅ **Logs filtrados** por NODE_ENV
- ✅ **Database Pooling** con timeouts

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
lector-qr-web/
├── 📁 backend/                 # API Node.js
│   ├── 📁 config/             # Configuración DB
│   ├── 📁 models/             # Modelos de datos  
│   ├── 📁 routes/             # Endpoints API
│   ├── 📁 utils/              # Utilidades (logger)
│   └── 📄 server.js           # Servidor principal
├── 📁 frontend/               # App Electron
│   ├── 📁 pages/              # Páginas React
│   ├── 📁 public/             # Electron main/preload
│   └── 📁 utils/              # Utilidades cliente
├── 📁 database/               # Scripts SQL
├── 📁 docs/                   # Documentación detallada
├── 📁 .github/workflows/      # CI/CD GitHub Actions
└── 📄 docker-compose.*.yml    # Configuraciones Docker
```

## 📞 Soporte

- **Documentación**: [./docs/](./docs/)
- **Issues**: GitHub Issues
- **Universidad**: Laboratorio Informática UAI

---

**🎓 Universidad Adolfo Ibáñez - Laboratorio de Informática**  
*Sistema desarrollado para el control de acceso mediante códigos QR*
