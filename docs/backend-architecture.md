# 🏗️ Backend Architecture

## Visión General

El backend es una API REST construida con Node.js + Express que maneja la lógica de negocio del sistema de lectura QR, validación de datos y persistencia en MySQL.

## 📁 Estructura de Archivos

```
backend/
├── 📄 server.js              # Servidor principal y configuración
├── 📁 config/
│   └── database.js           # Pool de conexiones MySQL + logging
├── 📁 models/
│   └── QRModel.js           # Lógica de negocio QR
├── 📁 routes/
│   ├── qr.js                # Endpoints de procesamiento QR
│   └── database.js          # Endpoints de estado DB
├── 📁 utils/
│   └── logger.js            # Logger con filtro por entorno
├── 📄 package.json          # Dependencias y scripts
└── 📁 .env files           # Configuraciones por entorno
```

## 🔧 Componentes Principales

### 1. Server.js - Configuración Principal
```javascript
// Tecnologías clave
const express = require('express');
const helmet = require('helmet');      // Seguridad
const cors = require('cors');          // CORS dinámico
const rateLimit = require('express-rate-limit'); // Rate limiting

// Configuraciones importantes
- Trust Proxy: Habilitado en producción
- CORS: Dinámico basado en CORS_ORIGINS o NODE_ENV
- Rate Limiting: 100 requests/15min por IP
- Body Parser: Límite 10MB
- Logging Middleware: Request logging en desarrollo
```

### 2. Database Configuration (config/database.js)
```javascript
// Clase DatabaseManager
class DatabaseManager {
  - Pool de conexiones MySQL con mysql2/promise
  - Configuración robusta con timeouts y reconnect
  - Query wrapper con logging detallado
  - Manejo de errores con stack traces
  - Métricas de rendimiento (duración de queries)
}

// Características
- Connection Pooling: 10 conexiones máximo
- Timeout: 60 segundos para acquire y query
- Logging: Solo en NODE_ENV=development
- Error Handling: Captura completa con contexto
```

### 3. QR Model (models/QRModel.js)
```javascript
// Funciones principales
static async processQRData(qrData)     // Procesamiento completo QR
static async findUser(email)           // Búsqueda en tablas usuarios
static async getRegistrosCount()       // Conteo para Entrada/Salida
static async insertRegistro()          // Inserción en tabla correcta
static async getRecentRegistros()      // Historial reciente

// Lógica de negocio
1. Validación de timestamp (15 segundos tolerancia)
2. Extracción y normalización de datos
3. Búsqueda en usuarios_permitidos + usuarios_estudiantes
4. Determinación automática Entrada/Salida (par/impar)
5. Inserción en tabla correspondiente (registros/EST_registros)
```

### 4. Routes - API Endpoints

#### QR Routes (routes/qr.js)
```http
POST /api/qr/process     # Procesamiento QR principal
GET  /api/qr/recent      # Registros recientes (límite 1-100)
GET  /api/qr/stats       # Estadísticas (placeholder)
```

#### Database Routes (routes/database.js)
```http
GET  /api/db/test        # Test conexión simple
GET  /api/db/status      # Estado detallado + versión MySQL
POST /api/db/reconnect   # Forzar reconexión
```

### 5. Utils - Logger (utils/logger.js)
```javascript
// Métodos disponibles
logger.log()    // Solo en desarrollo
logger.info()   // Solo en desarrollo  
logger.warn()   // Solo en desarrollo
logger.error()  // Siempre (incluso en producción)
logger.debug()  // Solo en desarrollo

// Control por NODE_ENV
const isDevelopment = process.env.NODE_ENV === 'development';
```

## 🛡️ Seguridad Implementada

### Helmet.js Security Headers
```javascript
app.use(helmet()); // Configura headers seguros automáticamente
```

### CORS Dinámico
```javascript
// Desarrollo
allowedOrigins = ['http://localhost:3020', 'http://127.0.0.1:3020']

// Producción  
allowedOrigins = ['https://lector.lab.informaticauaint.com', ...]

// Desde .env (override)
allowedOrigins = process.env.CORS_ORIGINS.split(',')
```

### Rate Limiting
```javascript
// Configuración
windowMs: 15 * 60 * 1000  // 15 minutos
max: 100                  // 100 requests máximo
message: 'Demasiadas solicitudes desde esta IP'
```

### Input Validation (Joi Schema)
```javascript
const qrSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  nombre: Joi.string().min(1).max(100),
  surname: Joi.string().min(1).max(100), 
  apellido: Joi.string().min(1).max(100),
  email: Joi.string().email().required(),
  type: Joi.string().min(1).max(50),
  tipo: Joi.string().min(1).max(50),
  tipoUsuario: Joi.string().valid('ESTUDIANTE', 'AYUDANTE'),
  timestamp: Joi.number().integer().positive().required()
}).or('name', 'nombre').or('surname', 'apellido');
```

## 📊 Flujo de Procesamiento QR

```
1. 📨 Request POST /api/qr/process
   ├── Body: { qrData: { name, surname, email, timestamp, ... } }
   └── Headers: Content-Type: application/json

2. 🔍 Validación Joi Schema  
   ├── ✅ Campos requeridos (email, timestamp)
   ├── ✅ Formatos correctos (email válido)
   └── ✅ Valores permitidos (tipoUsuario ENUM)

3. ⏱️ Validación Timestamp
   ├── Tolerancia: ±15 segundos
   ├── Prevent replay attacks
   └── QR debe ser "fresco"

4. 👤 Búsqueda Usuario
   ├── Tabla: usuarios_permitidos (ayudantes)
   ├── Tabla: usuarios_estudiantes  
   └── Filtro: activo = 1

5. 📊 Determinación Entrada/Salida
   ├── Query: COUNT(*) WHERE email + fecha actual
   ├── Par → Entrada
   └── Impar → Salida

6. 💾 Inserción Registro
   ├── Tabla: registros (ayudantes)
   ├── Tabla: EST_registros (estudiantes)
   └── Datos: fecha, hora, nombre, email, tipo

7. 📤 Response
   ├── ✅ Success: { success: true, tipo: "Entrada", message, ... }
   └── ❌ Error: { success: false, message: "Error específico" }
```

## ⚙️ Variables de Entorno

### Configuración Database
```env
MYSQL_HOST=localhost        # Host MySQL
MYSQL_USER=root            # Usuario MySQL
MYSQL_PASSWORD=secret      # Password MySQL
MYSQL_DB=registro_qr       # Base de datos
MYSQL_PORT=3306           # Puerto MySQL
```

### Configuración Servidor
```env  
PORT=3001                 # Puerto API
NODE_ENV=development      # Entorno (development/production)
API_SECRET=secret_key     # Secret para auth futuro
```

### Configuración CORS
```env
CORS_ORIGINS=http://localhost:3020,http://127.0.0.1:3020
```

## 🚀 Scripts Disponibles

```json
{
  "start": "node server.js",                    // Producción básica
  "start:prod": "dotenv -e .env.prod node server.js",     // Prod con env específico
  "start:prod-api": "dotenv -e .env.prod-api node server.js", // Prod API testing
  "dev": "dotenv -e .env.dev nodemon server.js",          // Desarrollo
  "dev:prod-api": "dotenv -e .env.prod-api nodemon server.js" // Dev con prod API
}
```

## 📈 Métricas y Monitoring

### Database Query Logging (desarrollo)
```
🔍 [DB QUERY]
📝 SQL: SELECT * FROM usuarios_permitidos WHERE email = ?
📋 Params: ['usuario@uai.cl']  
✅ Rows affected/returned: 1
⏱️  Query duration: 25ms
🔚 [DB QUERY END]
```

### Request Logging (desarrollo)
```
2024-01-15T10:30:45.123Z - POST /api/qr/process
Headers: { content-type: 'application/json', ... }
Body: { "qrData": { "email": "...", ... } }
```

### Error Tracking
```
❌ [DB ERROR]
📝 SQL: INSERT INTO registros (...)
💥 Error: Duplicate entry for key 'PRIMARY'
⏱️  Query duration: 15ms
🔚 [DB ERROR END]
```

## 🔄 Estados y Health Checks

### Health Endpoint
```http
GET /health
Response: {
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z", 
  "service": "QR Lector API",
  "version": "1.0.0"
}
```

### Database Status
```http
GET /api/db/status  
Response: {
  "success": true,
  "message": "Base de datos operativa",
  "data": {
    "server_time": "2024-01-15 10:30:45",
    "version": "8.0.35-0ubuntu0.22.04.1",
    "host": "localhost", 
    "port": "3306",
    "database": "registro_qr"
  }
}
```

## 🐛 Error Handling

### Niveles de Error
1. **Validation Errors** → 400 Bad Request
2. **Business Logic Errors** → 400 Bad Request  
3. **Database Errors** → 500 Internal Server Error
4. **Network/Timeout Errors** → 500 Internal Server Error

### Estructura de Error Response
```json
{
  "success": false,
  "message": "Descripción específica del error",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "errorType": "USUARIO_NO_AUTORIZADO" // Opcional
}
```

## 🧪 Testing y Debugging  

### Logs de Desarrollo
- ✅ Request/Response completo
- ✅ Query SQL con parámetros
- ✅ Timing de operaciones
- ✅ Stack traces completos

### Logs de Producción  
- ❌ Sin información sensible
- ✅ Solo errores críticos
- ✅ Métricas básicas
- ✅ Health status