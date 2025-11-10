const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const QRModel = require('../models/QRModel');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Función auxiliar para ejecutar el script open_door.py
 * @returns {Promise} Promesa que se resuelve cuando el script termina exitosamente
 */
async function executeOpenDoorScript() {
  const scriptPath = path.join(__dirname, 'open_door.py');
  logger.log('🐍 Ejecutando script open_door.py:', scriptPath);

  const pythonProcess = spawn('python3', [scriptPath]);
  let scriptOutput = '';
  let scriptError = '';

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    scriptOutput += output + '\n';
    logger.log(`[open_door.py] ${output}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    const error = data.toString().trim();
    scriptError += error + '\n';
    logger.warn(`[open_door.py ERROR] ${error}`);
  });

  return new Promise((resolve, reject) => {
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        logger.log('✅ Puerta abierta exitosamente via open_door.py');
        resolve({ success: true, output: scriptOutput.trim() });
      } else {
        logger.error(`❌ Script open_door.py terminó con código: ${code}`);
        reject(new Error(`Script failed with code ${code}: ${scriptError}`));
      }
    });

    pythonProcess.on('error', (err) => {
      logger.error('❌ Error ejecutando open_door.py:', err.message);
      reject(err);
    });
  });
}

/**
 * GET /api/door/assistants-status
 * Verifica si hay ayudantes actualmente en el laboratorio
 */
router.get('/assistants-status', async (req, res) => {
  try {
    logger.debug('🔍 Verificando estado de ayudantes en laboratorio...');
    
    const assistantsPresent = await QRModel.checkAssistantsPresent();
    const assistantsDetails = assistantsPresent ? await QRModel.getAssistantsPresent() : [];
    
    logger.log(`👥 Estado ayudantes: ${assistantsPresent ? 'PRESENTES' : 'AUSENTES'} (${assistantsDetails.length} ayudantes)`);
    
    res.status(200).json({
      success: true,
      assistantsPresent: assistantsPresent,
      count: assistantsDetails.length,
      assistants: assistantsDetails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error verificando estado de ayudantes:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno verificando estado de ayudantes'
    });
  }
});

/**
 * POST /api/door/open
 * Abre la puerta del laboratorio ejecutando open_door.py
 * SOLO se ejecuta si está autorizado (ayudante entrando o estudiante con ayudantes presentes)
 */
router.post('/open', async (req, res) => {
  try {
    const { userType, userName, authorized = false } = req.body;

    logger.log('🚪 Solicitud de apertura de puerta:', { userType, userName, authorized });

    if (!authorized) {
      logger.warn('❌ Intento de apertura de puerta no autorizada');
      return res.status(403).json({
        success: false,
        message: 'Apertura de puerta no autorizada'
      });
    }

    // Ejecutar script open_door.py usando la función auxiliar
    const result = await executeOpenDoorScript();

    res.status(200).json({
      success: true,
      message: 'Puerta abierta exitosamente',
      userType: userType,
      userName: userName,
      timestamp: new Date().toISOString(),
      scriptOutput: result.output
    });

  } catch (error) {
    logger.error('Error abriendo puerta:', error.message);
    logger.debug('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Error interno abriendo puerta',
      error: error.message
    });
  }
});

/**
 * POST /api/door/check-and-open
 * Verifica condiciones y abre la puerta si está autorizado
 * Lógica: Ayudante -> Siempre abre, Estudiante -> Solo si hay al menos 2 ayudantes presentes
 */
router.post('/check-and-open', async (req, res) => {
  try {
    const { userType, userName, userEmail, actionType } = req.body;
    
    logger.log('🔍 Verificando autorización para apertura:', { 
      userType, userName, userEmail, actionType 
    });

    if (!userType || !userName || !actionType) {
      return res.status(400).json({
        success: false,
        message: 'Datos requeridos: userType, userName, actionType'
      });
    }

    let authorized = false;
    let reason = '';

    if (userType === 'AYUDANTE') {
      // Ayudantes siempre pueden abrir la puerta
      authorized = true;
      reason = 'Ayudante autorizado';
      logger.log('✅ Ayudante autorizado para abrir puerta:', userName);
      
    } else if (userType === 'ESTUDIANTE') {
      // Estudiantes solo pueden abrir si hay al menos 2 ayudantes presentes
      const assistantsPresent = await QRModel.checkAssistantsPresent();
      
      if (assistantsPresent) {
        authorized = true;
        reason = 'Al menos 2 ayudantes presentes en laboratorio';
        logger.log('✅ Estudiante autorizado - hay al menos 2 ayudantes presentes:', userName);
      } else {
        authorized = false;
        reason = 'Laboratorio cerrado - se requieren al menos 2 ayudantes presentes';
        logger.log('❌ Estudiante no autorizado - laboratorio cerrado:', userName);
      }
      
    } else {
      authorized = false;
      reason = 'Tipo de usuario no válido';
      logger.warn('❌ Tipo de usuario no válido:', userType);
    }

    const response = {
      success: true,
      authorized: authorized,
      reason: reason,
      userType: userType,
      userName: userName,
      actionType: actionType,
      timestamp: new Date().toISOString()
    };

    if (authorized) {
      // Si está autorizado, intentar abrir la puerta
      try {
        const doorResult = await executeOpenDoorScript();
        response.doorOpened = true;
        response.doorResponse = {
          success: true,
          message: 'Puerta abierta exitosamente',
          scriptOutput: doorResult.output
        };
        logger.log('🚪 Puerta abierta exitosamente para:', userName);

      } catch (doorError) {
        logger.error('Error abriendo puerta después de autorización:', doorError.message);
        response.doorOpened = false;
        response.doorError = 'Error técnico abriendo puerta';
      }
    } else {
      response.doorOpened = false;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error en check-and-open:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno verificando autorización'
    });
  }
});

module.exports = router;