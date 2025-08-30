# ⚙️ Environment Configuration

## Visión General

El sistema utiliza múltiples archivos de configuración de entorno para manejar diferentes escenarios de desarrollo y producción. Cada componente (backend, frontend, Docker) tiene sus propias configuraciones específicas.

## 📁 Estructura de Archivos de Entorno

```
├── backend/
│   ├── .env.dev              # Desarrollo backend
│   ├── .env.prod             # Producción backend
│   ├── .env.prod-api         # Testing con API producción
│   ├── .env.dev.example      # Template desarrollo
│   ├── .env.prod.example     # Template producción
│   └── .env.prod-api.example # Template prod-api
├── frontend/
│   ├── .env.dev              # Desarrollo frontend
│   ├── .env.prod             # Producción frontend
│   ├── .env.prod-api         # Testing con API producción
│   ├── .env.dev.example      # Template desarrollo
│   ├── .env.prod.example     # Template producción
│   └── .env.prod-api.example # Template prod-api
└── root/
    ├── .env.docker.dev       # Docker desarrollo
    ├── .env.docker.prod      # Docker producción
    ├── .env.docker.dev.example
    └── .env.docker.prod.example
```

## 🔧 Backend Environment Variables

### .env.dev (Desarrollo)
```env
# Base de datos MySQL (local/Docker)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# Configuración del servidor
PORT=3001
NODE_ENV=development

# Seguridad
API_SECRET=your_dev_api_secret_here

# CORS Origins para desarrollo
CORS_ORIGINS=http://localhost:3020,http://127.0.0.1:3020
```

### .env.prod (Producción)
```env
# Base de datos MySQL
MYSQL_HOST=production_host
MYSQL_USER=qr_user
MYSQL_PASSWORD=secure_production_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# Configuración del servidor
PORT=3001
NODE_ENV=production

# Seguridad
API_SECRET=secure_production_api_secret

# CORS Origins para producción
CORS_ORIGINS=https://lector.lab.informaticauaint.com,http://lector.lab.informaticauaint.com
```

### .env.prod-api (Testing con API Producción)
```env
# Usar API de producción para testing
MYSQL_HOST=production_api_host
MYSQL_USER=qr_user
MYSQL_PASSWORD=production_api_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# Servidor en modo desarrollo para debugging
PORT=3001
NODE_ENV=development

# Seguridad
API_SECRET=prod_api_secret_for_testing

# CORS para desarrollo local
CORS_ORIGINS=http://localhost:3020,http://127.0.0.1:3020
```

## 🖥️ Frontend Environment Variables

### .env.dev (Desarrollo)
```env
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api
```

### .env.prod (Producción)
```env
NODE_ENV=production
API_BASE_URL=https://api.lector.lab.informaticauaint.com/api
```

### .env.prod-api (Testing con API Producción)
```env
NODE_ENV=development
API_BASE_URL=https://api.lector.lab.informaticauaint.com/api
```

## 🐳 Docker Environment Variables

### .env.docker.dev (Docker Desarrollo)
```env
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

### .env.docker.prod (Docker Producción)
```env
MYSQL_USER=qr_user
MYSQL_PASSWORD=secure_docker_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

## 🚀 Scripts y Configuración

### Backend Scripts (package.json)
```json
{
  "scripts": {
    "start": "node server.js",
    "start:prod": "dotenv -e .env.prod node server.js",
    "start:prod-api": "dotenv -e .env.prod-api node server.js",
    "dev": "dotenv -e .env.dev nodemon server.js",
    "dev:prod-api": "dotenv -e .env.prod-api nodemon server.js"
  }
}
```

### Frontend Scripts (package.json)
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:electron\"",
    "dev:next": "env-cmd -f .env.dev next dev -p 3020 -H 0.0.0.0",
    "dev:electron": "wait-on http://localhost:3020 && electron .",
    "dev:prod-api": "env-cmd -f .env.prod-api next dev -p 3020 -H 0.0.0.0",
    "dev:web-prod-api": "concurrently \"npm run dev:prod-api\" \"npm run dev:electron\"",
    "build": "next build",
    "build:prod": "env-cmd -f .env.prod next build"
  }
}
```

## 🔐 Security Best Practices

### Template Files (.example)
- **Nunca commitear archivos .env reales** con datos sensibles
- **Usar .example files** como templates
- **Documentar todas las variables** necesarias
- **Generar contraseñas seguras** para producción

### Variable Classification
```env
# 🟢 Público (OK en repositorio)
NODE_ENV=development
PORT=3001

# 🟡 Semi-sensible (usar .example)
API_BASE_URL=http://localhost:3001/api
CORS_ORIGINS=http://localhost:3020

# 🔴 Sensible (NUNCA en repositorio)
MYSQL_PASSWORD=secret_password
API_SECRET=secret_key
```

### .gitignore Protection
```gitignore
# Archivos de entorno (solo .example permitidos)
.env
.env.dev
.env.prod
.env.prod-api
.env.production
.env.development
.env.docker.dev
.env.docker.prod

# Permitir templates
!.env*.example
```

## 🏗️ WebStorm/IDE Configuration

### Run Configurations (.idea/runConfigurations/)
```xml
<!-- Backend Dev -->
<configuration name="Backend Dev" type="NodeJSConfigurationType">
  <option name="envs">
    <env name="NODE_ENV" value="development" />
  </option>
  <option name="envFilePath" value="backend/.env.dev" />
</configuration>

<!-- Frontend Dev -->
<configuration name="Frontend Dev" type="npm">
  <package-json value="frontend/package.json" />
  <command value="run" />
  <scripts value="dev" />
  <envs>
    <env name="NODE_ENV" value="development" />
  </envs>
</configuration>
```

## 🌍 Environment Detection

### Backend (server.js)
```javascript
// Configuración dinámica basada en NODE_ENV
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production' 
    ? ['https://lector.lab.informaticauaint.com']
    : ['http://localhost:3020'];

// Trust proxy en producción
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

### Frontend (Electron main.js)
```javascript
// URL dinámica según entorno
const startUrl = isDev 
  ? 'http://localhost:3020' 
  : `file://${path.join(__dirname, '../out/index.html')}`;

// API URL desde variables de entorno
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
```

### Frontend (Next.js index.js)
```javascript
// Detección dual Electron/Web
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Base URL dinámica
const getBackendURL = () => {
  if (isElectron) {
    return process.env.API_BASE_URL || 'http://localhost:3001/api';
  } else {
    return process.env.API_BASE_URL || (
      process.env.NODE_ENV === 'production' 
        ? 'https://api.lector.lab.informaticauaint.com/api'
        : 'http://localhost:3001/api'
    );
  }
};
```

## 📊 Logging Configuration

### Logger Behavior by Environment
```javascript
// utils/logger.js
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    console.error(...args); // Siempre en producción
  },
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
```

## 🐳 Docker Integration

### docker-compose.yml
```yaml
services:
  api:
    env_file:
      - .env.docker.${NODE_ENV:-dev}
    environment:
      - NODE_ENV=${NODE_ENV:-development}
  
  mysql:
    env_file:
      - .env.docker.${NODE_ENV:-dev}
```

### Usage
```bash
# Desarrollo
NODE_ENV=dev docker-compose up

# Producción  
NODE_ENV=prod docker-compose up
```

## 🔄 Environment Setup Workflow

### 1. Initial Setup
```bash
# Copiar templates
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev
cp .env.docker.dev.example .env.docker.dev

# Editar con valores reales
nano backend/.env.dev
nano frontend/.env.dev  
nano .env.docker.dev
```

### 2. Development
```bash
# Backend
cd backend
npm run dev

# Frontend (nueva terminal)
cd frontend  
npm run dev

# Docker (alternativa)
docker-compose up -d mysql api
```

### 3. Production Deployment
```bash
# Setup production environment
cp backend/.env.prod.example backend/.env.prod
cp frontend/.env.prod.example frontend/.env.prod

# Edit with secure production values
# Deploy...
```

## 🚨 Common Issues and Solutions

### 1. Variable No Cargada
```javascript
// Verificar carga de dotenv
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
```

### 2. CORS Errors
```javascript
// Verificar CORS_ORIGINS en backend .env
CORS_ORIGINS=http://localhost:3020,http://127.0.0.1:3020
```

### 3. Database Connection
```javascript
// Verificar variables MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=correct_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

### 4. Frontend API Connection
```javascript
// Verificar API_BASE_URL en frontend .env
API_BASE_URL=http://localhost:3001/api
```

## 📋 Environment Checklist

### Development Setup ✅
- [ ] backend/.env.dev configurado
- [ ] frontend/.env.dev configurado  
- [ ] .env.docker.dev configurado (si usando Docker)
- [ ] Variables sin datos sensibles en repositorio
- [ ] .gitignore protegiendo archivos .env reales
- [ ] Scripts npm funcionando con archivos correctos

### Production Setup ✅
- [ ] backend/.env.prod con datos seguros
- [ ] frontend/.env.prod con URLs correctas
- [ ] CORS_ORIGINS apuntando a dominio real
- [ ] NODE_ENV=production en archivos correctos
- [ ] Contraseñas de base de datos seguras
- [ ] API_SECRET generado correctamente
- [ ] Certificados SSL configurados (HTTPS)