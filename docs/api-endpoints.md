# 🔌 API Endpoints

## Base URL

- **Desarrollo**: `http://localhost:3001/api`
- **Producción**: `https://api.generador.lab.informaticauaint.com/api`

## 📊 Health Check

### GET `/health`
Endpoint básico de verificación de estado del servidor.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "QR Generator API",
  "version": "2.0.0"
}
```

---

## 🎫 QR Generator Endpoints

### GET `/api/reader/token`
**Descripción:** Genera un token JWT dinámico que cambia cada 60 segundos. El token se codifica en un código QR que la aplicación móvil puede escanear para validar el acceso al laboratorio.

**Headers:**
```
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 60,
  "timestamp": "2024-01-15T10:30:45.123Z",
  "message": "Token generated successfully"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error generating token"
}
```

**JWT Token Payload:**
```json
{
  "station_id": "1",
  "timestamp": 1705318245123,
  "type": "reader_token",
  "iat": 1705318245,
  "exp": 1705318305
}
```

**Configuración:**
- `READER_QR_SECRET`: Secret key para firmar el JWT
- `STATION_ID`: Identificador de la estación (default: "1")
- `TOKEN_EXPIRATION_SECONDS`: Tiempo de expiración en segundos (default: 60)

---

## 👥 Assistants Endpoints

### GET `/api/assistants/status`
**Descripción:** Obtiene el número de ayudantes actualmente presentes en el laboratorio. Esta información se usa para determinar si el laboratorio está abierto o cerrado.

**Success Response (200):**
```json
{
  "success": true,
  "assistantsCount": 2,
  "labOpen": true,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error fetching assistants status"
}
```

**Lógica de Negocio:**
- El laboratorio se considera "abierto" si hay al menos 2 ayudantes presentes
- La cuenta se basa en registros de Entrada/Salida en la tabla `registros`
- Solo consulta la base de datos, no escribe datos

---

## 📌 Version Info

### GET `/api/version`
**Descripción:** Obtiene la versión actual de la API.

**Success Response (200):**
```json
{
  "success": true,
  "service": "QR Generator API",
  "version": "2.0.0",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## 🔒 Seguridad y Rate Limiting

Todos los endpoints están protegidos con:

- **CORS**: Configurado por entorno (permisivo en dev, restrictivo en prod)
- **Helmet.js**: Headers de seguridad
- **Rate Limiting**: 10000 requests por 15 minutos por IP
- **JWT Signing**: Tokens firmados con secret key

## 🌐 CORS Configuration

**Development:**
```javascript
allowedOrigins: [
  'http://localhost:3020',
  'http://127.0.0.1:3020'
]
```

**Production:**
```javascript
allowedOrigins: [
  'https://generador.lab.informaticauaint.com',
  'https://www.generador.lab.informaticauaint.com',
  'http://generador.lab.informaticauaint.com'
]
```

---

## 📝 Notas de Arquitectura

### Flujo de Generación de QR

1. **Frontend** solicita token vía `GET /api/reader/token` cada 60 segundos
2. **Backend** genera JWT firmado con `READER_QR_SECRET`
3. **Frontend** recibe token y lo muestra como código QR usando `react-qr-code`
4. **App Móvil** escanea el QR y valida el token con el backend Flask
5. **Backend Flask** valida el JWT y otorga/deniega acceso

### Base de Datos

La base de datos MySQL es gestionada por otro servicio (backend Flask). Este servicio de generador de QR **solo realiza consultas** para:

- Verificar cuántos ayudantes están presentes
- Determinar el estado del laboratorio (abierto/cerrado)

**No hay operaciones de escritura** en la base de datos desde este servicio.
