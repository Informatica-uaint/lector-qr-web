# Environment Configuration Guide

## Overview

Este proyecto ahora usa archivos de entorno específicos para diferentes configuraciones:

## Backend (.env files)

### Archivos disponibles:
- `.env.dev` - Desarrollo local
- `.env.prod` - Producción completa  
- `.env.prod-api` - API de producción para testing

### Comandos del Backend:
```bash
cd backend

# Desarrollo (usa .env.dev)
npm run dev

# Desarrollo con API de producción (usa .env.prod-api)
npm run dev:prod-api

# Producción (usa .env.prod)
npm run start:prod

# Producción con API específica (usa .env.prod-api)
npm run start:prod-api
```

## Frontend (.env files)

### Archivos disponibles:
- `.env.dev` - Desarrollo local
- `.env.prod` - Producción completa
- `.env.prod-api` - Desarrollo con API de producción

### Comandos del Frontend:
```bash
cd frontend

# Desarrollo completo (Electron + Next.js con .env.dev)
npm run dev

# Desarrollo web con API de producción (usa .env.prod-api) 
npm run dev:web-prod-api

# Solo Next.js desarrollo (usa .env.dev)
npm run dev:next

# Solo Next.js con API de producción (usa .env.prod-api)
npm run dev:prod-api

# Build de producción (usa .env.prod)
npm run build:prod

# Start de producción (usa .env.prod)
npm run start:prod
```

## Docker

### Development:
```bash
# Usa archivos .env.dev de backend y frontend
docker-compose -f docker-compose.dev.yml --env-file .env.docker.dev up

# Solo MySQL + API
docker-compose -f docker-compose.dev.yml --env-file .env.docker.dev up mysql-dev api-dev
```

### Production:
```bash
# Usa archivos .env.prod de backend y frontend  
docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod up
```

## Configuraciones por Ambiente

### Development (.env.dev)
- **Backend**: MySQL local, CORS para localhost:3020, logs completos
- **Frontend**: API local (http://localhost:3001/api)

### Production (.env.prod)  
- **Backend**: MySQL producción, CORS para dominio producción, logs mínimos
- **Frontend**: API producción (https://api.lector.lab.informaticauaint.com/api)

### Production API (.env.prod-api)
- **Backend**: MySQL producción, CORS mixto, logs mínimos
- **Frontend**: API producción pero en desarrollo local

## Variables Importantes

### Backend:
- `NODE_ENV` - Controla el nivel de logging
- `CORS_ORIGINS` - Orígenes permitidos para CORS (separados por coma)
- `MYSQL_HOST` - Host de la base de datos
- `API_SECRET` - Secreto para autenticación
- `READER_QR_SECRET` - Secreto HS256 para firmar el QR dinámico (compartido con Flask)
- `STATION_ID` - Identificador lógico de la estación que muestra el QR
- `READER_QR_TTL` - TTL (segundos) del token QR generado (opcional)

### Frontend:
- `NODE_ENV` - Controla el logging del cliente
- `API_BASE_URL` - URL del backend API

## Seguridad

- ✅ Archivos `.env.*` están en `.gitignore`
- ✅ Variables sensibles solo en archivos locales
- ✅ Logging filtrado por ambiente
- ✅ CORS configurado dinámicamente

## Testing Rápido

```bash
# Test completo desarrollo
cd backend && npm run dev
cd frontend && npm run dev

# Test con API de producción
cd backend && npm run dev:prod-api  
cd frontend && npm run dev:web-prod-api
```
