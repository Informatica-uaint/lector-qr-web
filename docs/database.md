# 🗄️ Database Architecture

## Visión General

**IMPORTANTE**: La base de datos `registro_qr` es creada y gestionada por un proyecto Flask completamente separado. El **QR Generator** únicamente realiza consultas de **solo lectura** para obtener el estado actual de los ayudantes presentes en el laboratorio.

### Rol de la Base de Datos en QR Generator

- **Read-Only**: Solo consultas SELECT
- **No gestión de esquema**: No crea ni modifica tablas
- **No escritura**: No realiza INSERT/UPDATE/DELETE
- **Propósito**: Verificar cuántos ayudantes están presentes

## 🏗️ Arquitectura de Acceso a Datos

```
┌─────────────────────────────────────────────────────┐
│         PROYECTO FLASK (SEPARADO)                   │
│     - Crea la base de datos registro_qr             │
│     - Gestiona el esquema de tablas                 │
│     - Escribe registros de entrada/salida           │
└────────────────────┬────────────────────────────────┘
                     │
                     │ GESTIONA (INSERT/UPDATE)
                     ▼
┌─────────────────────────────────────────────────────┐
│        MYSQL DATABASE: registro_qr                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │          registros (Tabla Principal)         │  │
│  │  - fecha, hora, dia, nombre, apellido        │  │
│  │  - email, metodo, tipo (Entrada/Salida)      │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
                     │ CONSULTA (SELECT)
                     ▼
┌─────────────────────────────────────────────────────┐
│         QR GENERATOR (ESTE PROYECTO)                │
│     - Solo lectura de tabla `registros`             │
│     - Calcula ayudantes presentes                   │
│     - Muestra estado en la interfaz                 │
└─────────────────────────────────────────────────────┘
```

## 📊 Tabla Consultada: `registros`

El QR Generator **solo lee** de la tabla `registros` para determinar el estado de los ayudantes:

```sql
SELECT email, tipo, hora, nombre, apellido
FROM registros
WHERE fecha = ?
ORDER BY hora ASC
```

### Estructura de Tabla (Inferida)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fecha` | DATE | Fecha del registro (YYYY-MM-DD) |
| `hora` | TIME | Hora del registro (HH:MM:SS) |
| `dia` | VARCHAR | Día de la semana |
| `nombre` | VARCHAR | Nombre del ayudante |
| `apellido` | VARCHAR | Apellido del ayudante |
| `email` | VARCHAR | Email único del ayudante |
| `metodo` | VARCHAR | Método de registro ('QR', 'Manual', etc.) |
| `tipo` | ENUM | Tipo de registro ('Entrada', 'Salida') |

**Nota**: Esta estructura es gestionada por el proyecto Flask. El QR Generator **no crea** esta tabla.

## 🔍 Lógica de Consulta

### 1. Verificar Ayudantes Presentes

El método `QRModel.checkAssistantsPresent()` determina cuántos ayudantes están actualmente en el laboratorio:

```javascript
static async checkAssistantsPresent() {
  // 1. Obtener fecha actual
  const fechaHoy = new Date().toISOString().split('T')[0];

  // 2. Consultar registros del día (solo lectura)
  const registros = await dbManager.query(`
    SELECT email, tipo, hora, nombre, apellido
    FROM registros WHERE fecha = ? ORDER BY hora ASC
  `, [fechaHoy]);

  // 3. Procesar registros para determinar último estado
  const ayudantesStatus = {};
  registros.forEach(registro => {
    ayudantesStatus[registro.email] = {
      ultimoTipo: registro.tipo,
      ultimaHora: registro.hora,
      nombre: registro.nombre,
      apellido: registro.apellido
    };
  });

  // 4. Contar solo los que tienen último registro = 'Entrada'
  const ayudantesDentro = Object.values(ayudantesStatus)
    .filter(status => status.ultimoTipo === 'Entrada');

  return ayudantesDentro.length;
}
```

**Algoritmo**:
1. Obtiene todos los registros del día actual
2. Para cada email, guarda el **último** registro (tipo: Entrada o Salida)
3. Cuenta cuántos tienen último registro = 'Entrada'

### 2. Obtener Detalles de Ayudantes

El método `QRModel.getAssistantsPresent()` retorna información detallada:

```javascript
static async getAssistantsPresent() {
  const fechaHoy = new Date().toISOString().split('T')[0];

  const registros = await dbManager.query(`
    SELECT email, tipo, hora, nombre, apellido
    FROM registros WHERE fecha = ? ORDER BY hora ASC
  `, [fechaHoy]);

  const ayudantesStatus = {};
  registros.forEach(registro => {
    ayudantesStatus[registro.email] = {
      ultimoTipo: registro.tipo,
      ultimaHora: registro.hora,
      nombre: registro.nombre,
      apellido: registro.apellido
    };
  });

  return Object.values(ayudantesStatus)
    .filter(status => status.ultimoTipo === 'Entrada')
    .map(ayudante => ({
      nombre: ayudante.nombre,
      apellido: ayudante.apellido,
      hora: ayudante.ultimaHora
    }));
}
```

**Retorna**: Array de ayudantes con nombre, apellido y hora de entrada.

## 🚀 Configuración de Conexión

### Database Manager (backend/config/database.js)

```javascript
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});
```

### Variables de Entorno

#### Desarrollo Local (.env.dev)
```env
MYSQL_HOST=localhost          # MySQL local o docker-compose
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

#### Producción (.env.prod)
```env
MYSQL_HOST=10.0.3.54         # Base de datos externa gestionada por Flask
MYSQL_USER=root
MYSQL_PASSWORD=production_password
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

## 🐳 Docker Configuration

### Desarrollo (docker-compose.dev.yml)

Incluye MySQL local **solo para desarrollo**:

```yaml
services:
  mysql-dev:
    image: mysql:8.0
    container_name: qr-mysql-dev
    env_file:
      - .env.dev
    ports:
      - "3306:3306"
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

**Propósito**: Permite desarrollo local sin depender de la base de datos de producción.

### Producción (docker-compose.prod.yml)

**NO incluye MySQL** - se conecta a base de datos externa:

```yaml
# Database is managed externally - not included in production deployment
services:
  api-prod:
    image: ghcr.io/${GITHUB_REPOSITORY}/qr-backend:latest
    env_file:
      - .env.prod
    # Conecta a MYSQL_HOST=10.0.3.54 (base de datos Flask)
```

## 📁 Database Initialization (Solo Desarrollo)

El archivo `database/init.sql` contiene un esquema básico para desarrollo local:

```sql
CREATE DATABASE IF NOT EXISTS registro_qr;
USE registro_qr;

-- Tabla básica para desarrollo
CREATE TABLE IF NOT EXISTS registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    dia VARCHAR(20),
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    metodo VARCHAR(50) DEFAULT 'QR',
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    INDEX idx_fecha (fecha),
    INDEX idx_email (email)
);
```

**IMPORTANTE**:
- Este esquema es **solo para desarrollo local**
- La base de datos de **producción** tiene un esquema más completo gestionado por Flask
- No modificar este archivo a menos que sea necesario para testing

## 🔐 Principios de Seguridad

### Read-Only Access

El QR Generator **nunca** ejecuta:
- `INSERT` - No crea registros
- `UPDATE` - No modifica datos existentes
- `DELETE` - No elimina registros
- `CREATE/ALTER/DROP` - No modifica esquema

### Queries Permitidas

Solo consultas `SELECT` con filtros específicos:

```sql
-- ✅ PERMITIDO: Lectura de registros del día
SELECT email, tipo, hora, nombre, apellido
FROM registros
WHERE fecha = ?;

-- ❌ PROHIBIDO: Cualquier escritura
INSERT INTO registros (...) VALUES (...);
UPDATE registros SET tipo = 'Salida' WHERE ...;
DELETE FROM registros WHERE ...;
```

## 🔧 Health Check

El backend incluye verificación de conexión a base de datos:

```javascript
// Endpoint: GET /health
{
  "status": "ok",
  "database": "connected",  // o "disconnected"
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

## 🐛 Manejo de Errores

### Errores de Conexión

```javascript
{
  "success": false,
  "message": "Error conectando a base de datos",
  "count": 0
}
```

### Sin Registros

```javascript
{
  "success": true,
  "count": 0,
  "assistants": []
}
```

### Error en Query

```javascript
{
  "success": false,
  "message": "Error obteniendo estado de asistentes"
}
```

## 📋 Resumen

| Aspecto | QR Generator |
|---------|--------------|
| **Gestión de DB** | ❌ No gestiona (Flask lo hace) |
| **Crea esquema** | ❌ No (excepto init.sql para dev local) |
| **Operaciones** | ✅ Solo SELECT |
| **Tabla principal** | `registros` (lectura) |
| **Propósito** | Contar ayudantes presentes |
| **MySQL en producción** | ❌ No (usa DB externa) |
| **MySQL en desarrollo** | ✅ Sí (docker-compose.dev.yml) |

## 🔗 Referencias

- **Backend Database Manager**: `backend/config/database.js`
- **QR Model**: `backend/models/QRModel.js`
- **Door Routes**: `backend/routes/door.js` (usa QRModel para obtener estado)
- **Init Script**: `database/init.sql` (solo desarrollo)
- **API Endpoint**: `GET /api/door/assistants-status`
