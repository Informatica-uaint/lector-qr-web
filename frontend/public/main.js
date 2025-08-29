const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const isDev = process.env.NODE_ENV === 'development';

// Fix GPU process crashes
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');

// Enable media access
app.commandLine.appendSwitch('--enable-media-stream');
app.commandLine.appendSwitch('--use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('--disable-web-security');

// Configuración de la API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'QR Lector - Lab Informática UAI',
    show: false,
    backgroundColor: '#1a1a2e'
  });

  // Cargar la aplicación Next.js
  const startUrl = isDev 
    ? 'http://localhost:3020' 
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    console.log('✓ Electron window ready');
  });

  // Debug console logs
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();
});

// Permitir permisos de medios
app.whenReady().then(() => {
  const { session } = require('electron');
  
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'camera' || permission === 'microphone' || permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'camera' || permission === 'microphone' || permission === 'media') {
      return true;
    }
    return false;
  });
});

// Funciones de API
async function testDBConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}/db/test`, {
      timeout: 5000
    });
    
    if (response.data.success) {
      console.log('✓ API y base de datos conectadas');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Error conectando con API:', error.message);
    return false;
  }
}

async function processQRData(qrData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/qr/process`, {
      qrData: qrData
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('✗ Error procesando QR via API:', error.message);
    
    if (error.response) {
      return error.response.data;
    } else {
      return {
        success: false,
        message: 'Error de conectividad con API'
      };
    }
  }
}

async function reconnectDB() {
  try {
    const response = await axios.post(`${API_BASE_URL}/db/reconnect`, {}, {
      timeout: 5000
    });
    
    return response.data.success;
  } catch (error) {
    console.error('✗ Error reconectando via API:', error.message);
    return false;
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', async () => {
  app.quit();
});

ipcMain.handle('db-test-connection', async () => {
  return await testDBConnection();
});

ipcMain.handle('db-process-qr', async (event, qrData) => {
  return await processQRData(qrData);
});

ipcMain.handle('db-connect', async () => {
  return await reconnectDB();
});

// Nuevo handler para obtener el estado de la API
ipcMain.handle('api-status', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/../health`, {
      timeout: 3000
    });
    return response.data;
  } catch (error) {
    return { status: 'error', message: 'API no disponible' };
  }
});