# 🐳 Docker Setup

## Visión General

El sistema QR Generator está completamente dockerizado con configuraciones separadas para desarrollo y producción. El backend API y frontend Electron se ejecutan en contenedores independientes con orchestración via Docker Compose.

**Nota importante sobre la base de datos**:
- **Desarrollo**: MySQL incluido en docker-compose.dev.yml para desarrollo local
- **Producción**: MySQL gestionado externamente por proyecto Flask (no incluido en docker-compose.prod.yml)

## 📁 Estructura Docker

```
├── docker-compose.dev.yml     # Desarrollo con volúmenes montados
├── docker-compose.prod.yml    # Producción con imágenes pre-built  
├── backend/
│   ├── Dockerfile.dev         # Backend desarrollo
│   └── Dockerfile.prod        # Backend producción multi-stage
├── frontend/
│   ├── Dockerfile.dev         # Frontend desarrollo
│   └── Dockerfile.prod        # Frontend producción multi-stage
└── database/
    └── init.sql              # Scripts inicialización MySQL
```

## 🚀 Quick Start

### Desarrollo Completo
```bash
# Configurar environment (consolidado en root)
cp .env.dev.example .env.dev

# Levantar todos los servicios
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Solo Base de Datos (Desarrollo Local)
```bash
# Solo MySQL (recomendado para desarrollo Electron)
docker-compose -f docker-compose.dev.yml up -d mysql-dev

# Verificar conexión
docker-compose -f docker-compose.dev.yml exec mysql-dev mysql -u root -p -e "SHOW DATABASES;"
```

### Producción
```bash
# Setup production environment (consolidado en root)
cp .env.prod.example .env.prod

# IMPORTANTE: Configurar MYSQL_HOST para apuntar a base de datos externa
# La base de datos NO está incluida en docker-compose.prod.yml

# Deploy with pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Docker Compose - Desarrollo

### docker-compose.dev.yml
```yaml
services:
  mysql-dev:
    image: mysql:8.0
    container_name: qr-mysql-dev
    env_file:
      - .env.dev
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DB}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  api-dev:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: qr-api-dev
    env_file:
      - .env.dev
    environment:
      MYSQL_HOST: mysql-dev  # Override para conexión interna
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app       # Hot reload
      - /app/node_modules    # Named volume para performance
    depends_on:
      mysql-dev:
        condition: service_healthy
    restart: unless-stopped

  frontend-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: qr-frontend-dev
    env_file:
      - .env.dev
    ports:
      - "3020:3020"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next          # Next.js build cache
    depends_on:
      - api-dev
    restart: unless-stopped

volumes:
  mysql_dev_data:
```

**Características Desarrollo:**
- **Hot Reload**: Volúmenes montados para cambios en tiempo real
- **Health Checks**: MySQL debe estar listo antes de API
- **Networking**: Comunicación interna entre contenedores
- **Persistent Data**: Volumen para datos MySQL

## 🏭 Docker Compose - Producción

### docker-compose.prod.yml
```yaml
# Production environment with pre-built images
# Database is managed externally - not included in production deployment
services:
  api-prod:
    image: ghcr.io/${GITHUB_REPOSITORY}/qr-backend:latest
    container_name: qr-api-prod
    env_file:
      - .env.prod
    ports:
      - "3001:3001"
    restart: unless-stopped

  frontend-prod:
    image: ghcr.io/${GITHUB_REPOSITORY}/qr-frontend:latest
    container_name: qr-frontend-prod
    env_file:
      - .env.prod
    ports:
      - "3020:3020"
    depends_on:
      - api-prod
    restart: unless-stopped
```

**Características Producción:**
- **Pre-built Images**: Imágenes desde GitHub Container Registry
- **External Database**: MySQL gestionado por proyecto Flask separado (MYSQL_HOST en .env.prod)
- **Security**: Sin volúmenes montados, usuario no-root
- **Restart Policy**: Reinicio automático en fallas
- **Optimized**: Imágenes multi-stage optimizadas
- **No MySQL Container**: La base de datos de producción es externa

## 🐳 Dockerfiles

### Backend Development (Dockerfile.dev)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

**Características:**
- **Alpine**: Imagen ligera
- **npm ci**: Instalación clean para CI/CD
- **Development Command**: Utiliza nodemon para hot reload

### Backend Production (Dockerfile.prod)
```dockerfile
FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
ENV NODE_ENV=production
RUN npm install --production && npm cache clean --force

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

**Características:**
- **Multi-stage**: Optimización de tamaño
- **Production Install**: Solo dependencias de producción
- **Security**: Usuario no-root (nodejs)
- **Cache Clean**: Reduce tamaño de imagen

### Frontend Development (Dockerfile.dev)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3020

CMD ["npm", "run", "dev:next"]
```

### Frontend Production (Dockerfile.prod)
```dockerfile
FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
ENV NODE_ENV=production
RUN npm install --production

COPY . .
RUN npm run build:prod

FROM node:18-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=base --chown=nodejs:nodejs /app/.next ./.next
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules  
COPY --from=base --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nodejs:nodejs /app/public ./public

USER nodejs

EXPOSE 3020

CMD ["npm", "run", "start:prod"]
```

**Características:**
- **Multi-stage Build**: Builder stage + Runner stage
- **Optimized Copying**: Solo archivos necesarios para runtime
- **Security**: Usuario nodejs no-root
- **Build Optimization**: Next.js build optimizado

## 🔧 Variables de Entorno Docker

Todas las variables de entorno están consolidadas en archivos `.env.*` en el directorio raíz del proyecto.

### .env.dev (Desarrollo)
```env
# [DATABASE] - MySQL local en docker-compose
MYSQL_HOST=localhost  # o mysql-dev si se usa dentro de Docker
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# [BACKEND]
PORT=3001
READER_QR_SECRET=dev_secret_key_here

# [FRONTEND]
API_BASE_URL=http://localhost:3001/api
```

### .env.prod (Producción)
```env
# [DATABASE] - MySQL externo gestionado por Flask
MYSQL_HOST=10.0.3.54  # Base de datos externa
MYSQL_USER=root
MYSQL_PASSWORD=production_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306

# [BACKEND]
PORT=3001
READER_QR_SECRET=production_secret_key_here

# [FRONTEND]
API_BASE_URL=https://api.generador.lab.informaticauaint.com/api
```

## 📝 Comandos Útiles

### Development Commands
```bash
# Build y start desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Solo MySQL (desarrollo híbrido)
docker-compose -f docker-compose.dev.yml up -d mysql-dev

# Logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f api-dev

# Acceso a contenedor
docker-compose -f docker-compose.dev.yml exec api-dev sh

# Rebuild específico
docker-compose -f docker-compose.dev.yml build api-dev --no-cache
```

### Production Commands
```bash
# Deploy producción
docker-compose -f docker-compose.prod.yml up -d

# Verificar estado
docker-compose -f docker-compose.prod.yml ps

# Actualizar imágenes
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Nota: El backup de base de datos se maneja en el proyecto Flask externo
```

### Maintenance Commands
```bash
# Cleanup desarrollo
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml down -v  # Con volúmenes

# System cleanup
docker system prune -f
docker volume prune -f
docker image prune -f

# Ver uso de espacio
docker system df
```

## 🌐 Networking

### Internal Network
```yaml
# docker-compose crea red automática
qr-lector-web_default:
  - mysql-dev: comunicación interna puerto 3306
  - api-dev: comunicación interna puerto 3001  
  - frontend-dev: comunicación interna puerto 3020
```

### Port Mapping
```yaml
ports:
  - "3306:3306"  # MySQL: host:3306 → container:3306
  - "3001:3001"  # API: host:3001 → container:3001
  - "3020:3020"  # Frontend: host:3020 → container:3020
```

### Service Discovery
```javascript
// API conecta a MySQL
MYSQL_HOST=mysql-dev      // Desarrollo: container interno
MYSQL_HOST=10.0.3.54      // Producción: base de datos externa

// Frontend conecta a API via external port
API_BASE_URL=http://localhost:3001/api  // Desarrollo
API_BASE_URL=https://api.generador.lab.informaticauaint.com/api  // Producción
```

## 📊 Health Checks y Monitoring

### MySQL Health Check
```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  timeout: 20s
  retries: 10
```

### Dependency Management
```yaml
depends_on:
  mysql-dev:
    condition: service_healthy  # Espera health check verde
```

### Monitoring Commands
```bash
# Estado de servicios
docker-compose -f docker-compose.dev.yml ps

# Health status
docker-compose -f docker-compose.dev.yml exec mysql-dev mysqladmin ping

# Resource usage
docker stats qr-mysql-dev qr-api-dev qr-frontend-dev
```

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build and Push Backend
  run: |
    docker build -f backend/Dockerfile.prod -t qr-backend:latest backend/
    docker tag qr-backend:latest ghcr.io/${{ github.repository }}/qr-backend:latest
    docker push ghcr.io/${{ github.repository }}/qr-backend:latest

- name: Build and Push Frontend  
  run: |
    docker build -f frontend/Dockerfile.prod -t qr-frontend:latest frontend/
    docker tag qr-frontend:latest ghcr.io/${{ github.repository }}/qr-frontend:latest
    docker push ghcr.io/${{ github.repository }}/qr-frontend:latest
```

### Deployment
```bash
# En servidor producción
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 Security Best Practices

### Container Security
```dockerfile
# Usar usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Copiar con ownership correcto
COPY --from=base --chown=nodejs:nodejs /app/.next ./.next
```

### Environment Variables
```yaml
# Usar env_file para secrets (consolidado en root)
env_file:
  - .env.prod

# Override específico para Docker (solo desarrollo)
environment:
  MYSQL_HOST: mysql-dev  # Solo en desarrollo, producción usa .env.prod
```

### Network Security
```yaml
# Exponer solo puertos necesarios
ports:
  - "3001:3001"  # Solo API pública

# MySQL internal only (sin ports en producción)
```

## 🐛 Troubleshooting

### Common Issues

**1. MySQL Connection Refused**
```bash
# Verificar health check
docker-compose -f docker-compose.dev.yml ps
docker-compose -f docker-compose.dev.yml logs mysql-dev

# Test conectividad
docker-compose -f docker-compose.dev.yml exec api-dev nc -zv mysql-dev 3306
```

**2. Hot Reload No Funciona**
```bash
# Verificar volúmenes montados
docker-compose -f docker-compose.dev.yml exec api-dev ls -la /app

# Rebuild contenedor
docker-compose -f docker-compose.dev.yml build --no-cache api-dev
```

**3. Frontend No Conecta a API**
```bash
# Verificar environment variables
docker-compose -f docker-compose.dev.yml exec frontend-dev printenv API_BASE_URL

# Test API desde frontend container
docker-compose -f docker-compose.dev.yml exec frontend-dev curl http://api-dev:3001/health
```

**4. Performance Issues**
```bash
# Verificar recursos
docker stats

# Limpiar cache Docker
docker system prune -f
docker builder prune -f
```

## 📈 Performance Optimization

### Development Optimizations
```yaml
volumes:
  - /app/node_modules    # Named volume evita re-bind
  - /app/.next          # Cache Next.js builds
```

### Production Optimizations
```dockerfile
# Multi-stage para reducir tamaño
FROM node:18-alpine AS base
# Build stage
FROM node:18-alpine AS runner
# Solo runtime files

# Production dependencies only
RUN npm install --production && npm cache clean --force
```

### Resource Limits
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      memory: 256M
```