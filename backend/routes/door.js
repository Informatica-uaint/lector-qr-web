const express = require('express');
const logger = require('../utils/logger');
const QRModel = require('../models/QRModel');

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
 * Abre la puerta del laboratorio ejecutando open_door.py
 * SOLO se ejecuta si está autorizado (ayudante entrando o estudiante con ayudantes presentes)
 */
router.post('/open', async (req, res) => {
  logger.warn('Puerta ahora se maneja en backend Flask');
  return res.status(410).json({ success: false, message: 'Puerta manejada por backend Flask' });
});

/**
 * POST /api/door/check-and-open
 * Verifica condiciones y abre la puerta si está autorizado
 * Lógica: Ayudante -> Siempre abre, Estudiante -> Solo si hay al menos 2 ayudantes presentes
 */
router.post('/check-and-open', async (req, res) => {
  logger.warn('Puerta ahora se maneja en backend Flask');
  return res.status(410).json({ success: false, message: 'Puerta manejada por backend Flask' });
});

module.exports = router;
