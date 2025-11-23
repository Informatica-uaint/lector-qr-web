# 🔄 Development Workflow

## Visión General

Esta guía describe el flujo de trabajo completo para desarrollar, testear y desplegar el sistema **QR Generator**, desde setup inicial hasta deployment en producción.

## 🚀 Setup Inicial

### 1. Clonar y Configurar Repositorio
```bash
# Clonar proyecto
git clone <repository-url>
cd lector-qr-web

# Verificar estructura
tree -L 2
```

### 2. Environment Setup
```bash
# Variables de entorno consolidadas en root
cp .env.dev.example .env.dev
nano .env.dev  # Configurar credenciales MySQL y READER_QR_SECRET

# Secciones en .env.dev:
# [BACKEND] - PORT, READER_QR_SECRET, STATION_ID
# [FRONTEND] - API_BASE_URL
# [DATABASE] - MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD
```

### 3. Dependencias
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend  
npm install
```

## 🏗️ Development Modes

### Modo 1: Desarrollo Local Completo (Recomendado)
```bash
# Terminal 1: MySQL vía Docker
docker-compose -f docker-compose.dev.yml up -d mysql-dev

# Terminal 2: Backend local
cd backend
npm run dev

# Terminal 3: Frontend Electron
cd frontend
npm run dev  # Electron + Next.js concurrente
```

### Modo 2: Desarrollo Web (Sin Electron)
```bash
# Terminal 1: Backend
cd backend  
npm run dev

# Terminal 2: Frontend web only
cd frontend
npm run dev:next  # Solo Next.js en puerto 3020
```

### Modo 3: Full Docker Development
```bash
# Todo en Docker (más lento para desarrollo)
docker-compose -f docker-compose.dev.yml up --build
```

### Modo 4: Testing con API Producción
```bash
# Backend local apuntando a API producción
cd backend
npm run dev:prod-api

# Frontend con API producción
cd frontend
npm run dev:web-prod-api
```

## 🧪 Testing y Debugging

### Backend Testing
```bash
cd backend

# Test health check
curl http://localhost:3001/health

# Test token generation
curl http://localhost:3001/api/reader/token

# Test assistants status
curl http://localhost:3001/api/door/assistants-status

# Test version
curl http://localhost:3001/api/version
```

### Frontend Testing
```bash
cd frontend

# Next.js development server
npm run dev:next

# Electron development
npm run dev:electron

# Build testing
npm run build
npm run start
```

### Database Testing (Solo Desarrollo)
```bash
# Conectar a MySQL Docker (solo en desarrollo local)
docker-compose -f docker-compose.dev.yml exec mysql-dev mysql -u root -p

# Query básicos (read-only)
USE registro_qr;
SHOW TABLES;
SELECT * FROM registros WHERE fecha = CURDATE() LIMIT 10;

# Nota: La base de datos de producción es externa y gestionada por Flask
```

## 📝 Logging y Monitoring

### Development Logs
```bash
# Backend logs (auto con NODE_ENV=development)
cd backend
npm run dev
# Salida: logs detallados con colores

# Frontend logs
cd frontend  
npm run dev
# Salida: Electron main + renderer process logs
```

### Log Levels por Ambiente
```javascript
// NODE_ENV=development
logger.log()    // ✓ Visible
logger.debug()  // ✓ Visible  
logger.warn()   // ✓ Visible
logger.error()  // ✓ Visible

// NODE_ENV=production
logger.log()    // ❌ Oculto
logger.debug()  // ❌ Oculto
logger.warn()   // ❌ Oculto
logger.error()  // ✓ Visible (solo errores)
```

## 🔨 Build Process

### Development Builds
```bash
# Frontend Next.js build
cd frontend
npm run build

# Frontend Electron build
npm run build:electron
```

### Production Builds
```bash
# Backend production
cd backend
npm run start:prod

# Frontend production  
cd frontend
npm run build:prod

# Electron production package
npm run pack    # Package sin installer
npm run dist    # Create installer
```

## 🐳 Docker Workflow

### Development with Docker
```bash
# Setup completo
docker-compose -f docker-compose.dev.yml up --build

# Solo servicios específicos
docker-compose -f docker-compose.dev.yml up -d mysql-dev
docker-compose -f docker-compose.dev.yml up -d api-dev

# Logs y debugging
docker-compose -f docker-compose.dev.yml logs -f api-dev
docker-compose -f docker-compose.dev.yml exec api-dev sh
```

### Production Docker
```bash
# Build imágenes
docker build -f backend/Dockerfile.prod -t qr-backend:latest backend/
docker build -f frontend/Dockerfile.prod -t qr-frontend:latest frontend/

# Deploy producción (sin MySQL - usa base de datos externa)
docker-compose -f docker-compose.prod.yml up -d

# Nota: MySQL no está incluido en docker-compose.prod.yml
# La base de datos se conecta vía MYSQL_HOST en .env.prod
```

## 📊 Code Quality

### Linting (Si Configurado)
```bash
# Backend
cd backend
npm run lint
npm run lint:fix

# Frontend
cd frontend
npm run lint  
npm run lint:fix
```

### Type Checking
```bash
# Si usando TypeScript
npm run typecheck
```

## 🌿 Git Workflow

### Branch Strategy
```bash
# Feature development
git checkout -b feature/nueva-funcionalidad
git add .
git commit -m "feat: nueva funcionalidad X"
git push origin feature/nueva-funcionalidad

# Bug fixes  
git checkout -b fix/corregir-bug-qr
git add .
git commit -m "fix: corregir procesamiento QR"
git push origin fix/corregir-bug-qr
```

### Commit Convention
```bash
feat: nueva funcionalidad
fix: corrección de bugs
docs: documentación
style: cambios de formato
refactor: refactoring código
test: tests
chore: tareas mantenimiento
```

## 🚀 Deployment Workflow

### Staging Deployment
```bash
# 1. Merge a staging branch
git checkout staging
git merge feature/nueva-funcionalidad

# 2. Deploy a staging environment
docker-compose -f docker-compose.prod.yml up -d

# 3. Testing en staging
curl https://staging-api.lector.lab.informaticauaint.com/health
```

### Production Deployment
```bash
# 1. Merge a main/production branch
git checkout main
git merge staging

# 2. Tag release
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 3. Deploy production
# (Automated via CI/CD or manual)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Debugging Common Issues

### Backend Issues
```bash
# Puerto ocupado
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Base de datos no conecta (desarrollo)
docker-compose -f docker-compose.dev.yml logs mysql-dev
docker-compose -f docker-compose.dev.yml restart mysql-dev

# Variables entorno no cargadas
cat .env.dev
cd backend && npm run dev  # Debe cargar ../.env.dev
```

### Frontend Issues
```bash
# Next.js no conecta a API
curl http://localhost:3001/health
cat .env.dev  # Verificar API_BASE_URL

# Electron no inicia
cd frontend
rm -rf .next
npm run build

# QR no se muestra
# Verificar que token JWT se está recibiendo correctamente
# Verificar que react-qr-code está instalado
```

### Docker Issues
```bash
# Contenedor no inicia
docker-compose -f docker-compose.dev.yml ps
docker-compose -f docker-compose.dev.yml logs <servicio>

# Volumen no monta
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build

# Performance lenta
docker system prune -f
docker volume prune -f
```

## 📱 QR Token Testing Workflow

### Testing JWT Token Generation
```bash
# 1. Obtener token JWT
curl http://localhost:3001/api/reader/token

# Response esperado:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 60,
  "timestamp": "2025-01-22T10:30:00.000Z"
}

# 2. Verificar que el token cambia cada 60 segundos
# 3. Validar que el token está firmado correctamente
```

### Validating JWT Payload
```javascript
// Decodificar token JWT (sin verificar firma)
const jwt = require('jsonwebtoken');
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

const decoded = jwt.decode(token);
console.log(decoded);
// Expected: { station_id: "1", timestamp: 1705318245123, type: "reader_token", iat: ..., exp: ... }
```

## 📋 Pre-Deployment Checklist

### Development Ready ✅
- [ ] Backend corre sin errores en development
- [ ] Frontend Electron corre correctamente
- [ ] Database connection establecida (read-only)
- [ ] JWT token generation funciona
- [ ] QR code se muestra correctamente
- [ ] Assistants status se actualiza
- [ ] Logs solo muestran en development
- [ ] Variables .env.dev configuradas correctamente
- [ ] .gitignore protege archivos sensibles

### Production Ready ✅
- [ ] Build producción exitoso (frontend + backend)
- [ ] Variables .env.prod configuradas con datos seguros
- [ ] READER_QR_SECRET único en producción
- [ ] CORS origins apuntan a dominio correcto
- [ ] MYSQL_HOST apunta a base de datos externa (Flask)
- [ ] Database credentials seguros (read-only)
- [ ] Docker images build correctamente
- [ ] Health checks responden OK
- [ ] HTTPS certificados configurados
- [ ] Rate limiting configurado
- [ ] Error handling robusto
- [ ] JWT tokens se generan correctamente

## 🛠️ Maintenance Tasks

### Regular Maintenance
```bash
# Actualizar dependencias
cd backend && npm audit && npm update
cd frontend && npm audit && npm update

# Limpiar Docker
docker system prune -f
docker volume prune -f

# Nota: El backup de base de datos se maneja en el proyecto Flask externo
# Este proyecto solo consulta la base de datos (read-only)
```

### Performance Monitoring
```bash
# Resource usage
docker stats

# Database performance (solo en desarrollo local)
docker-compose -f docker-compose.dev.yml exec mysql-dev mysql -u root -p -e "SHOW PROCESSLIST;"

# API response times
time curl http://localhost:3001/health
time curl http://localhost:3001/api/reader/token
time curl http://localhost:3001/api/door/assistants-status
```

## 🎯 Development Best Practices

1. **Environment Separation**: Siempre usar archivos .env específicos por ambiente
2. **Logging**: Respetar niveles de log según NODE_ENV
3. **Error Handling**: Catchear errores y retornar responses apropiados
4. **Security**: Nunca commitear secretos, usar .example files
5. **Testing**: Probar cada cambio en multiple browsers/devices
6. **Documentation**: Actualizar docs cuando cambies APIs
7. **Git**: Usar commits descriptivos y branches por feature
8. **Docker**: Usar desarrollo híbrido (Docker DB + local code) para mejor performance