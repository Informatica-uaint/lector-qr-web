import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import { FiCamera, FiPause, FiPlay, FiRefreshCw, FiWifi, FiX } from 'react-icons/fi';

export default function QRLector() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Iniciando sistema...');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    initializeSystem();
    return () => {
      stopScanning();
      // Limpiar stream de video
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const initializeSystem = async () => {
    try {
      // Inicializar lector QR
      codeReader.current = new BrowserQRCodeReader();
      
      // Polyfill completo para navigator.mediaDevices
      if (!navigator.mediaDevices) {
        console.warn('navigator.mediaDevices no disponible, creando polyfill...');
        navigator.mediaDevices = {};
      }
      
      // Polyfill para getUserMedia
      if (!navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia no disponible, usando polyfill...');
        
        // Debug: verificar qué APIs están disponibles
        console.log('navigator.getUserMedia:', !!navigator.getUserMedia);
        console.log('navigator.webkitGetUserMedia:', !!navigator.webkitGetUserMedia);
        console.log('navigator.mozGetUserMedia:', !!navigator.mozGetUserMedia);
        console.log('navigator.msGetUserMedia:', !!navigator.msGetUserMedia);
        
        // Buscar getUserMedia en diferentes prefijos
        const getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia || 
                           navigator.mozGetUserMedia || 
                           navigator.msGetUserMedia;
        
        if (getUserMedia) {
          console.log('✓ getUserMedia encontrado, creando polyfill...');
          navigator.mediaDevices.getUserMedia = function(constraints) {
            return new Promise((resolve, reject) => {
              getUserMedia.call(navigator, constraints, resolve, reject);
            });
          };
        } else {
          console.error('✗ No se encontró ninguna versión de getUserMedia');
          // Fallback final - solo para testing, no funcionará realmente
          navigator.mediaDevices.getUserMedia = function(constraints) {
            return Promise.reject(new Error('getUserMedia no está soportado en este navegador'));
          };
        }
      } else {
        console.log('✓ navigator.mediaDevices.getUserMedia ya disponible');
      }
      
      // Polyfill para enumerateDevices
      if (!navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices no disponible, usando polyfill...');
        navigator.mediaDevices.enumerateDevices = function() {
          return Promise.resolve([
            { deviceId: 'default', kind: 'videoinput', label: 'Cámara por defecto' }
          ]);
        };
      }
      
      // Obtener dispositivos de cámara usando navigator.mediaDevices
      const videoDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = videoDevices.filter(device => device.kind === 'videoinput');
      setDevices(cameras);
      
      if (cameras.length > 0) {
        setSelectedDevice(cameras[0].deviceId);
        setCameraActive(true);
        setStatusMessage('Cámara disponible - Iniciando escaneo automático');
        
        // Inicializar stream de video inmediatamente
        await initializeVideoStream(cameras[0].deviceId);
        
        // Iniciar escaneo automático después de un pequeño delay
        setTimeout(() => {
          startScanning();
        }, 1000);
      } else {
        setStatusMessage('No se encontraron cámaras');
      }
      
      
    } catch (error) {
      console.error('Error inicializando sistema:', error);
      setStatusMessage('Error inicializando sistema');
    }
  };

  const initializeVideoStream = async (deviceId) => {
    try {
      // Verificar permisos primero (skip si no está disponible)
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        console.log('Permission status:', result.state);
        
        if (result.state === 'denied') {
          throw new Error('Permisos de cámara denegados');
        }
      } catch (permError) {
        console.warn('navigator.permissions no disponible, saltando verificación:', permError);
      }
      
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
        };
      }
      
      console.log('Stream de video inicializado');
    } catch (error) {
      console.error('Error inicializando stream de video:', error);
      let errorMessage = 'Error accediendo a la cámara';
      
      if (error.name === 'NotAllowedError' || error.message.includes('denegados')) {
        errorMessage = 'Permisos de cámara denegados - Verifique configuración';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Cámara no encontrada';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Cámara en uso por otra aplicación';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Configuración de cámara no compatible';
      }
      
      setStatusMessage(errorMessage);
      setCameraActive(false);
    }
  };


  const startScanning = async () => {
    if (!selectedDevice || isScanning) return;
    
    try {
      setIsScanning(true);
      setStatusMessage('Escaneando automáticamente - Apunte códigos QR...');
      
      // Si no hay stream de video, inicializarlo
      if (!videoRef.current?.srcObject) {
        await initializeVideoStream(selectedDevice);
      }
      
      // Iniciar detección QR
      await codeReader.current.decodeFromVideoDevice(
        selectedDevice,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleQRResult(result.getText());
          }
          // Ignorar errores comunes de no encontrar QR
          if (error && error.message && !error.message.includes('No QR code found') && !error.message.includes('NotFoundException')) {
            console.warn('Error escaneando:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error iniciando escaneo:', error);
      setStatusMessage('Error accediendo a la cámara');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
    setStatusMessage('Escaneo pausado - Click REANUDAR para continuar');
  };

  // Función para procesar QR según el entorno (Electron vs Web)
  const processQRData = async (qrData) => {
    const isElectron = window.electronAPI;
    
    if (isElectron) {
      // Entorno Electron - usar IPC
      console.log('🖥️ Procesando QR via Electron IPC');
      return await window.electronAPI.database.processQR(qrData);
    } else {
      // Entorno Web - usar HTTP directo
      console.log('🌐 Procesando QR via HTTP API');
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.lector.lab.informaticauaint.com/api/qr/process'
        : 'http://localhost:3002/api/qr/process';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    }
  };

  const handleQRResult = async (qrData) => {
    try {
      console.log('QR detectado:', qrData);
      setStatusMessage('Procesando QR...');
      
      // Procesar QR según el entorno
      const result = await processQRData(qrData);
      
      if (result) {
        setLastResult({
          ...result,
          timestamp: result.timestamp || new Date().toLocaleTimeString()
        });
        
        if (result.success) {
          setStatusMessage(`${result.tipo} registrada`);
          console.log(`ACCESO REGISTRADO: ${result.tipo} - ${result.message}`);
          
          // Pausar escaneo temporalmente y mostrar pantalla de confirmación
          stopScanning();
          setShowConfirmation(true);
          
          // Ocultar confirmación después de 3 segundos y reanudar escaneo
          setTimeout(() => {
            setShowConfirmation(false);
            setStatusMessage('Escaneando automáticamente - Listo para próximo QR');
            
            // Reanudar escaneo automático si no está ya escaneando
            if (!isScanning && cameraActive) {
              startScanning();
            }
          }, 3000);
        } else {
          setStatusMessage(`Error: ${result.message}`);
          console.log(`ERROR DE REGISTRO: ${result.message}`);
        }
      } else {
        throw new Error('No response from database');
      }
      
    } catch (error) {
      console.error('Error procesando QR:', error);
      setStatusMessage('Error procesando QR');
    }
  };

  const retryCamera = async () => {
    setCameraActive(false);
    setStatusMessage('Reintentando cámara...');
    
    // Limpiar stream actual
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    await initializeSystem();
    
    // Reiniciar escaneo automático si la cámara vuelve a estar disponible
    setTimeout(() => {
      if (cameraActive && !isScanning) {
        startScanning();
      }
    }, 1500);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              QR LECTOR LABORATORIO
            </h1>
            <p className="text-slate-300 text-sm">Universidad Adolfo Ibáñez - Informática - Electron + MySQL</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Indicadores de estado */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Cámara</span>
            </div>
            
          </div>
        </div>
      </div>

      <div className="flex p-6 gap-6 min-h-[calc(100vh-120px)]">
        {/* Panel izquierdo - Cámara */}
        <div className="flex-1 bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiCamera className="text-blue-400" />
              Vista de Cámara
            </h2>
            
            <div className="flex gap-2">
              {devices.length > 1 && (
                <select 
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Cámara ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={retryCamera}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <FiRefreshCw size={14} />
                Reintentar
              </button>
            </div>
          </div>
          
          {/* Video container */}
          <div className="relative bg-black rounded-lg overflow-hidden h-80">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-900">
                <div className="text-center">
                  <FiCamera size={48} className="mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400">Cámara no disponible</p>
                  <p className="text-slate-500 text-sm">Conecte una cámara web</p>
                </div>
              </div>
            )}
            
            {/* Overlay de escaneo */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-48 border-4 border-dashed rounded-lg transition-colors ${
                  isScanning ? 'border-green-400 opacity-80' : 'border-yellow-400 opacity-50'
                }`}>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${
                      isScanning 
                        ? 'bg-green-400 text-black animate-pulse' 
                        : 'bg-yellow-400 text-black'
                    }`}>
                      {isScanning ? 'ESCANEANDO...' : 'PAUSADO'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Controles de cámara */}
          <div className="mt-4 flex gap-3">
            {cameraActive && (
              <button
                onClick={isScanning ? stopScanning : startScanning}
                className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isScanning 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isScanning ? <FiPause /> : <FiPlay />}
                {isScanning ? 'PAUSAR ESCANEO' : 'REANUDAR ESCANEO'}
              </button>
            )}
            
            {window.electronAPI && (
              <button
                onClick={() => window.electronAPI.quitApp()}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
              >
                <FiX />
                SALIR
              </button>
            )}
          </div>
        </div>

        {/* Panel derecho - Estado e información */}
        <div className="w-80 space-y-6">
          {/* Estado del sistema */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiWifi className="text-green-400" />
              Estado del Sistema
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cámara:</span>
                <span className={`font-semibold ${cameraActive ? 'text-green-400' : 'text-red-400'}`}>
                  {cameraActive ? 'OPERATIVA' : 'ERROR'}
                </span>
              </div>
              
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Escaneando:</span>
                <span className={`font-semibold ${isScanning ? 'text-blue-400' : 'text-slate-500'}`}>
                  {isScanning ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
            </div>
          </div>

          {/* Mensaje de estado */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Estado Actual</h3>
            <p className="text-slate-300 text-center p-4 bg-slate-700/50 rounded-lg">
              {statusMessage}
            </p>
          </div>



        </div>
      </div>

      {/* Pantalla de confirmación */}
      {showConfirmation && lastResult && lastResult.success && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${
          lastResult.tipo === 'Entrada' 
            ? 'bg-green-500' 
            : 'bg-orange-500'
        } bg-opacity-95 backdrop-blur-sm`}>
          <div className="text-center text-white">
            <div className="text-9xl font-black mb-8 tracking-wider">
              {lastResult.tipo?.toUpperCase()}
            </div>
            <div className="text-4xl font-bold mb-4">
              {lastResult.message}
            </div>
            <div className="text-2xl opacity-90">
              {lastResult.timestamp}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}