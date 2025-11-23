# 🏗️ Backend Architecture

## Visión General

El backend es una API REST construida con Node.js + Express que **genera tokens JWT dinámicos** para códigos QR y proporciona información de estado de asistentes desde la base de datos MySQL. El sistema es **read-only** para la base de datos, enfocándose en generación de tokens y consulta de disponibilidad de personal.

## 📁 Estructura de Archivos

```
backend/
├── 📄 server.js              # Servidor principal y configuración
├── 📁 config/
│   └── database.js           # Pool de conexiones MySQL (read-only)
├── 📁 models/
│   └── QRModel.js           # Consultas de estado de asistentes
├── 📁 routes/
│   ├── readerToken.js       # Generación de tokens JWT
│   └── assistants.js        # Estado de asistentes
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
const helmet = require('helmet');           // Seguridad headers
const cors = require('cors');               // CORS dinámico
const rateLimit = require('express-rate-limit'); // Rate limiting

// Rutas activas
app.use('/api/assistants', assistantsRoutes);  // Estado de asistentes
app.use('/api/reader', readerTokenRoutes); // Generación de tokens
```

**Configuraciones importantes:**
- **Trust Proxy**: Habilitado en producción
- **CORS**: Dinámico basado en `CORS_ORIGINS` o `NODE_ENV`
- **Rate Limiting**: 10000 requests/15min por IP (muy permisivo para dispositivos autorizados)
- **Body Parser**: Límite 10MB
- **Logging Middleware**: Request logging solo en desarrollo

### 2. Database Configuration (config/database.js)

```javascript
class DatabaseManager {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
      port: process.env.MYSQL_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    });
  }

  async query(sql, params) {
    // Query wrapper con logging y manejo de errores
    // Solo operaciones SELECT (read-only)
  }
}
```

**Características:**
- **Connection Pooling**: Máximo 10 conexiones concurrentes
- **Timeouts**: 60 segundos para acquire y query
- **Logging**: Solo en `NODE_ENV=development`
- **Read-only**: No hay operaciones INSERT, UPDATE, DELETE
- **Error Handling**: Captura completa con stack traces

### 3. QRModel (models/QRModel.js)

```javascript
class QRModel {
  // Verifica cuántos ayudantes están presentes (Entrada sin Salida)
  static async checkAssistantsPresent() {
    // Query: SELECT de registros del día, agrupar por email
    // Contar emails donde último tipo = 'Entrada'
    return cantidadAyudantes;
  }

  // Obtiene detalles de ayudantes presentes
  static async getAssistantsPresent() {
    // Query: SELECT de registros del día
    // Filtrar: último tipo = 'Entrada'
    // Return: [{email, nombre, apellido, horaEntrada}]
    return ayudantesDentro;
  }
}
```

**Lógica de negocio:**
1. **Consultar registros del día actual** desde tabla `registros`
2. **Agrupar por email** para obtener el último registro de cada ayudante
3. **Filtrar por tipo "Entrada"** (indica que están dentro del laboratorio)
4. **Contar o retornar detalles** según el método llamado

### 4. Routes - API Endpoints

#### Reader Token Routes (routes/readerToken.js)

```javascript
const jwt = require('jsonwebtoken');

router.get('/token', async (req, res) => {
  const payload = {
    station_id: process.env.STATION_ID || "1",
    timestamp: Date.now(),
    type: "reader_token"
  };

  const token = jwt.sign(payload,
    process.env.READER_QR_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRATION_SECONDS || 60 }
  );

  res.json({
    success: true,
    token,
    expiresIn: parseInt(process.env.TOKEN_EXPIRATION_SECONDS || 60),
    timestamp: new Date().toISOString()
  });
});
```

**Endpoints:**
- `GET /api/reader/token` - Genera JWT firmado con expiración de 60s

#### Assistants Routes (routes/assistants.js)

```javascript
router.get('/status', async (req, res) => {
  const count = await QRModel.checkAssistantsPresent();
  const assistants = await QRModel.getAssistantsPresent();

  res.json({
    success: true,
    assistantsCount: count,
    labOpen: count >= 2,
    assistants: assistants,
    timestamp: new Date().toISOString()
  });
});
```

**Endpoints:**
- `GET /api/assistants/status` - Obtiene cantidad de ayudantes presentes

### 5. Logger (utils/logger.js)

```javascript
class Logger {
  log(message, ...args) {
    // Solo imprime en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}]`, message, ...args);
    }
  }

  debug(message, ...args) {
    // Solo imprime en desarrollo
  }

  error(message, ...args) {
    // Siempre imprime errores
  }
}
```

**Niveles de log:**
- **log/debug**: Solo en desarrollo
- **error**: Siempre activo

## 🔐 Seguridad

### Variables de Entorno Críticas

```bash
# JWT Signing
READER_QR_SECRET=your-secret-key-here    # Nunca commitear

# Station Config
STATION_ID=1                              # Identificador de estación
TOKEN_EXPIRATION_SECONDS=60               # Expiración del token

# Database (read-only access)
MYSQL_HOST=10.0.3.54
MYSQL_USER=root
MYSQL_PASSWORD=***                        # Nunca commitear
MYSQL_DB=registro_qr
```

### Medidas de Seguridad

1. **JWT Signing**: Tokens firmados con `HS256` y secret key
2. **CORS**: Configuración restrictiva por entorno
3. **Helmet.js**: Headers de seguridad automáticos
4. **Rate Limiting**: Previene abuse de API
5. **Input Sanitization**: Express body parser con límites
6. **Environment Variables**: Secrets nunca en código
7. **Read-only DB**: No hay operaciones de escritura

## 📊 Flujo de Datos

### Generación de Token

```
Frontend Request
    ↓
GET /api/reader/token
    ↓
JWT.sign({station_id, timestamp, type}, SECRET, {expiresIn: 60})
    ↓
Return {token, expiresIn, timestamp}
    ↓
Frontend display as QR
```

### Consulta de Asistentes

```
Frontend Request
    ↓
GET /api/assistants/status
    ↓
QRModel.checkAssistantsPresent()
    ↓
SELECT FROM registros WHERE fecha=TODAY
    ↓
Group by email, filter tipo='Entrada'
    ↓
Return {assistantsCount, labOpen, assistants}
```

## 🚀 Deployment

### Scripts NPM

```bash
npm run dev              # Nodemon con .env.dev
npm run dev:prod-api     # Nodemon con .env.prod-api
npm run start            # Node production
npm run start:prod       # Node con .env.prod
npm run version:major    # Bump major version (2.0.0 -> 3.0.0)
npm run version:minor    # Bump minor version (2.0.0 -> 2.1.0)
npm run version:patch    # Bump patch version (2.0.0 -> 2.0.1)
```

### Docker

```bash
docker-compose up -d mysql api          # Solo backend + DB
docker-compose logs -f api              # Ver logs
```

## 📝 Notas de Arquitectura

### Cambios en v2.0.0

**Eliminado:**
- ❌ Endpoints de procesamiento de QR (`/api/qr/process`, `/api/qr/recent`)
- ❌ Endpoints de gestión de DB (`/api/db/test`, `/api/db/reconnect`)
- ❌ Validación Joi de QR data
- ❌ Funciones de escritura en QRModel (`processQRData`, `insertRegistro`)
- ❌ Dependencia `joi`

**Agregado:**
- ✅ Generación de tokens JWT (`/api/reader/token`)
- ✅ Firma JWT con `jsonwebtoken`
- ✅ Modelo simplificado solo para consultas (read-only)

### Base de Datos

La base de datos es **gestionada por otro servicio** (backend Flask). Este servicio solo realiza **consultas SELECT** para:

- Verificar estado de asistentes
- Determinar si el laboratorio está abierto

**No hay operaciones de escritura** (INSERT, UPDATE, DELETE).
