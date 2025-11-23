# 🖥️ Frontend Architecture

## Visión General

El frontend es una aplicación de escritorio construida con Electron que encapsula una aplicación Next.js + React. **Genera códigos QR dinámicos** mediante tokens JWT que se actualizan cada 60 segundos. Utiliza la librería `react-qr-code` para codificar y visualizar tokens JWT firmados. Se comunica con el backend API para obtener tokens frescos y mostrar el estado de ayudantes presentes en el laboratorio.

## 📁 Estructura de Archivos

```
frontend/
├── 📄 package.json           # Dependencias y scripts de Electron
├── 📁 public/
│   ├── main.js              # Proceso principal Electron + IPC handlers
│   ├── preload.js           # Script preload para seguridad
│   └── icon.ico             # Icono de la aplicación
├── 📁 pages/
│   ├── _app.js              # App wrapper Next.js
│   └── index.js             # Componente principal QR Scanner
├── 📁 utils/
│   └── logger.js            # Logger para proceso principal
├── 📄 next.config.js        # Configuración Next.js
├── 📄 tailwind.config.js    # Configuración Tailwind CSS
└── 📄 ../.env.*             # Configuraciones por entorno (root dir)
```

## 🏗️ Arquitectura de Componentes

### 1. Electron Main Process (public/main.js)
```javascript
// Responsabilidades principales
- Crear y gestionar BrowserWindow
- Configurar seguridad (contextIsolation, nodeIntegration)
- Manejar IPC communication
- Realizar llamadas HTTP al backend API para tokens JWT
- Verificar estado de conexión con backend

// Configuración de seguridad
webPreferences: {
  nodeIntegration: false,      // Deshabilitar Node.js en renderer
  contextIsolation: true,      // Aislar contextos
  preload: path.join(__dirname, 'preload.js'),
  webSecurity: false,          // Solo para desarrollo de cámara
  enableRemoteModule: false,   // Seguridad adicional
}

// Optimizaciones de rendimiento
app.disableHardwareAcceleration();  // Evitar crashes GPU
app.commandLine.appendSwitch('--disable-gpu');
```

### 2. IPC Handlers (Inter-Process Communication)
```javascript
// Handlers disponibles (frontend/public/main.js)
ipcMain.handle('get-app-version')      // Versión de la app
ipcMain.handle('quit-app')             // Cerrar aplicación
ipcMain.handle('db-check-connection')  // Health check backend
ipcMain.handle('api-status')           // Estado API

// ELIMINADOS en v2.0.0:
// - db-test-connection (obsoleto)
// - db-process-qr (funcionalidad antigua de lectura QR)
// - db-connect (obsoleto)

// Todas las llamadas HTTP se realizan desde el renderer process
// usando fetch() directo desde React components
```

### 3. Preload Script (public/preload.js)
```javascript
// Expone API segura al renderer process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  checkConnection: () => ipcRenderer.invoke('db-check-connection')
});

// El renderer process usa fetch() directo para obtener tokens
// No se requieren IPC handlers para llamadas API simples
```

### 4. React Component Principal (pages/index.js)
```javascript
// Estado principal del componente QR Generator
const [currentToken, setCurrentToken] = useState(null);       // Token JWT actual
const [tokenTimestamp, setTokenTimestamp] = useState(null);   // Timestamp creación
const [timeRemaining, setTimeRemaining] = useState(60);       // Segundos restantes
const [assistantsCount, setAssistantsCount] = useState(0);    // Número de ayudantes
const [labOpen, setLabOpen] = useState(false);                // Laboratorio abierto
const [backendStatus, setBackendStatus] = useState('checking'); // Estado conexión

// Llamadas API usando fetch() directo
const fetchToken = async () => {
  const response = await fetch(`${API_BASE_URL}/reader/token`);
  const data = await response.json();
  return data;
};

const fetchAssistantsStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/door/assistants-status`);
  const data = await response.json();
  return data;
};
```

## 📱 Sistema de Generación de QR y Tokens JWT

### Token Generation Flow
```javascript
1. 🔄 Iniciar aplicación
   ├── Obtener primer token JWT
   ├── Registrar timestamp de creación
   └── Mostrar código QR generado

2. 🔐 Token JWT
   ├── Generado por backend con secret
   ├── Contiene: iss (emisor), exp (expiración), iat (emitido)
   ├── Expiración: 60 segundos desde creación
   └── Formato: header.payload.signature

3. 🎨 Renderizado QR
   ├── react-qr-code codifica el token JWT
   ├── Genera código QR visual (200x200px)
   ├── Actualización automática cada 60s
   └── Contador visual de tiempo restante

4. 📊 Proceso de actualización
   ├── Verificar tiempo transcurrido cada segundo
   ├── Si > 60s: Obtener nuevo token
   ├── Actualizar componente QR
   └── Reiniciar countdown
```

### Token Refresh Mechanism
```javascript
1. ⏱️ Temporizador de actualización (60 segundos)
   ├── setInterval cada 1 segundo
   ├── Calcular tiempo restante: 60 - (ahora - timestamp)
   └── Cuando llega a 0: obtener nuevo token

2. 🔄 Actualización automática
   ├── GET /api/reader/token
   ├── Recibir nuevo JWT
   ├── Re-renderizar QR
   ├── Reiniciar countdown
   └── Logging de actualización

3. 📲 Estado visual
   ├── Verde: Tiempo > 30s (token fresco)
   ├── Amarillo: 10s < Tiempo < 30s (token envejecido)
   ├── Rojo: Tiempo < 10s (próxima actualización)
   └── Número grande de segundos restantes
```

## 🎨 Interfaz de Usuario (React + Tailwind)

### Componentes Principales
```jsx
// Layout principal
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

  // Header con título e indicadores
  <Header>
    - Título del sistema (QR Generador)
    - Indicador estado backend (verde/rojo)
    - Indicador estado token (verde/amarillo/rojo)
    - Contador de tiempo restante
  </Header>

  // Panel principal dividido
  <MainContent>
    // Panel izquierdo - Código QR
    <QRDisplayPanel>
      - Componente react-qr-code
      - Tamaño: 200x200px mínimo
      - Actualización automática cada 60s
      - Contador visual en grande
      - Fondo blanco con borde redondeado
    </QRDisplayPanel>

    // Panel derecho - Estado e información
    <StatusPanel>
      - Estado sistema (Backend conectado/desconectado)
      - Token vigencia restante (segundos)
      - Información de asistentes disponibles
      - Mensajes de estado
      - Timestamp de última actualización
    </StatusPanel>
  </MainContent>

  // Control inferior
  <ControlPanel>
    - Botones: Mostrar/Ocultar QR, Refrescar Token, Salir
    - Estado de conexión con API
  </ControlPanel>
</div>
```

### Estados Visuales
```javascript
// Estados de token
timeRemaining > 30  → Indicador verde "VIGENTE"
10 < timeRemaining ≤ 30 → Indicador amarillo "PRÓXIMA ACTUALIZACIÓN"
timeRemaining ≤ 10  → Indicador rojo "ACTUALIZANDO..."

// Estados de backend
backendStatus = 'connected'    → "CONECTADO" verde
backendStatus = 'disconnected' → "DESCONECTADO" rojo
backendStatus = 'checking'     → "VERIFICANDO..." amarillo

// Pantalla QR
QR Generado correctamente → Mostrar código QR nítido
Error generando token → Mostrar mensaje de error en rojo
Sin conexión → Mostrar advertencia amarilla
```

## 🔄 Comunicación Frontend ↔ Backend

### Direct HTTP Communication
```javascript
// React components usan fetch() directo para APIs
// No se usa IPC para llamadas HTTP simples

// Obtener token JWT
const fetchToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/reader/token`);
    const data = await response.json();

    if (data.success) {
      setCurrentToken(data.token);
      setTokenTimestamp(Date.now());
    }
  } catch (error) {
    console.error('Error fetching token:', error);
  }
};

// Obtener estado de ayudantes
const fetchAssistantsStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/door/assistants-status`);
    const data = await response.json();

    if (data.success) {
      setAssistantsCount(data.assistantsCount);
      setLabOpen(data.labOpen);
    }
  } catch (error) {
    console.error('Error fetching assistants:', error);
  }
};
```

### Backend URL Configuration
```javascript
// Variables de entorno consolidadas en archivos root .env.*
// next.config.js expone process.env.API_BASE_URL al browser

const API_BASE_URL = process.env.API_BASE_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://api.generador.lab.informaticauaint.com/api'
    : 'http://localhost:3001/api'
);

// Desarrollo:  http://localhost:3001/api  (desde .env.dev)
// Producción:  https://api.generador.lab.informaticauaint.com/api  (desde .env.prod)
```

### Health Checking y Token Refresh
```javascript
// Health check usando IPC de Electron
const checkBackendConnection = async () => {
  try {
    setBackendStatus('checking');

    if (typeof window !== 'undefined' && window.electronAPI) {
      // Electron: usa IPC handler
      const result = await window.electronAPI.checkConnection();
      setBackendStatus(result.success ? 'connected' : 'disconnected');
    } else {
      // Web: usa fetch directo
      const response = await fetch(`${API_BASE_URL}/../health`);
      setBackendStatus(response.ok ? 'connected' : 'disconnected');
    }
  } catch (error) {
    setBackendStatus('disconnected');
  }
};

// Token refresh automático cada 60 segundos
useEffect(() => {
  const interval = setInterval(async () => {
    await fetchToken();  // Obtener nuevo token JWT
    await fetchAssistantsStatus();  // Actualizar estado de ayudantes
  }, 60000);  // 60 segundos

  return () => clearInterval(interval);
}, []);
```

## ⚙️ Configuración y Build

### Next.js Configuration (next.config.js)
```javascript
const nextConfig = {
  output: 'export',                    // Static export para Electron
  trailingSlash: true,                 // Compatibilidad rutas
  images: { unoptimized: true },       // Imágenes sin optimización
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  
  // Variables expuestas al browser
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
  },
  
  // Webpack config para Electron
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false, net: false, tls: false,
    };
    return config;
  }
};
```

### Electron Builder Configuration
```json
{
  "appId": "com.uai.qr-lector",
  "productName": "QR Lector Lab",
  "directories": { "output": "dist" },
  "files": [
    "out/**/*",           // Next.js build output
    "public/main.js",     // Electron main process
    "public/preload.js",  // Preload script
    "node_modules/**/*"   // Dependencies
  ],
  "win": {
    "target": "nsis",     // Windows installer
    "icon": "public/icon.ico"
  }
}
```

## 🚀 Scripts de Desarrollo y Build

### Development Scripts
```bash
# Desarrollo completo (Electron + Next.js)
npm run dev              # Usa ../.env.dev
npm run dev:web-prod-api # Usa ../.env.prod-api

# Solo Next.js (para desarrollo web)
npm run dev:next         # Usa ../.env.dev

# Solo Electron (requiere Next.js ejecutándose)
npm run dev:electron     # Espera localhost:3020
```

### Build Scripts
```bash
# Build Next.js
npm run build            # Build básico
npm run build:prod       # Build con ../.env.prod

# Build Electron completo
npm run build:electron   # Next.js build + Electron package

# Packaging
npm run pack             # Package sin installer
npm run dist             # Create installer
```

## 🔒 Seguridad Frontend

### Electron Security Best Practices
```javascript
// ✅ Implementadas
nodeIntegration: false           // No Node.js en renderer
contextIsolation: true          // Contextos aislados
enableRemoteModule: false       // Sin módulo remoto
preload script                  // API controlada via contextBridge
webSecurity: false              // Para localhost development
allowRunningInsecureContent: false
```

### Context Bridge Security
```javascript
// Solo exponer APIs necesarias y controladas
contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ Métodos seguros específicos
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  checkConnection: () => ipcRenderer.invoke('db-check-connection'),

  // ❌ No exponer APIs genéricas
  // ipcRenderer: ipcRenderer  // NUNCA hacer esto
});
```

## 📊 Logging y Debugging

### Client-Side Logging
```javascript
// Development: Logs completos en consola
logger.log('🎥 Camera initialized successfully');
logger.debug('QR Data:', qrData);
logger.warn('⚠️ Camera permission denied');
logger.error('💥 Failed to process QR:', error);

// Production: Solo errores básicos
logger.error('An error occurred'); // Sin detalles sensibles
```

### Main Process Logging  
```javascript
// Logs del proceso principal Electron
logger.log('🚀 Loading app URL:', startUrl);
logger.log('✓ Permission granted for:', permission);
logger.error('❌ Error procesando QR via API:', error.message);
```

## 🎯 Performance Optimizations

### GPU/Hardware Optimization
```javascript
// Evitar crashes en sistemas con GPU problemáticas (main.js)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
```

### Interval Management
```javascript
// Cleanup de intervalos en componente React
useEffect(() => {
  // Token refresh cada 60 segundos
  const tokenInterval = setInterval(fetchToken, 60000);

  // Assistants status cada 5 segundos
  const assistantsInterval = setInterval(fetchAssistantsStatus, 5000);

  // Cleanup al desmontar
  return () => {
    clearInterval(tokenInterval);
    clearInterval(assistantsInterval);
  };
}, []);
```

### React QR Code Optimization
```javascript
// react-qr-code se actualiza automáticamente cuando cambia el token
<QRCode
  value={currentToken || ''}  // Token JWT como string
  size={200}                   // Tamaño fijo para performance
  level="M"                    // Error correction medium
/>
```

## 🐛 Error Handling

### Token Generation Errors
```javascript
// Tipos de error manejados
'Network Error'    → 'No hay conexión con el servidor'
'Timeout'          → 'Servidor tardó demasiado en responder'
'Invalid Token'    → 'Token JWT generado inválido'
'Rate Limited'     → 'Demasiadas solicitudes - esperar'
```

### Token Refresh Errors
```javascript
// Manejo de errores en actualización de token
try {
  const newToken = await getToken();
  setCurrentToken(newToken.token);
} catch (error) {
  logger.error('Error refrescando token:', error.message);
  setStatusMessage('Error actualizando token QR');
  // Reintentar en próxima actualización automática
}
```

### Network/Backend Errors
```javascript
// Fallback cuando backend no disponible
if (backendStatus === 'disconnected') {
  setStatusMessage('⚠️ Servidor desconectado - Reintentando...');
  // Mostrar último token válido si existe
  // Continuar verificaciones periódicas
}
```

### Assistant Status Fetching Errors
```javascript
// Manejo de errores al obtener estado de asistentes
try {
  const assistants = await getAssistantsStatus();
  setAssistantsStatus(assistants.data || []);
} catch (error) {
  logger.error('Error obteniendo estado de asistentes:', error.message);
  setStatusMessage('No se pudo obtener información de asistentes');
}
```