import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BrowserQRCodeReader } from '@zxing/library';
import { FiCamera, FiPause, FiPlay, FiRefreshCw, FiWifi, FiX } from 'react-icons/fi';
import logger from '../utils/clientLogger';

function QRLector() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Iniciando sistema...');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected', 'disconnected', 'checking'
  const [assistantsStatus, setAssistantsStatus] = useState({ present: false, count: 0, loading: false });
  
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    initializeSystem();
    checkBackendConnection();
    
    // Verificar conexión con backend cada 30 segundos
    const backendCheck = setInterval(checkBackendConnection, 30000);
    
    // Verificar estado de ayudantes cada 60 segundos
    const assistantsCheck = setInterval(checkAssistantsStatus, 60000);
    checkAssistantsStatus(); // Check inicial
    
    return () => {
      stopScanning();
      clearInterval(backendCheck);
      clearInterval(assistantsCheck);
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
        logger.warn('navigator.mediaDevices no disponible, creando polyfill...');
        navigator.mediaDevices = {};
      }
      
      // Polyfill para getUserMedia
      if (!navigator.mediaDevices.getUserMedia) {
        logger.warn('getUserMedia no disponible, usando polyfill...');
        
        // Debug: verificar qué APIs están disponibles
        logger.debug('navigator.getUserMedia:', !!navigator.getUserMedia);
        logger.debug('navigator.webkitGetUserMedia:', !!navigator.webkitGetUserMedia);
        logger.debug('navigator.mozGetUserMedia:', !!navigator.mozGetUserMedia);
        logger.debug('navigator.msGetUserMedia:', !!navigator.msGetUserMedia);
        
        // Buscar getUserMedia en diferentes prefijos
        const getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia || 
                           navigator.mozGetUserMedia || 
                           navigator.msGetUserMedia;
        
        if (getUserMedia) {
          logger.log('✓ getUserMedia encontrado, creando polyfill...');
          navigator.mediaDevices.getUserMedia = function(constraints) {
            return new Promise((resolve, reject) => {
              getUserMedia.call(navigator, constraints, resolve, reject);
            });
          };
        } else {
          logger.error('✗ No se encontró ninguna versión de getUserMedia');
          // Fallback final - solo para testing, no funcionará realmente
          navigator.mediaDevices.getUserMedia = function(constraints) {
            return Promise.reject(new Error('getUserMedia no está soportado en este navegador'));
          };
        }
      } else {
        logger.log('✓ navigator.mediaDevices.getUserMedia ya disponible');
      }
      
      // Polyfill para enumerateDevices
      if (!navigator.mediaDevices.enumerateDevices) {
        logger.warn('enumerateDevices no disponible, usando polyfill...');
        navigator.mediaDevices.enumerateDevices = function() {
          return Promise.resolve([
            { deviceId: 'default', kind: 'videoinput', label: 'Cámara por defecto' }
          ]);
        };
      }
      
      // Obtener dispositivos de cámara usando navigator.mediaDevices
      logger.log('📹 Enumerating video devices...');
      const videoDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = videoDevices.filter(device => device.kind === 'videoinput');
      logger.log(`📹 Found ${cameras.length} camera devices:`, cameras.map(c => c.label || c.deviceId));
      setDevices(cameras);
      
      if (cameras.length > 0) {
        logger.log('✓ Camera available, initializing...');
        setSelectedDevice(cameras[0].deviceId);
        setCameraActive(true);
        setStatusMessage('Cámara disponible - Iniciando escaneo automático');
        
        // Inicializar stream de video inmediatamente
        await initializeVideoStream(cameras[0].deviceId);
        
        // Iniciar escaneo automático después de un pequeño delay
        setTimeout(() => {
          logger.debug('🚀 Starting automatic QR scanning...');
          startScanning();
        }, 1000);
      } else {
        logger.warn('❌ No cameras found');
        setStatusMessage('No se encontraron cámaras');
      }
      
      
    } catch (error) {
      logger.error('Error inicializando sistema:', error.message);
      logger.debug('Error stack:', error.stack);
      setStatusMessage('Error inicializando sistema');
    }
  };

  const initializeVideoStream = async (deviceId) => {
    try {
      // Verificar permisos primero (skip si no está disponible)
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        logger.log('Permission status:', result.state);
        
        if (result.state === 'denied') {
          throw new Error('Permisos de cámara denegados');
        }
      } catch (permError) {
        logger.warn('navigator.permissions no disponible, saltando verificación:', permError.message);
      }
      
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        }
      };
      
      logger.debug('📹 Requesting video stream with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(logger.error);
        };
      }
      
      logger.log('✓ Stream de video inicializado');
    } catch (error) {
      logger.error('Error inicializando stream de video:', error.message);
      logger.debug('Video stream error details:', error);
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
      logger.log('🔍 Starting QR scanning...');
      setIsScanning(true);
      setStatusMessage('Escaneando automáticamente - Apunte códigos QR...');
      
      // Si no hay stream de video, inicializarlo
      if (!videoRef.current?.srcObject) {
        logger.debug('No video stream found, initializing...');
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
            logger.warn('Error escaneando:', error.message);
          }
        }
      );
    } catch (error) {
      logger.error('Error iniciando escaneo:', error.message);
      logger.debug('Scanning error details:', error);
      setStatusMessage('Error accediendo a la cámara');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    logger.log('⏸️ Stopping QR scanning...');
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
    setStatusMessage('Escaneo pausado - Click REANUDAR para continuar');
  };

  // Función para procesar QR según el entorno (Electron vs Web)
  const processQRData = async (qrData) => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    
    if (isElectron) {
      // Entorno Electron - usar IPC
      logger.log('🖥️ Procesando QR via Electron IPC');
      logger.debug('QR data being processed:', JSON.stringify(qrData).slice(0, 200));
      return await window.electronAPI.database.processQR(qrData);
    } else {
      // Entorno Web - usar HTTP directo
      logger.log('🌐 Procesando QR via HTTP API');
      const baseUrl = getBackendURL();
      logger.debug('API URL:', `${baseUrl}/qr/process`);
      logger.debug('QR data being sent:', JSON.stringify(qrData).slice(0, 200));
      const apiUrl = `${baseUrl}/qr/process`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrData })
      });
      
      // Siempre intentar parsear la respuesta JSON, incluso en errores
      const data = await response.json();
      
      // Si la respuesta no es OK pero tenemos datos JSON del backend, devolverlos
      if (!response.ok && data) {
        return data; // El backend ya incluye success: false y el mensaje
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    }
  };

  const handleQRResult = async (qrData) => {
    try {
      logger.log('📱 QR detectado:', qrData.slice(0, 100));
      logger.debug('Full QR data:', qrData);
      setStatusMessage('Procesando QR...');
      
      // Procesar QR según el entorno
      logger.debug('🔄 Processing QR data...');
      const result = await processQRData(qrData);
      logger.debug('QR process result:', result);
      
      if (result) {
        setLastResult({
          ...result,
          timestamp: result.timestamp || new Date().toLocaleTimeString()
        });
        
        if (result.success) {
          // Verificar si hay mensaje especial de laboratorio cerrado
          if (result.door?.specialMessage?.type === 'LABORATORIO_CERRADO') {
            setStatusMessage('Laboratorio cerrado');
            logger.log(`⚠️ LABORATORIO CERRADO: ${result.message}`);
            logger.debug('Door status:', result.door);
            
            // Crear resultado personalizado para mostrar mensaje especial
            setLastResult({
              ...result,
              success: true, // Para que no se muestre como error
              specialType: 'LABORATORIO_CERRADO',
              displayTitle: result.door.specialMessage.title,
              displayMessage: result.door.specialMessage.message,
              timestamp: result.timestamp || new Date().toLocaleTimeString()
            });
          } else {
            setStatusMessage(`${result.tipo} registrada`);
            logger.log(`✅ ACCESO REGISTRADO: ${result.tipo} - ${result.message}`);
            
            // Verificar si la puerta debe abrirse
            if (result.door?.shouldOpen) {
              logger.log('🚪 Puerta autorizada para abrir');
              // Aquí podrías agregar lógica adicional para indicar apertura de puerta
            }
            
            // Actualizar estado de ayudantes si está disponible
            if (result.door && typeof result.door.assistantsPresent === 'boolean') {
              setAssistantsStatus(prev => ({
                ...prev,
                present: result.door.assistantsPresent,
                lastCheck: new Date().toLocaleTimeString()
              }));
            }
          }
          
          // Pausar escaneo temporalmente y mostrar pantalla de confirmación
          stopScanning();
          setShowConfirmation(true);
          
          // Ocultar confirmación después de 3 segundos y reanudar escaneo
          setTimeout(() => {
            logger.debug('🔄 Resuming scanning after confirmation');
            setShowConfirmation(false);
            setStatusMessage('Escaneando automáticamente - Listo para próximo QR');
            
            // Reanudar escaneo automático si no está ya escaneando
            if (!isScanning && cameraActive) {
              startScanning();
            }
          }, 3000);
        } else {
          // Manejar errores específicos
          setStatusMessage(`Error: ${result.message}`);
          logger.warn(`❌ ERROR DE REGISTRO: ${result.message}`);
          logger.debug('Error details:', result);
          
          // Pausar escaneo temporalmente y mostrar pantalla de error
          stopScanning();
          setShowConfirmation(true);
          
          // Ocultar confirmación después de 3 segundos y reanudar escaneo
          setTimeout(() => {
            logger.debug('🔄 Resuming scanning after error display');
            setShowConfirmation(false);
            setStatusMessage('Escaneando automáticamente - Listo para próximo QR');
            
            // Reanudar escaneo automático si no está ya escaneando
            if (!isScanning && cameraActive) {
              startScanning();
            }
          }, 3000);
        }
      } else {
        throw new Error('No response from database');
      }
      
    } catch (error) {
      logger.error('Error procesando QR:', error.message);
      logger.debug('QR processing error stack:', error.stack);
      setStatusMessage('Error procesando QR');
    }
  };

  // Obtener URL del backend según el ambiente
  const getBackendURL = () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    
    if (isElectron) {
      // En Electron, usar la configuración del proceso principal
      const url = process.env.API_BASE_URL || 'http://localhost:3001/api';
      logger.debug('Backend URL (Electron):', url);
      return url;
    } else {
      // En web, usar las variables de Next.js que están expuestas al browser
      const apiBaseUrl = process.env.API_BASE_URL;
      
      // Validar que la URL no esté malformada
      const finalUrl = apiBaseUrl || (
        process.env.NODE_ENV === 'production' 
          ? 'https://api.lector.lab.informaticauaint.com/api'
          : 'http://localhost:3001/api'
      );
      
      logger.debug('Backend URL (Web):', finalUrl);
      return finalUrl;
    }
  };

  // Verificar estado de ayudantes en laboratorio
  const checkAssistantsStatus = async () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    
    try {
      logger.debug('👥 Checking assistants status...');
      setAssistantsStatus(prev => ({ ...prev, loading: true }));
      
      const baseUrl = getBackendURL();
      const assistantsUrl = `${baseUrl}/door/assistants-status`;
      
      logger.debug('Assistants check URL:', assistantsUrl);
      
      const response = await fetch(assistantsUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('Assistants status result:', data);
        
        setAssistantsStatus({
          present: data.assistantsPresent || false,
          count: data.count || 0,
          loading: false,
          lastCheck: new Date().toLocaleTimeString()
        });
      } else {
        logger.warn('Failed to get assistants status:', response.status);
        setAssistantsStatus(prev => ({ ...prev, loading: false }));
      }
      
    } catch (error) {
      logger.error('Error checking assistants status:', error.message);
      setAssistantsStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Verificar conexión con backend
  const checkBackendConnection = async () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    
    try {
      logger.debug('🔍 Checking backend connection...');
      setBackendStatus('checking');
      
      if (isElectron) {
        // En Electron, verificar a través del IPC
        const result = await window.electronAPI.database.checkConnection();
        logger.debug('Backend check result (Electron):', result);
        setBackendStatus(result.success ? 'connected' : 'disconnected');
      } else {
        // En web, hacer petición HTTP al endpoint de health
        const baseUrl = getBackendURL();
        
        // Remover solo el '/api' del final y construir URL de health correctamente
        const healthUrl = baseUrl.endsWith('/api') 
          ? baseUrl.slice(0, -4) + '/health'  // Remover los últimos 4 caracteres (/api)
          : baseUrl + '/health';
        
        logger.debug('Health check URL:', healthUrl);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        });
        
        logger.debug('Health check response:', response.status, response.statusText);
        setBackendStatus(response.ok ? 'connected' : 'disconnected');
      }
    } catch (error) {
      logger.error('Error verificando conexión backend:', error.message);
      logger.debug('Backend connection error:', error);
      setBackendStatus('disconnected');
    }
  };

  const retryCamera = async () => {
    logger.log('🔄 Retrying camera initialization...');
    setCameraActive(false);
    setStatusMessage('Reintentando cámara...');
    
    // Limpiar stream actual
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      logger.debug('Stopping existing video tracks:', tracks.length);
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    await initializeSystem();
    
    // Reiniciar escaneo automático si la cámara vuelve a estar disponible
    setTimeout(() => {
      if (cameraActive && !isScanning) {
        logger.debug('🚀 Auto-starting scanning after camera retry');
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
            {/* Header sin indicadores */}
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
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video min-h-[300px] max-h-[70vh]">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
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
            
            {typeof window !== 'undefined' && window.electronAPI && (
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
                <span className="text-slate-300">Backend:</span>
                <span className={`font-semibold ${
                  backendStatus === 'connected' ? 'text-green-400' : 
                  backendStatus === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {backendStatus === 'connected' ? 'CONECTADO' : 
                   backendStatus === 'disconnected' ? 'DESCONECTADO' : 'VERIFICANDO...'}
                </span>
              </div>
              
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
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Ayudantes:</span>
                <span className={`font-semibold ${
                  assistantsStatus.loading ? 'text-yellow-400 animate-pulse' :
                  assistantsStatus.count === 0 ? 'text-red-400' :
                  assistantsStatus.count === 1 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {assistantsStatus.loading ? 'VERIFICANDO...' : assistantsStatus.count}
                </span>
              </div>
            </div>
          </div>

          {/* Generación de QR */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Genera tu QR</h3>
            <div className="text-center">
              <div className="bg-white p-2 rounded-lg inline-block mb-4">
                {/* QR Code placeholder - replace with actual QR image URL */}
                <img 
                  src="/assets/qr-acceso.png" 
                  alt="QR Code para acceso.informaticauaint.com"
                  className="w-64 h-64 mx-auto"
                  onError={(e) => {
                    // Fallback if CDN image doesn't load
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback QR text */}
                <div className="w-64 h-64 bg-slate-100 flex items-center justify-center text-slate-800 text-sm text-center hidden">
                  QR para<br/>acceso.informaticauaint.com
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                Escanea para generar tu código
              </p>
              <p className="text-slate-400 text-xs mt-2">
                acceso.informaticauaint.com
              </p>
            </div>
          </div>



        </div>
      </div>

      {/* Pantalla de confirmación/error */}
      {showConfirmation && lastResult && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${
          lastResult.success ? (
            lastResult.specialType === 'LABORATORIO_CERRADO'
              ? 'bg-yellow-600'  // Amarillo/naranja para laboratorio cerrado
              : lastResult.tipo === 'Entrada' 
                ? 'bg-green-500' 
                : 'bg-orange-500'
          ) : 'bg-red-500'
        } bg-opacity-95 backdrop-blur-sm`}>
          <div className="text-center text-white">
            <div className="text-9xl font-black mb-8 tracking-wider">
              {lastResult.success ? (
                lastResult.specialType === 'LABORATORIO_CERRADO'
                  ? lastResult.displayTitle?.toUpperCase() || 'LABORATORIO CERRADO'
                  : lastResult.tipo?.toUpperCase()
              ) : 'ERROR'}
            </div>
            <div className="text-4xl font-bold mb-4">
              {lastResult.specialType === 'LABORATORIO_CERRADO' 
                ? lastResult.displayMessage || 'Tocar Timbre'
                : lastResult.message
              }
            </div>
            <div className="text-2xl opacity-90">
              {lastResult.timestamp}
            </div>
            {!lastResult.success && lastResult.email && (
              <div className="text-xl opacity-75 mt-2">
                {lastResult.email}
              </div>
            )}
            {/* Mostrar nombre del usuario también en caso de laboratorio cerrado */}
            {lastResult.specialType === 'LABORATORIO_CERRADO' && lastResult.message && (
              <div className="text-xl opacity-75 mt-2">
                {lastResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Exportar con SSR desactivado
export default dynamic(() => Promise.resolve(QRLector), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <p>Cargando QR Lector...</p>
    </div>
  </div>
});