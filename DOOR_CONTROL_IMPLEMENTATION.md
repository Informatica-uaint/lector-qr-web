# 🚪 Control de Puerta - Implementación Completa

## 📋 Resumen de Implementación

Se ha implementado un sistema completo de control de puerta inteligente que:

1. **Detecta presencia de ayudantes** en el laboratorio
2. **Abre la puerta automáticamente** cuando un ayudante entra
3. **Abre la puerta** cuando un estudiante entra SI hay ayudantes presentes
4. **Muestra "Laboratorio Cerrado"** cuando un estudiante intenta entrar sin ayudantes

## 🔧 Nuevos Endpoints Backend

### 1. `GET /api/door/assistants-status`
Verifica si hay ayudantes actualmente en el laboratorio.

**Response:**
```json
{
  "success": true,
  "assistantsPresent": true,
  "count": 2,
  "assistants": [
    {
      "email": "juan@uai.cl",
      "nombre": "Juan",
      "apellido": "Pérez", 
      "horaEntrada": "10:30:45"
    }
  ],
  "timestamp": "2024-01-15T10:45:30.123Z"
}
```

### 2. `POST /api/door/open`
Abre la puerta físicamente via ESPHome (solo si está autorizado).

**Request:**
```json
{
  "userType": "AYUDANTE",
  "userName": "Juan Pérez",
  "authorized": true
}
```

### 3. `POST /api/door/check-and-open`
Verifica condiciones y abre puerta automáticamente.

**Request:**
```json
{
  "userType": "ESTUDIANTE", 
  "userName": "María González",
  "userEmail": "maria@uai.cl",
  "actionType": "Entrada"
}
```

## 🏗️ Modificaciones en QR Processing

El endpoint `/api/qr/process` ahora incluye información de puerta:

**Response con puerta autorizada:**
```json
{
  "success": true,
  "message": "Juan Pérez",
  "tipo": "Entrada",
  "door": {
    "shouldOpen": true,
    "reason": "Ayudante autorizado - entrada permitida",
    "assistantsPresent": true,
    "specialMessage": null
  }
}
```

**Response laboratorio cerrado:**
```json
{
  "success": true,
  "message": "Carlos López", 
  "tipo": "Entrada",
  "door": {
    "shouldOpen": false,
    "reason": "Laboratorio cerrado - no hay ayudantes presentes",
    "assistantsPresent": false,
    "specialMessage": {
      "type": "LABORATORIO_CERRADO",
      "title": "Laboratorio Cerrado",
      "message": "Tocar Timbre",
      "style": "warning"
    }
  }
}
```

## 🎨 Modificaciones Frontend

### Nuevas Pantallas de Confirmación

1. **Pantalla Verde/Naranja** - Entrada/Salida normal
2. **Pantalla Amarilla** - "LABORATORIO CERRADO" + "Tocar Timbre"
3. **Pantalla Roja** - Errores (sin cambios)

### Indicador de Estado de Ayudantes

En el header se muestra:
- **🟢 Ayudantes (2)** - Hay ayudantes presentes  
- **🔴 Ayudantes (0)** - No hay ayudantes
- **🟡 Ayudantes (?)** - Verificando...

### Actualización Automática

- Estado de ayudantes se verifica cada 60 segundos
- Se actualiza inmediatamente después de cada QR procesado

## ⚙️ Variables de Entorno ESPHome

Añadidas a todos los archivos `.env.*.example`:

```env
# ESPHome Configuration (Door Control)
ESPHOME_URL=http://your_esphome_device_ip:6052
ESPHOME_TOKEN=your_esphome_api_token_here  
ESPHOME_DOOR_ENTITY_ID=button.door_open
```

## 🧪 Testing y Pruebas

### Backend Testing
```bash
cd backend
node test-door-endpoints.js
```

### Frontend Testing
```bash
cd frontend  
node test-frontend-door.js  # Ver ejemplos de respuestas
```

## 📋 Lógica de Negocio

### Reglas de Acceso

| Tipo Usuario | Acción | Ayudantes | Resultado | Puerta |
|--------------|--------|-----------|-----------|--------|
| AYUDANTE | Entrada | N/A | ✅ Entrada Registrada | 🟢 ABRE |
| AYUDANTE | Salida | N/A | ✅ Salida Registrada | ❌ No abre |
| ESTUDIANTE | Entrada | ✅ Presentes | ✅ Entrada Registrada | 🟢 ABRE |
| ESTUDIANTE | Entrada | ❌ Ausentes | ⚠️ Lab Cerrado | ❌ No abre |
| ESTUDIANTE | Salida | N/A | ✅ Salida Registrada | ❌ No abre |

### Detección de Ayudantes Presentes

El sistema determina si hay ayudantes basándose en:

1. **Registros del día actual** en tabla `registros`
2. **Último tipo de registro por email** (Entrada vs Salida)  
3. **Solo ayudantes con último registro = "Entrada"** cuentan como presentes

## 🚀 Setup para Producción

### 1. Configurar ESPHome

```yaml
# ESPHome configuration.yaml
button:
  - platform: template
    name: "Door Open"
    id: door_open
    on_press:
      - switch.turn_on: relay_door
      - delay: 1s
      - switch.turn_off: relay_door

api:
  password: "your_api_password"
```

### 2. Configurar Variables Backend

```bash
# En backend/.env.prod
ESPHOME_URL=http://192.168.1.100:6052
ESPHOME_TOKEN=your_production_api_token
ESPHOME_DOOR_ENTITY_ID=button.door_open
```

### 3. Testing ESPHome

```bash
curl -X POST http://192.168.1.100:6052/button/door_open/press \
  -H "Authorization: Bearer your_token"
```

## 🔐 Security Features

### Backend Security
- ✅ Solo abre puerta si `authorized: true` 
- ✅ Validación de tipos de usuario
- ✅ Rate limiting en todos los endpoints
- ✅ Logging detallado de intentos de apertura

### ESPHome Security  
- ✅ Token authentication requerido
- ✅ Solo endpoint específico expuesto
- ✅ Timeout automático del relé

## 📊 Logging y Monitoring

### Backend Logs
```
👥 Ayudantes actualmente en laboratorio: 2
🚪 Verificando acceso puerta: ESTUDIANTE - Entrada
✅ Estudiante autorizado - ayudantes presentes
🌐 Enviando comando a ESPHome: http://device:6052/button/door_open/press
✅ Puerta abierta exitosamente via ESPHome
```

### Frontend Logs
```  
👥 Checking assistants status...
✅ ACCESO REGISTRADO: Entrada - Juan Pérez
🚪 Puerta autorizada para abrir
⚠️ LABORATORIO CERRADO: María González
```

## 🐛 Troubleshooting

### ESPHome No Responde
```bash
# Verificar conectividad
ping 192.168.1.100

# Test API ESPHome  
curl http://192.168.1.100:6052/button/door_open/press
```

### Ayudantes No Detectados
```sql
-- Verificar registros en DB
SELECT * FROM registros WHERE fecha = CURDATE() ORDER BY hora DESC;

-- Verificar último estado por ayudante
SELECT email, tipo, hora FROM registros 
WHERE fecha = CURDATE() 
GROUP BY email 
HAVING hora = MAX(hora);
```

### Frontend No Muestra Estado
- Verificar que backend esté corriendo en puerto 3001
- Verificar CORS origins en backend
- Verificar logs de red en DevTools

## 📈 Próximos Mejoras

1. **Autenticación Entra ID** (como mencionaste)
2. **Historial de apertura de puerta**
3. **Notificaciones push** cuando estudiante intenta entrar sin ayudantes
4. **Dashboard de administración** para ver estado en tiempo real
5. **Integración con cámaras** para logging visual

## ✅ Checklist Deployment

- [ ] Variables ESPHome configuradas en .env.prod
- [ ] ESPHome device accesible desde servidor
- [ ] Testing endpoints con `test-door-endpoints.js`
- [ ] Frontend compilado con `npm run build:prod`
- [ ] Base de datos con usuarios de prueba
- [ ] Logs verificados en development
- [ ] CORS configurado para dominio producción