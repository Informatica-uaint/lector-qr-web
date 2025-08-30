const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // API para manejo de base de datos
  database: {
    connect: (config) => ipcRenderer.invoke('db-connect', config),
    processQR: (qrData) => ipcRenderer.invoke('db-process-qr', qrData),
    testConnection: () => ipcRenderer.invoke('db-test-connection'),
    checkConnection: () => ipcRenderer.invoke('db-check-connection')
  }
});