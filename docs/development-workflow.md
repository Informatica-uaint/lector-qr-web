# 🔄 Development Workflow

## Visión General

Esta guía describe el flujo de trabajo completo para desarrollar, testear y desplegar el sistema QR Lector, desde setup inicial hasta deployment en producción.

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
# Backend environment
cd backend
cp .env.dev.example .env.dev
nano .env.dev  # Configurar credenciales MySQL

# Frontend environment  
cd ../frontend
cp .env.dev.example .env.dev
nano .env.dev  # Verificar API_BASE_URL

# Docker environment (opcional)
cd ..
cp .env.docker.dev.example .env.docker.dev
nano .env.docker.dev  # Configurar MySQL Docker
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

# Test conexión DB
curl http://localhost:3001/health
curl http://localhost:3001/api/db/test

# Test procesamiento QR
curl -X POST http://localhost:3001/api/qr/process \
  -H "Content-Type: application/json" \
  -d '{
    "qrData": {
      "name": "Juan",
      "surname": "Pérez", 
      "email": "test@uai.cl",
      "timestamp": '$(date +%s000)',
      "tipoUsuario": "ESTUDIANTE"
    }
  }'
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

### Database Testing
```bash
# Conectar a MySQL Docker
docker-compose -f docker-compose.dev.yml exec mysql-dev mysql -u root -p

# Query básicos
USE registro_qr;
SHOW TABLES;
SELECT * FROM qr_registros LIMIT 5;
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

# Deploy producción
docker-compose -f docker-compose.prod.yml up -d
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

# Base de datos no conecta
docker-compose -f docker-compose.dev.yml logs mysql-dev
docker-compose -f docker-compose.dev.yml restart mysql-dev

# Variables entorno no cargadas
cat backend/.env.dev
echo $NODE_ENV
```

### Frontend Issues  
```bash
# Next.js no conecta a API
curl http://localhost:3001/health
cat frontend/.env.dev

# Electron no inicia
rm -rf frontend/.next
npm run build

# Cámara no funciona
# Verificar permisos HTTPS/localhost
# Verificar allowRunningInsecureContent
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

## 📱 QR Testing Workflow

### Generar QRs de Prueba
```javascript
// QR válido para testing
const qrData = {
  name: "Juan",
  surname: "Pérez",
  email: "juan.perez@uai.cl", 
  timestamp: Date.now(),
  tipoUsuario: "ESTUDIANTE"
};

console.log(JSON.stringify(qrData));
// Generar QR con este JSON
```

### Testing QR Flow
```bash
# 1. Usuario debe estar en DB (usuarios_estudiantes/usuarios_permitidos)
# 2. QR timestamp debe ser fresco (±15 segundos)
# 3. Test procesamiento:

curl -X POST http://localhost:3001/api/qr/process \
  -H "Content-Type: application/json" \
  -d '{
    "qrData": {
      "name": "Juan",
      "surname": "Pérez",
      "email": "juan.perez@uai.cl",
      "timestamp": '$(date +%s000)',
      "tipoUsuario": "ESTUDIANTE"
    }
  }'
```

## 📋 Pre-Deployment Checklist

### Development Ready ✅
- [ ] Backend corre sin errores en development
- [ ] Frontend Electron corre correctamente  
- [ ] Database connection establecida
- [ ] QR processing funciona end-to-end
- [ ] Logs solo muestran en development
- [ ] Variables .env configuradas correctamente
- [ ] .gitignore protege archivos sensibles

### Production Ready ✅
- [ ] Build producción exitoso (frontend + backend)
- [ ] Variables .env.prod configuradas con datos seguros
- [ ] CORS origins apuntan a dominio correcto
- [ ] Database credentials seguros
- [ ] Docker images build correctamente
- [ ] Health checks responden OK
- [ ] HTTPS certificados configurados
- [ ] Rate limiting configurado
- [ ] Error handling robusto

## 🛠️ Maintenance Tasks

### Regular Maintenance
```bash
# Actualizar dependencias
cd backend && npm audit && npm update
cd frontend && npm audit && npm update

# Limpiar Docker
docker system prune -f
docker volume prune -f

# Backup database
docker-compose -f docker-compose.prod.yml exec mysql-prod mysqldump -u root -p registro_qr > backup-$(date +%Y%m%d).sql
```

### Performance Monitoring  
```bash
# Resource usage
docker stats

# Database performance
docker-compose -f docker-compose.dev.yml exec mysql-dev mysql -u root -p -e "SHOW PROCESSLIST;"

# API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health
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