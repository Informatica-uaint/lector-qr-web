# 🗄️ Database Architecture

## Visión General

El sistema utiliza MySQL como base de datos principal para almacenar registros de asistencia del laboratorio de informática. La base de datos está diseñada para manejar tanto ayudantes como estudiantes con tablas separadas para optimizar rendimiento y separación de datos.

## 📊 Estructura de Base de Datos

### Base de Datos Principal: `registro_qr`

```sql
CREATE DATABASE IF NOT EXISTS registro_qr;
```

## 📋 Esquema de Tablas

### 1. Tabla Principal (Legacy): `qr_registros`
```sql
CREATE TABLE IF NOT EXISTS qr_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED,
    INDEX idx_email (email),
    INDEX idx_fecha (fecha),
    INDEX idx_timestamp (timestamp)
);
```

**Características:**
- **Campo Generated**: `fecha` se calcula automáticamente desde `timestamp`
- **Índices Optimizados**: Para búsquedas por email, fecha y timestamp
- **ENUM tipo**: Garantiza solo valores 'Entrada' o 'Salida'

### 2. Tabla de Usuarios Permitidos: `usuarios_permitidos`
```sql
-- Tabla para ayudantes y personal autorizado
SELECT id, nombre, apellido, email, TP as tipo, activo 
FROM usuarios_permitidos 
WHERE email = ? AND activo = 1
```

**Estructura Inferida:**
- `id` - Identificador único
- `nombre` - Primer nombre  
- `apellido` - Apellido
- `email` - Correo electrónico (único)
- `TP` - Tipo de personal/puesto
- `activo` - Estado activo (1=activo, 0=inactivo)

### 3. Tabla de Estudiantes: `usuarios_estudiantes`
```sql
-- Tabla específica para estudiantes
SELECT id, nombre, apellido, email, TP as tipo, activo 
FROM usuarios_estudiantes 
WHERE email = ? AND activo = 1
```

**Estructura Similar a `usuarios_permitidos`:**
- Separación lógica entre ayudantes y estudiantes
- Mismo esquema básico de campos
- Permite diferentes políticas de acceso

### 4. Tabla de Registros Ayudantes: `registros`
```sql
INSERT INTO registros (fecha, hora, dia, nombre, apellido, email, metodo, tipo)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

**Estructura Inferida:**
- `fecha` - Fecha del registro (YYYY-MM-DD)
- `hora` - Hora del registro (HH:MM:SS)
- `dia` - Día de la semana
- `nombre` - Nombre del usuario
- `apellido` - Apellido del usuario
- `email` - Correo electrónico
- `metodo` - Método de registro ('QR', 'Manual', etc.)
- `tipo` - Tipo de registro ('Entrada', 'Salida')

### 5. Tabla de Registros Estudiantes: `EST_registros`
```sql
INSERT INTO EST_registros (fecha, hora, dia, nombre, apellido, email, metodo, tipo)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

**Estructura Idéntica a `registros`:**
- Separación física de datos de estudiantes
- Permite análisis independiente
- Optimización de consultas específicas

## 🔐 Usuarios y Permisos

### Usuario de Aplicación
```sql
CREATE USER IF NOT EXISTS 'qr_user'@'%' IDENTIFIED BY 'qr_password';
GRANT SELECT, INSERT, UPDATE ON registro_qr.* TO 'qr_user'@'%';
FLUSH PRIVILEGES;
```

**Características de Seguridad:**
- **Principio de Menor Privilegio**: Solo SELECT, INSERT, UPDATE
- **Sin DELETE**: Previene eliminación accidental de datos
- **Sin CREATE/DROP**: Usuario no puede modificar estructura

## 📈 Estrategia de Indexación

### Índices Implementados
```sql
-- Tabla qr_registros
INDEX idx_email (email)      -- Búsquedas por usuario
INDEX idx_fecha (fecha)      -- Consultas por fecha
INDEX idx_timestamp (timestamp) -- Ordenamiento temporal
```

### Rendimiento Optimizado
- **Búsquedas por Email**: O(log n) gracias a índice
- **Filtros por Fecha**: Consultas rápidas para reportes diarios
- **Ordenamiento Temporal**: Listados cronológicos eficientes

## 🔄 Lógica de Negocio en Modelo

### Algoritmo Entrada/Salida
```javascript
// Conteo de registros del día
const registrosCount = await this.getRegistrosCount(email, fechaHoy, qrTipoUsuario);
const tipoRegistro = registrosCount % 2 === 0 ? 'Entrada' : 'Salida';
```

**Regla de Negocio:**
- **Registro Par (0, 2, 4...)** → Entrada
- **Registro Impar (1, 3, 5...)** → Salida
- **Contador por Usuario/Día**: Reinicia cada día

### Validación de Timestamps
```javascript
const timeDiffSeconds = (currentTimeMs - qrTimestamp) / 1000;
if (Math.abs(timeDiffSeconds) > 15) {
  return { success: false, message: 'QR expirado o inválido' };
}
```

**Características:**
- **Tolerancia**: ±15 segundos
- **Prevención Replay**: QR no reutilizable
- **Sincronización**: Requiere clocks sincronizados

## 🎯 Consultas Principales

### 1. Búsqueda de Usuario
```sql
-- En usuarios_permitidos
SELECT id, nombre, apellido, email, TP as tipo, activo 
FROM usuarios_permitidos 
WHERE email = ? AND activo = 1

-- En usuarios_estudiantes  
SELECT id, nombre, apellido, email, TP as tipo, activo 
FROM usuarios_estudiantes 
WHERE email = ? AND activo = 1
```

### 2. Conteo de Registros del Día
```sql
-- Para ayudantes
SELECT COUNT(*) as registros
FROM registros 
WHERE email = ? AND fecha = ?

-- Para estudiantes
SELECT COUNT(*) as registros
FROM EST_registros 
WHERE email = ? AND fecha = ?
```

### 3. Inserción de Registro
```sql
-- Tabla dinámica según tipo de usuario
INSERT INTO ${tabla} (fecha, hora, dia, nombre, apellido, email, metodo, tipo)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

### 4. Registros Recientes
```sql
SELECT * FROM registros 
ORDER BY fecha DESC, hora DESC 
LIMIT ?
```

## 🚀 Configuración de Conexión

### Database Manager Configuration
```javascript
// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root', 
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB || 'registro_qr',
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});
```

**Características:**
- **Connection Pooling**: Hasta 10 conexiones simultáneas
- **Timeouts**: 60 segundos para operaciones
- **Queue Management**: Sin límite de cola de espera
- **Auto-reconnect**: Manejo automático de reconexión

## 📊 Datos de Prueba

### Registros de Ejemplo
```sql
INSERT INTO qr_registros (nombre, apellido, email, tipo) VALUES
('Juan', 'Pérez', 'juan.perez@uai.cl', 'Entrada'),
('María', 'González', 'maria.gonzalez@uai.cl', 'Entrada'),
('Carlos', 'López', 'carlos.lopez@uai.cl', 'Salida');
```

## 🔍 Logging y Debugging

### Consultas con Log
```javascript
// Ejemplo de query con logging detallado
logger.debug('🔍 [DB QUERY]');
logger.debug('📝 SQL:', sql);
logger.debug('📋 Params:', params);
const startTime = Date.now();
const result = await pool.execute(sql, params);
const duration = Date.now() - startTime;
logger.debug('✅ Rows affected/returned:', result.length || result.affectedRows);
logger.debug('⏱️ Query duration:', duration, 'ms');
```

## 🔧 Variables de Entorno

### Configuración Base de Datos
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_DB=registro_qr
MYSQL_PORT=3306
```

## 🐛 Manejo de Errores

### Errores Comunes y Respuestas

1. **Usuario No Encontrado**
   ```javascript
   {
     success: false,
     message: "Solicita ser agregado a la base de datos", // Para estudiantes
     errorType: "ESTUDIANTE_NO_REGISTRADO",
     email: "usuario@ejemplo.com"
   }
   ```

2. **QR Expirado**
   ```javascript
   {
     success: false,
     message: "QR expirado o inválido"
   }
   ```

3. **Error de Conexión**
   ```javascript
   {
     success: false,
     message: "Error interno: Connection timeout"
   }
   ```

## 📋 Esquema de Migración

Para futuras actualizaciones:

1. **Unificar Tablas**: Considerar merger `registros` y `EST_registros` con campo `tipoUsuario`
2. **Audit Trail**: Agregar campos de auditoría (`created_at`, `updated_at`, `created_by`)
3. **Soft Deletes**: Implementar `deleted_at` en lugar de eliminación física
4. **Particionamiento**: Particionar por fecha para mejorar rendimiento con datos históricos

## 🏗️ Arquitectura de Datos

```
┌─────────────────┐    ┌─────────────────┐
│usuarios_permitidos│    │usuarios_estudiantes│
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
    ┌──────────┐           ┌──────────────┐
    │registros │           │EST_registros │
    └──────────┘           └──────────────┘
          │                      │
          └──────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │  qr_registros   │
            │    (legacy)     │
            └─────────────────┘
```

**Flujo de Datos:**
1. Usuario escaneado busca en tablas de usuarios
2. Según tipo, inserta en tabla de registros correspondiente
3. Tabla legacy mantiene compatibilidad hacia atrás