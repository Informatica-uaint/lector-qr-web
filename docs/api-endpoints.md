# 🔌 API Endpoints

## Base URL

- **Desarrollo**: `http://localhost:3001/api`
- **Producción**: `https://api.lector.lab.informaticauaint.com/api`

## 📊 Health Check

### GET `/health`
Endpoint básico de verificación de estado del servidor.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "QR Lector API", 
  "version": "1.0.0"
}
```

---

## 📱 QR Processing Endpoints

### POST `/api/qr/process`
**Descripción:** Procesa un código QR y registra la entrada/salida del laboratorio.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "qrData": {
    "name": "Juan",
    "surname": "Pérez", 
    "email": "juan.perez@uai.cl",
    "timestamp": 1693234567890,
    "tipoUsuario": "ESTUDIANTE"
  }
}
```

**Campos del QR:**
| Campo | Alternativa | Tipo | Requerido | Descripción |
|-------|-------------|------|-----------|-------------|
| `name` | `nombre` | string | Sí* | Nombre del usuario |
| `surname` | `apellido` | string | Sí* | Apellido del usuario |
| `email` | - | string | **Sí** | Email del usuario |
| `type` | `tipo`, `tipoUsuario` | string | No | Tipo de usuario |
| `timestamp` | - | number | **Sí** | Timestamp Unix en milisegundos |
| `tipoUsuario` | - | enum | No | "ESTUDIANTE" o "AYUDANTE" |

*\*Debe incluir al menos una alternativa de nombre y apellido*

**Validaciones:**
- **Email**: Debe ser formato email válido
- **Timestamp**: Debe ser número entero positivo, ±15 segundos de tolerancia
- **Nombres**: 1-100 caracteres
- **TipoUsuario**: Solo acepta "ESTUDIANTE" o "AYUDANTE"

**Success Response (200):**
```json
{
  "success": true,
  "message": "Juan Pérez",
  "tipo": "Entrada",
  "usuario_tipo": "ESTUDIANTE",
  "fecha": "2024-01-15",
  "hora": "10:30:45",
  "timestamp": "10:30:45 AM",
  "registro_id": 123
}
```

**Error Responses:**

**400 - Datos Inválidos:**
```json
{
  "success": false,
  "message": "Datos QR inválidos: email is required"
}
```

**400 - QR Expirado:**
```json
{
  "success": false,
  "message": "QR expirado o inválido"
}
```

**400 - Usuario No Registrado:**
```json
{
  "success": false,
  "message": "Solicita ser agregado a la base de datos",
  "errorType": "ESTUDIANTE_NO_REGISTRADO",
  "email": "juan.perez@uai.cl"
}
```

**400 - Usuario No Autorizado:**
```json
{
  "success": false,
  "message": "No Autorizado",
  "errorType": "USUARIO_NO_AUTORIZADO",
  "email": "juan.perez@uai.cl"
}
```

---

### GET `/api/qr/recent`
**Descripción:** Obtiene los registros más recientes de entrada/salida.

**Query Parameters:**
- `limit` (opcional): Número de registros a retornar (1-100, default: 10)

**Ejemplo:** `/api/qr/recent?limit=25`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "fecha": "2024-01-15",
      "hora": "10:30:45",
      "dia": "lunes",
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan.perez@uai.cl",
      "metodo": "QR",
      "tipo": "Entrada"
    }
  ],
  "count": 1
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "El límite debe estar entre 1 y 100"
}
```

---

### GET `/api/qr/stats`
**Descripción:** Obtiene estadísticas básicas de registros (placeholder).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Estadísticas no implementadas aún"
}
```

---

## 🗄️ Database Management Endpoints

### GET `/api/db/test`
**Descripción:** Verifica la conectividad básica con la base de datos.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Conexión a base de datos exitosa",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "database": {
    "host": "localhost",
    "port": "3306",
    "database": "registro_qr"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error conectando a base de datos"
}
```

---

### GET `/api/db/status`
**Descripción:** Obtiene el estado detallado de la base de datos incluyendo versión y tiempo del servidor.

**Success Response (200):**
```json
{
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

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error obteniendo estado de base de datos"
}
```

---

### POST `/api/db/reconnect`
**Descripción:** Fuerza una reconexión con la base de datos.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reconexión exitosa"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error en reconexión"
}
```

---

## 🔒 Seguridad y Rate Limiting

### Rate Limiting
- **Límite**: 100 requests por IP cada 15 minutos
- **Response cuando excede**:
```json
{
  "error": "Demasiadas solicitudes desde esta IP"
}
```

### CORS Policy
**Orígenes Permitidos:**
- **Desarrollo**: 
  - `http://localhost:3020`
  - `http://127.0.0.1:3020`
- **Producción**:
  - `https://lector.lab.informaticauaint.com`
  - `http://lector.lab.informaticauaint.com`
- **Configurable**: Vía variable `CORS_ORIGINS`

### Security Headers
Implementado con Helmet.js:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Y otros headers de seguridad

---

## ❌ Error Handling

### Códigos de Estado HTTP
- **200**: Éxito
- **400**: Error en datos de entrada/validación
- **404**: Endpoint no encontrado
- **500**: Error interno del servidor

### Estructura Estándar de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Endpoint No Encontrado (404)
```json
{
  "success": false,
  "message": "Endpoint no encontrado",
  "path": "/api/ruta/inexistente"
}
```

---

## 🧪 Ejemplos de Uso

### Procesamiento QR Exitoso
```bash
curl -X POST http://localhost:3001/api/qr/process \
  -H "Content-Type: application/json" \
  -d '{
    "qrData": {
      "name": "Juan",
      "surname": "Pérez",
      "email": "juan.perez@uai.cl",
      "timestamp": 1693234567890,
      "tipoUsuario": "ESTUDIANTE"
    }
  }'
```

### Verificar Estado de Base de Datos
```bash
curl -X GET http://localhost:3001/api/db/status
```

### Obtener Registros Recientes
```bash
curl -X GET "http://localhost:3001/api/qr/recent?limit=5"
```

### Health Check
```bash
curl -X GET http://localhost:3001/health
```

---

## 🔄 Flujo de Procesamiento QR

```
1. POST /api/qr/process
   ├── Validación Joi Schema
   ├── Validación Timestamp (±15s)
   ├── Búsqueda Usuario (usuarios_permitidos + usuarios_estudiantes)
   ├── Cálculo Entrada/Salida (conteo módulo 2)
   ├── Inserción en DB (registros o EST_registros)
   └── Response con resultado

2. Lógica Entrada/Salida:
   ├── Conteo registros del día para usuario
   ├── Par (0,2,4...) → Entrada  
   └── Impar (1,3,5...) → Salida
```

---

## 🌐 URLs de Producción

- **API Base**: `https://api.lector.lab.informaticauaint.com/api`
- **Health Check**: `https://api.lector.lab.informaticauaint.com/health` 
- **Process QR**: `https://api.lector.lab.informaticauaint.com/api/qr/process`
- **DB Status**: `https://api.lector.lab.informaticauaint.com/api/db/status`

---

## 📝 Logging

### Request Logging (Desarrollo)
```
2024-01-15T10:30:45.123Z - POST /api/qr/process
Headers: { "content-type": "application/json", ... }
Body: { "qrData": { "email": "...", ... } }
```

### Response Logging
```
✓ QR procesado exitosamente: Juan Pérez - Entrada
Process result: { success: true, tipo: "Entrada", ... }
```