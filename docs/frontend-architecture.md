# 🖥️ Frontend Architecture

## Visión General

El frontend es una aplicación de escritorio construida con Electron que encapsula una aplicación Next.js + React. Utiliza la cámara web para escanear códigos QR automáticamente y se comunica con el backend API para procesar los datos.

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
│   ├── logger.js            # Logger para proceso principal
│   └── clientLogger.js      # Logger para renderer process
├── 📄 next.config.js        # Configuración Next.js
├── 📄 tailwind.config.js    # Configuración Tailwind CSS
└── 📁 .env files           # Configuraciones por entorno
```

## 🏗️ Arquitectura de Componentes

### 1. Electron Main Process (public/main.js)
```javascript
// Responsabilidades principales
- Crear y gestionar BrowserWindow
- Configurar seguridad (contextIsolation, nodeIntegration)
- Manejar IPC communication
- Realizar llamadas HTTP al backend API
- Gestionar permisos de cámara y media

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
app.commandLine.appendSwitch('--enable-media-stream');
```

### 2. IPC Handlers (Inter-Process Communication)
```javascript
// Handlers disponibles
ipcMain.handle('get-app-version')        // Versión de la app
ipcMain.handle('quit-app')               // Cerrar aplicación
ipcMain.handle('db-test-connection')     // Test conexión DB
ipcMain.handle('db-process-qr')          // Procesar QR via API
ipcMain.handle('db-connect')             // Reconectar DB
ipcMain.handle('db-check-connection')    // Status backend
ipcMain.handle('api-status')             // Estado API

// Todas las llamadas HTTP se realizan desde el main process
// por seguridad y para evitar CORS issues
```

### 3. Preload Script (public/preload.js)
```javascript
// Expone API segura al renderer process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    processQR: (qrData) => ipcRenderer.invoke('db-process-qr', qrData),
    checkConnection: () => ipcRenderer.invoke('db-check-connection'),
  },
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getVersion: () => ipcRenderer.invoke('get-app-version')
});
```

### 4. React Component Principal (pages/index.js)
```javascript
// Estado principal del componente
const [isScanning, setIsScanning] = useState(false);
const [cameraActive, setCameraActive] = useState(false);
const [statusMessage, setStatusMessage] = useState('');
const [devices, setDevices] = useState([]);              // Cámaras disponibles
const [selectedDevice, setSelectedDevice] = useState(''); // Cámara seleccionada
const [lastResult, setLastResult] = useState(null);      // Último QR procesado
const [showConfirmation, setShowConfirmation] = useState(false); // Pantalla confirmación
const [backendStatus, setBackendStatus] = useState('checking'); // Estado backend

// Referencias para control directo
const videoRef = useRef(null);        // Elemento <video>
const codeReader = useRef(null);      // BrowserQRCodeReader instance
```

## 🎥 Sistema de Cámara y QR

### Camera Initialization Flow
```javascript
1. 📷 Enumerar dispositivos de video disponibles
   └── navigator.mediaDevices.enumerateDevices()

2. 🔍 Configurar polyfills para compatibilidad
   ├── navigator.mediaDevices (si no existe)
   ├── getUserMedia (webkit/moz/ms prefixes)
   └── enumerateDevices fallback

3. 🎬 Inicializar stream de video
   ├── getUserMedia con constraints específicos
   ├── Resolución: 640x480 ideal, 1280x720 max
   ├── Frame rate: 15fps ideal, 30fps max
   └── Asignar stream a <video> element

4. 🔍 Configurar ZXing QR Reader
   ├── new BrowserQRCodeReader()
   ├── decodeFromVideoDevice(deviceId, videoElement, callback)
   └── Polling continuo para detección QR
```

### QR Processing Flow
```javascript
1. 📱 QR Detectado por ZXing
   └── callback recibe result.getText()

2. 🛑 Pausar escaneo automáticamente
   └── Evitar lecturas duplicadas

3. 📤 Enviar datos al backend
   ├── Electron: window.electronAPI.database.processQR()
   ├── Web: fetch() directo al API
   └── Incluir timestamp para validación

4. 📊 Procesar respuesta
   ├── Success: Mostrar pantalla verde/naranja (Entrada/Salida)
   ├── Error: Mostrar pantalla roja con mensaje
   └── Auto-hide después de 3 segundos

5. 🔄 Reanudar escaneo automático
   └── Continuar polling para próximo QR
```

## 🎨 Interfaz de Usuario (React + Tailwind)

### Componentes Principales
```jsx
// Layout principal
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

  // Header con título e indicadores
  <Header>
    - Título del sistema
    - Indicador estado cámara (verde/rojo)
    - Indicador estado backend
  </Header>

  // Panel principal dividido
  <MainContent>
    // Panel izquierdo - Vista cámara
    <CameraPanel>
      - <video> elemento para stream
      - Overlay de escaneo (marco punteado)
      - Selector de cámara (si múltiples)
      - Botones: Pausar/Reanudar, Reintentar, Salir
    </CameraPanel>

    // Panel derecho - Estado e información  
    <StatusPanel>
      - Estado sistema (Backend, Cámara, Escaneando)
      - Mensaje de estado actual
      - (Futuro: Historial reciente)
    </StatusPanel>
  </MainContent>

  // Pantalla confirmación overlay (modal)
  <ConfirmationScreen>
    - Pantalla completa verde/naranja/roja
    - Mensaje grande: "ENTRADA" / "SALIDA" / "ERROR"
    - Nombre del usuario
    - Timestamp
    - Auto-hide 3 segundos
  </ConfirmationScreen>
</div>
```

### Estados Visuales
```javascript
// Estados de cámara
cameraActive = true  → Indicador verde + video activo
cameraActive = false → Indicador rojo + placeholder

// Estados de escaneo  
isScanning = true    → Marco verde pulsante "ESCANEANDO..."
isScanning = false   → Marco amarillo "PAUSADO"

// Estados de backend
backendStatus = 'connected'    → "CONECTADO" verde
backendStatus = 'disconnected' → "DESCONECTADO" rojo  
backendStatus = 'checking'     → "VERIFICANDO..." amarillo

// Pantallas de confirmación
success + tipo="Entrada" → Pantalla verde
success + tipo="Salida"  → Pantalla naranja
success = false          → Pantalla roja
```

## 🔄 Comunicación Frontend ↔ Backend

### Dual Environment Support
```javascript
// Detección de entorno
const isElectron = typeof window !== 'undefined' && window.electronAPI;

if (isElectron) {
  // Electron IPC - Via main process
  const result = await window.electronAPI.database.processQR(qrData);
} else {
  // Web Browser - Direct HTTP
  const response = await fetch(`${API_BASE_URL}/qr/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrData })
  });
}
```

### Backend URL Configuration
```javascript
// Configuración dinámica de API
const getBackendURL = () => {
  if (isElectron) {
    // Desde variables de entorno del main process
    return process.env.API_BASE_URL || 'http://localhost:3001/api';
  } else {
    // Desde Next.js environment variables  
    return process.env.API_BASE_URL || (
      process.env.NODE_ENV === 'production' 
        ? 'https://api.lector.lab.informaticauaint.com/api'
        : 'http://localhost:3001/api'
    );
  }
};
```

### Health Checking
```javascript
// Verificación automática cada 30 segundos
const checkBackendConnection = async () => {
  try {
    setBackendStatus('checking');
    
    if (isElectron) {
      const result = await window.electronAPI.database.checkConnection();
      setBackendStatus(result.success ? 'connected' : 'disconnected');
    } else {
      const healthUrl = baseUrl.replace('/api', '/health');
      const response = await fetch(healthUrl);
      setBackendStatus(response.ok ? 'connected' : 'disconnected');
    }
  } catch (error) {
    setBackendStatus('disconnected');
  }
};
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
npm run dev              # Usa .env.dev
npm run dev:web-prod-api # Usa .env.prod-api

# Solo Next.js (para desarrollo web)  
npm run dev:next         # Usa .env.dev
npm run dev:prod-api     # Usa .env.prod-api

# Solo Electron (requiere Next.js ejecutándose)
npm run dev:electron     # Espera localhost:3020
```

### Build Scripts
```bash
# Build Next.js
npm run build            # Build básico
npm run build:prod       # Build con .env.prod

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

// ⚠️ Development only
webSecurity: false              // Solo para cámara local
allowRunningInsecureContent     // Solo desarrollo
```

### Context Bridge Security
```javascript
// Solo exponer APIs necesarias y controladas
contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ Métodos seguros específicos
  database: { processQR, checkConnection },
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
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

### Camera Performance
```javascript
// Configuración optimizada para QR scanning
const constraints = {
  video: {
    width: { ideal: 640, max: 1280 },    // Balance calidad/rendimiento
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 15, max: 30 }    // 15fps suficiente para QR
  }
};
```

### GPU/Hardware Optimization  
```javascript
// Evitar crashes en sistemas con GPU problemáticas
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
```

### Memory Management
```javascript
// Cleanup en componentWillUnmount
useEffect(() => {
  return () => {
    stopScanning();                    // Detener polling QR
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop()); // Liberar cámara
    }
  };
}, []);
```

## 🐛 Error Handling

### Camera Errors
```javascript
// Tipos de error manejados
'NotAllowedError'     → 'Permisos de cámara denegados'
'NotFoundError'       → 'Cámara no encontrada'  
'NotReadableError'    → 'Cámara en uso por otra aplicación'
'OverconstrainedError' → 'Configuración de cámara no compatible'
```

### QR Processing Errors
```javascript
// Manejo de errores en procesamiento
try {
  const result = await processQRData(qrData);
  // ... handle success
} catch (error) {
  logger.error('Error procesando QR:', error.message);
  setStatusMessage('Error procesando QR');
  // Continuar escaneo después del error
}
```

### Network/Backend Errors  
```javascript
// Fallback cuando backend no disponible
if (backendStatus === 'disconnected') {
  setStatusMessage('⚠️ Backend desconectado - Reintentando...');
  // Continuar verificaciones periódicas
}
```