const express = require('express');
const axios = require('axios');
const QRModel = require('../models/QRModel');
const logger = require('../utils/logger');

const router = express.Router();

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
 * Abre la puerta del laboratorio via ESPHome
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

    // Verificar configuración ESPHome
    const espHomeUrl = process.env.ESPHOME_URL;
    const espHomeToken = process.env.ESPHOME_TOKEN;
    const doorEntityId = process.env.ESPHOME_DOOR_ENTITY_ID || 'button.door_open';

    if (!espHomeUrl) {
      logger.error('❌ ESPHOME_URL no configurada');
      return res.status(500).json({
        success: false,
        message: 'Configuración de puerta no disponible'
      });
    }

    logger.debug('🔧 Configuración ESPHome:', { 
      url: espHomeUrl, 
      entityId: doorEntityId,
      hasToken: !!espHomeToken 
    });

    // Construir URL y headers para ESPHome
    const apiUrl = `${espHomeUrl}/button/${doorEntityId}/press`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (espHomeToken) {
      headers['Authorization'] = `Bearer ${espHomeToken}`;
    }

    logger.log('🌐 Enviando comando a ESPHome:', apiUrl);
    logger.debug('Headers ESPHome:', headers);

    // Enviar comando a ESPHome
    const response = await axios.post(apiUrl, {}, {
      headers: headers,
      timeout: 5000
    });

    logger.log('✅ Puerta abierta exitosamente via ESPHome');
    logger.debug('Respuesta ESPHome:', response.data);

    res.status(200).json({
      success: true,
      message: 'Puerta abierta exitosamente',
      userType: userType,
      userName: userName,
      timestamp: new Date().toISOString(),
      espHomeResponse: response.data
    });

  } catch (error) {
    logger.error('Error abriendo puerta:', error.message);
    logger.debug('Error stack:', error.stack);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({
        success: false,
        message: 'Sistema de puerta no disponible'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'Error de autenticación con sistema de puerta'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno abriendo puerta'
    });
  }
});

/**
 * POST /api/door/check-and-open
 * Verifica condiciones y abre la puerta si está autorizado
 * Lógica: Ayudante -> Siempre abre, Estudiante -> Solo si hay ayudantes
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
      // Estudiantes solo pueden abrir si hay ayudantes presentes
      const assistantsPresent = await QRModel.checkAssistantsPresent();
      
      if (assistantsPresent) {
        authorized = true;
        reason = 'Ayudantes presentes en laboratorio';
        logger.log('✅ Estudiante autorizado - hay ayudantes presentes:', userName);
      } else {
        authorized = false;
        reason = 'Laboratorio cerrado - no hay ayudantes presentes';
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
        const doorResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/door/open`, {
          userType: userType,
          userName: userName,
          authorized: true
        });

        response.doorOpened = true;
        response.doorResponse = doorResponse.data;
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