# Environment Setup Guide

## 🔐 Configuración Segura de Variables de Entorno

### ⚠️ **Importante: Seguridad**

Los archivos `.env.*` contienen información sensible y están protegidos por `.gitignore`. Solo los archivos `.example` se incluyen en el repositorio.

## 🚀 **Setup Inicial**

### 1. Copiar archivos .example
```bash
# Backend
cp backend/.env.dev.example backend/.env.dev
cp backend/.env.prod.example backend/.env.prod  
cp backend/.env.prod-api.example backend/.env.prod-api

# Frontend  
cp frontend/.env.dev.example frontend/.env.dev
cp frontend/.env.prod.example frontend/.env.prod
cp frontend/.env.prod-api.example frontend/.env.prod-api

# Docker
cp .env.docker.dev.example .env.docker.dev
cp .env.docker.prod.example .env.docker.prod
```

### 2. Configurar valores reales

**Backend (.env files):**
```bash
# Editar cada archivo y reemplazar:
MYSQL_PASSWORD=your_mysql_password_here     → tu_password_real_mysql
API_SECRET=your_api_secret_here            → tu_secret_api_real
CORS_ORIGINS=https://your-domain.com       → tu_dominio_real.com
```

**Frontend (.env files):**
```bash
# Editar y reemplazar:
API_BASE_URL=https://api.your-domain.com/api → https://api.tu-dominio.com/api
```

**Docker (.env files):**
```bash
# Editar y reemplazar:
MYSQL_PASSWORD=your_mysql_password_here     → tu_password_mysql
GITHUB_REPOSITORY=your-org/your-repo       → tu-org/tu-repo
API_BASE_URL=https://api.your-domain.com    → tu_dominio_api
```

## 📁 **Estructura de Archivos**

```
├── backend/
│   ├── .env.dev              # 🔒 Git ignored - Development config  
│   ├── .env.prod             # 🔒 Git ignored - Production config
│   ├── .env.prod-api         # 🔒 Git ignored - Prod API config
│   ├── .env.dev.example      # ✅ Git tracked - Development template
│   ├── .env.prod.example     # ✅ Git tracked - Production template  
│   └── .env.prod-api.example # ✅ Git tracked - Prod API template
├── frontend/
│   ├── .env.dev              # 🔒 Git ignored - Development config
│   ├── .env.prod             # 🔒 Git ignored - Production config
│   ├── .env.prod-api         # 🔒 Git ignored - Prod API config
│   ├── .env.dev.example      # ✅ Git tracked - Development template
│   ├── .env.prod.example     # ✅ Git tracked - Production template
│   └── .env.prod-api.example # ✅ Git tracked - Prod API template
├── .env.docker.dev           # 🔒 Git ignored - Docker dev config
├── .env.docker.prod          # 🔒 Git ignored - Docker prod config  
├── .env.docker.dev.example   # ✅ Git tracked - Docker dev template
└── .env.docker.prod.example  # ✅ Git tracked - Docker prod template
```

## 🔧 **Variables por Entorno**

### Development (.env.dev)
- `MYSQL_HOST=localhost` - Base de datos local
- `NODE_ENV=development` - Logging completo habilitado  
- `CORS_ORIGINS=http://localhost:3020` - CORS para desarrollo

### Production (.env.prod)  
- `MYSQL_HOST=mysql-prod` - Base de datos producción
- `NODE_ENV=production` - Logging mínimo
- `CORS_ORIGINS=https://tu-dominio.com` - CORS restrictivo

### Production API (.env.prod-api)
- `MYSQL_HOST=tu-host-prod` - Host específico de producción
- `NODE_ENV=production` - Logging mínimo  
- `CORS_ORIGINS=localhost + dominio` - CORS mixto para testing

## 🛡️ **Seguridad .gitignore**

El `.gitignore` está configurado para:

```bash
# ✅ Protege todos los archivos .env
.env.*

# ✅ Pero permite archivos .example  
!.env*.example
```

## ⚡ **Scripts NPM Actualizados**

Los scripts usan automáticamente los archivos `.env` correctos:

```bash
# Backend
npm run dev              # Usa .env.dev
npm run dev:prod-api     # Usa .env.prod-api  
npm run start:prod       # Usa .env.prod

# Frontend  
npm run dev              # Usa .env.dev
npm run dev:web-prod-api # Usa .env.prod-api
npm run build:prod       # Usa .env.prod
```

## 🔍 **Verificación**

Para verificar que todo está configurado correctamente:

```bash
# Verificar que archivos existen
ls backend/.env.*
ls frontend/.env.*
ls .env.docker.*

# Verificar que no están en Git
git status
```

Los archivos `.env.*` (sin .example) NO deben aparecer en `git status`.

## 📝 **Notas de Equipo**

1. **Nunca** commites archivos `.env.*` sin `.example`
2. **Siempre** actualiza los `.example` cuando agregues nuevas variables
3. **Comparte** nuevas variables via `.example` files
4. **Documenta** variables nuevas en este archivo