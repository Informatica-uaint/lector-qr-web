import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BrowserQRCodeReader } from '@zxing/library';
import { FiCamera, FiRefreshCw, FiWifi, FiX, FiChevronDown, FiChevronUp, FiRotateCcw } from 'react-icons/fi';
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
  const [systemStatusExpanded, setSystemStatusExpanded] = useState(false);
  const [cameraFlipped, setCameraFlipped] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [backendVersion, setBackendVersion] = useState(null);
  
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const scanningPaused = useRef(false);

  useEffect(() => {
    initializeSystem();
    checkBackendConnection();
    
    // Verificar conexión con backend cada 30 segundos
    const backendCheck = setInterval(checkBackendConnection, 30000);
    
    // Verificar estado de ayudantes cada 15 segundos
    const assistantsCheck = setInterval(checkAssistantsStatus, 15000);
    checkAssistantsStatus(); // Check inicial
    
    // Obtener versión del backend
    fetchBackendVersion();
    
    return () => {
      // Limpiar escaneo
      if (codeReader.current) {
        codeReader.current.reset();
      }
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
          startScanning(cameras[0].deviceId);
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
    setCameraLoading(true);
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
        
        // Quitar loading cuando el video empiece a reproducir
        videoRef.current.onplaying = () => {
          setTimeout(() => setCameraLoading(false), 1200); // Delay aumentado para asegurar carga completa
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
      setCameraLoading(false);
    }
  };


  const startScanning = async (deviceId = null, forceStart = false) => {
    // Si deviceId es un evento del DOM, ignorarlo
    const cleanDeviceId = (deviceId && typeof deviceId === 'string') ? deviceId : null;
    const device = cleanDeviceId || selectedDevice;
    
    if (!device || (isScanning && !forceStart)) return;
    
    try {
      logger.log('🔍 Starting QR scanning...');
      
      setIsScanning(true);
      setStatusMessage('Escaneando automáticamente - Apunte códigos QR...');
      
      // Verificar que el codeReader esté disponible
      if (!codeReader.current) {
        codeReader.current = new BrowserQRCodeReader();
      }
      
      // Si no hay stream de video, inicializarlo
      if (!videoRef.current?.srcObject) {
        await initializeVideoStream(device);
      }
      // Iniciar detección QR
      await codeReader.current.decodeFromVideoDevice(
        device,
        videoRef.current,
        (result, error) => {
          if (result && !scanningPaused.current) {
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
    logger.log('🛑 Stopping QR scanning...');
    
    // Resetear el codeReader para detener la detección
    if (codeReader.current) {
      codeReader.current.reset();
    }
    
    // Resetear bandera de pausa
    scanningPaused.current = false;
    
    // Actualizar estado
    setIsScanning(false);
    setStatusMessage('Escaneo detenido');
  };

  const pauseScanning = () => {
    logger.log('⏸️ Pausing QR scanning temporarily...');
    
    // Activar bandera de pausa sin resetear el codeReader
    scanningPaused.current = true;
    setStatusMessage('Escaneo pausado temporalmente');
  };

  const resumeScanning = () => {
    logger.log('▶️ Resuming QR scanning...');
    
    // Desactivar bandera de pausa
    scanningPaused.current = false;
    setStatusMessage('Escaneando automáticamente - Apunte códigos QR...');
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
      
      // Pausar temporalmente el escaneo para evitar múltiples lecturas
      pauseScanning();
      
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
            
            // Siempre actualizar el estado de ayudantes después de un QR exitoso
            checkAssistantsStatus();
          }
          
          // Mostrar confirmación y esperar 4 segundos antes de reanudar
          setShowConfirmation(true);
          
          // Ocultar confirmación y reanudar escaneo después de 4 segundos
          setTimeout(() => {
            logger.debug('🔄 Hiding confirmation and resuming scan after 4s delay');
            setShowConfirmation(false);
            resumeScanning();
          }, 4000);
        } else {
          // Manejar errores específicos
          setStatusMessage(`Error: ${result.message}`);
          logger.warn(`❌ ERROR DE REGISTRO: ${result.message}`);
          logger.debug('Error details:', result);
          
          // Mostrar error y esperar 4 segundos antes de reanudar
          setShowConfirmation(true);
          
          // Ocultar confirmación y reanudar escaneo después de 4 segundos
          setTimeout(() => {
            logger.debug('🔄 Hiding confirmation and resuming scan after error (4s delay)');
            setShowConfirmation(false);
            resumeScanning();
          }, 4000);
        }
      } else {
        throw new Error('No response from database');
      }
      
    } catch (error) {
      logger.error('Error procesando QR:', error.message);
      logger.debug('QR processing error stack:', error.stack);
      setStatusMessage('Error procesando QR');
      
      // Reanudar escaneo después de 4 segundos incluso si hay error
      setTimeout(() => {
        logger.debug('🔄 Resuming scan after catch error (4s delay)');
        resumeScanning();
      }, 4000);
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
      setAssistantsStatus(prev => ({ ...prev, loading: true }));
      
      const baseUrl = getBackendURL();
      const assistantsUrl = `${baseUrl}/door/assistants-status`;
      
      const response = await fetch(assistantsUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        
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
      setBackendStatus('checking');
      
      if (isElectron) {
        // En Electron, verificar a través del IPC
        const result = await window.electronAPI.database.checkConnection();
        setBackendStatus(result.success ? 'connected' : 'disconnected');
      } else {
        // En web, hacer petición HTTP al endpoint de health
        const baseUrl = getBackendURL();
        
        // Remover solo el '/api' del final y construir URL de health correctamente
        const healthUrl = baseUrl.endsWith('/api') 
          ? baseUrl.slice(0, -4) + '/health'  // Remover los últimos 4 caracteres (/api)
          : baseUrl + '/health';
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        });
        
        setBackendStatus(response.ok ? 'connected' : 'disconnected');
      }
    } catch (error) {
      logger.error('Error verificando conexión backend:', error.message);
      setBackendStatus('disconnected');
    }
  };

  // Obtener versión del backend
  const fetchBackendVersion = async () => {
    try {
      const baseUrl = getBackendURL();
      const versionUrl = `${baseUrl}/version`;
      
      const response = await fetch(versionUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackendVersion(data.version);
      } else {
        logger.warn('Failed to get backend version:', response.status);
      }
    } catch (error) {
      logger.error('Error fetching backend version:', error.message);
    }
  };

  const handleCameraChange = async (newDeviceId) => {
    logger.log('📹 Changing camera to:', newDeviceId);
    const wasScanning = isScanning;
    
    // Detener escaneo actual si está activo
    if (isScanning) {
      stopScanning();
    }
    
    // Recrear completamente el codeReader
    if (codeReader.current) {
      codeReader.current.reset();
    }
    codeReader.current = new BrowserQRCodeReader();
    
    // Limpiar stream actual
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Actualizar device seleccionado
    setSelectedDevice(newDeviceId);
    setStatusMessage('Cambiando cámara...');
    
    try {
      // Inicializar nueva cámara
      await initializeVideoStream(newDeviceId);
      
      // Marcar cámara como activa después de inicialización exitosa
      setCameraActive(true);
      
      // Reanudar automáticamente después del cambio
      setTimeout(() => {
        startScanning(newDeviceId, true);
      }, 500);
    } catch (error) {
      logger.error('Error changing camera:', error.message);
      setStatusMessage('Error cambiando cámara');
      setCameraActive(false);
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
    
    // Iniciar escaneo automáticamente cuando la cámara esté lista
    setTimeout(() => {
      if (cameraActive) {
        startScanning();
      }
    }, 1500);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/informaticauaint-logo.png" 
              alt="Universidad Adolfo Ibáñez - Informática" 
              className="h-12 w-12 rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">
                QR LECTOR LABORATORIO
              </h1>
              <p className="text-slate-300 text-sm">Universidad Adolfo Ibáñez - Informatica UAIn'T</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Estado del laboratorio */}
            <div className={`px-6 py-3 rounded-lg font-semibold text-base ${
              assistantsStatus.loading ? 'bg-yellow-500/20 text-yellow-300' :
              assistantsStatus.count === 0 ? 'bg-red-500/20 text-red-300' :
              assistantsStatus.count === 1 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'
            }`}>
              {assistantsStatus.loading ? 'VERIFICANDO...' :
               assistantsStatus.count === 0 ? '🔒 CERRADO' :
               assistantsStatus.count === 1 ? '🟡 ABIERTO' : '🟢 ABIERTO'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex p-6 gap-6 h-[calc(100vh-120px)]">
        {/* Panel izquierdo - Cámara */}
        <div className="flex-1 bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiCamera className="text-blue-400" />
              Vista de Cámara
            </h2>
            
            <div className="flex gap-2">
              {devices.length > 1 && (
                <select 
                  value={selectedDevice}
                  onChange={(e) => handleCameraChange(e.target.value)}
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
              
              <button
                onClick={() => setCameraFlipped(!cameraFlipped)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                title="Invertir cámara (modo espejo)"
              >
                <FiRotateCcw size={14} />
                Invertir
              </button>
              
            </div>
          </div>
          
          {/* Video container */}
          <div className={`relative rounded-lg overflow-hidden flex-1 flex items-center justify-center ${
            cameraLoading 
              ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
              : 'bg-black'
          }`}>
            {cameraActive ? (
              <video
                ref={videoRef}
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300"
                style={{
                  transform: cameraFlipped ? 'scaleX(-1)' : 'scaleX(1)'
                }}
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
            
            {/* Overlay de loading durante inicialización */}
            {cameraLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-6"></div>
                  <p className="text-white text-lg font-semibold">Inicializando cámara...</p>
                </div>
              </div>
            )}

            {/* Overlay de escaneo */}
            {cameraActive && !cameraLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-dashed rounded-lg border-green-400 opacity-80">
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <span className="px-2 py-1 rounded text-sm font-semibold bg-green-400 text-black animate-pulse">
                      ESCANEANDO...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Control de salir */}
          {typeof window !== 'undefined' && window.electronAPI && (
            <div className="mt-4">
              <button
                onClick={() => window.electronAPI.quitApp()}
                className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <FiX />
                SALIR
              </button>
            </div>
          )}
        </div>

        {/* Panel derecho - Estado e información */}
        <div className={`w-80 flex flex-col gap-4 max-h-full ${
          systemStatusExpanded ? 'overflow-y-auto' : 'overflow-y-hidden'
        }`}>
          {/* Estado del sistema */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50">
            <button
              onClick={() => setSystemStatusExpanded(!systemStatusExpanded)}
              className="w-full p-6 text-left hover:bg-slate-700/20 transition-colors"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <FiWifi className="text-green-400" />
                  Estado del Sistema
                </div>
                {systemStatusExpanded ? (
                  <FiChevronUp className="text-slate-400" />
                ) : (
                  <FiChevronDown className="text-slate-400" />
                )}
              </h3>
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${
              systemStatusExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-6 pb-6 space-y-3">
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
                  <span className="font-semibold text-blue-400">
                    ACTIVO
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
          </div>

          {/* Generación de QR */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-4">
            <h3 className="text-md font-semibold mb-3 text-center">Genera tu QR</h3>
            <div className="text-center">
              <div className="bg-white p-2 rounded-lg inline-block mb-3">
                {/* QR Code placeholder - replace with actual QR image URL */}
                <img 
                  src="/assets/qr-acceso.png" 
                  alt="QR Code para acceso.informaticauaint.com"
                  className="w-48 h-48 mx-auto"
                  onError={(e) => {
                    // Fallback if CDN image doesn't load
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback QR text */}
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-800 text-sm text-center hidden">
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

          {/* Discord QR */}
          <div className="bg-slate-800/30 rounded-xl backdrop-blur-sm border border-slate-700/50 p-4">
            <h3 className="text-md font-semibold mb-3 text-center">Únete a Discord</h3>
            <div className="text-center">
              <div className="bg-white p-2 rounded-lg inline-block mb-3">
                {/* Discord QR Code */}
                <img 
                  src="/assets/qr-discord.png" 
                  alt="QR Code para Discord de Informática UAI"
                  className="w-48 h-48 mx-auto"
                  onError={(e) => {
                    // Fallback if QR image doesn't load
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback Discord text */}
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-800 text-sm text-center hidden">
                  QR para<br/>Discord Informática UAI
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                Únete al servidor de Discord
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Comunidad Informática UAI
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer con versiones */}
      <div className="fixed bottom-0 right-0 p-2 text-xs text-slate-500 bg-slate-900/50 rounded-tl-lg">
        <div className="flex gap-3">
          <span>Frontend: v1.5.1</span>
          {backendVersion && <span>Backend: v{backendVersion}</span>}
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