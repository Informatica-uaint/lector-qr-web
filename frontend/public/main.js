const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const logger = require('../utils/logger');
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
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

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
  
  logger.log('🚀 Loading app URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
      logger.log('👨‍💻 DevTools opened for development');
    }
    logger.log('✓ Electron window ready');
  });

  // Debug console logs
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logger.debug(`[Renderer] ${message}`);
  });

  return mainWindow;
}

app.whenReady().then(() => {
  logger.log('🚀 Electron app ready, creating window...');
  createWindow();
});

// Permitir permisos de medios
app.whenReady().then(() => {
  const { session } = require('electron');
  
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'camera' || permission === 'microphone' || permission === 'media') {
      logger.log('✓ Permission granted for:', permission);
      callback(true);
    } else {
      logger.warn('❌ Permission denied for:', permission);
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
    logger.log('🔍 Testing database connection...');
    const response = await axios.get(`${API_BASE_URL}/db/test`, {
      timeout: 5000
    });
    
    if (response.data.success) {
      logger.log('✓ API y base de datos conectadas');
      logger.debug('DB Test response:', response.data);
      return true;
    }
    logger.warn('❌ Database connection failed');
    return false;
  } catch (error) {
    logger.error('✗ Error conectando con API:', error.message);
    logger.debug('Error details:', error.response?.data || error);
    return false;
  }
}

async function processQRData(qrData) {
  try {
    logger.log('📱 Processing QR data via API...');
    logger.debug('QR Data being sent:', JSON.stringify(qrData).slice(0, 200));
    
    const response = await axios.post(`${API_BASE_URL}/qr/process`, {
      qrData: qrData
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.log('✓ QR processing completed');
    logger.debug('API Response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('✗ Error procesando QR via API:', error.message);
    logger.debug('Error details:', error.response?.data || error);
    
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
    logger.log('🔄 Attempting database reconnection...');
    const response = await axios.post(`${API_BASE_URL}/db/reconnect`, {}, {
      timeout: 5000
    });
    
    if (response.data.success) {
      logger.log('✓ Database reconnection successful');
    } else {
      logger.error('❌ Database reconnection failed');
    }
    
    return response.data.success;
  } catch (error) {
    logger.error('✗ Error reconectando via API:', error.message);
    logger.debug('Error details:', error.response?.data || error);
    return false;
  }
}

app.on('window-all-closed', () => {
  logger.log('💻 All windows closed');
  if (process.platform !== 'darwin') {
    logger.log('🚑 Quitting app (non-macOS)');
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.log('🍎 App activated, creating new window (macOS)');
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  const version = app.getVersion();
  logger.debug('App version requested:', version);
  return version;
});

ipcMain.handle('quit-app', async () => {
  logger.log('🚑 Quit app requested via IPC');
  app.quit();
});

ipcMain.handle('db-test-connection', async () => {
  logger.debug('📞 IPC: db-test-connection called');
  return await testDBConnection();
});

ipcMain.handle('db-process-qr', async (event, qrData) => {
  logger.debug('📞 IPC: db-process-qr called');
  return await processQRData(qrData);
});

ipcMain.handle('db-connect', async () => {
  logger.debug('📞 IPC: db-connect called');
  return await reconnectDB();
});

// Nuevo handler para verificar conexión con backend
ipcMain.handle('db-check-connection', async () => {
  try {
    logger.debug('📞 IPC: db-check-connection called');
    const baseURL = API_BASE_URL.replace('/api', '');
    logger.debug('Checking backend health at:', `${baseURL}/health`);
    
    const response = await axios.get(`${baseURL}/health`, {
      timeout: 5000
    });
    
    logger.log('✓ Backend health check successful');
    logger.debug('Health response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error('✗ Error verificando conexión backend:', error.message);
    logger.debug('Error details:', error.response?.data || error);
    return { success: false, message: 'Backend no disponible' };
  }
});

// Nuevo handler para obtener el estado de la API
ipcMain.handle('api-status', async () => {
  try {
    logger.debug('📞 IPC: api-status called');
    const response = await axios.get(`${API_BASE_URL}/../health`, {
      timeout: 3000
    });
    
    logger.debug('API status response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('✗ API status check failed:', error.message);
    return { status: 'error', message: 'API no disponible' };
  }
});