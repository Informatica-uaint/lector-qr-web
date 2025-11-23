const express = require('express');
const logger = require('../utils/logger');
const QRModel = require('../models/QRModel');

const router = express.Router();

/**
 * GET /api/assistants/status
 * Obtiene el estado actual de ayudantes en el laboratorio
 */
router.get('/status', async (req, res) => {
  try {
    logger.debug('🔍 Verificando estado de ayudantes en laboratorio...');

    const assistantsCount = await QRModel.checkAssistantsPresent();
    const assistantsDetails = assistantsCount > 0 ? await QRModel.getAssistantsPresent() : [];

    logger.log(`👥 Estado ayudantes: ${assistantsCount > 0 ? 'PRESENTES' : 'AUSENTES'} (${assistantsCount} ayudantes)`);

    res.status(200).json({
      success: true,
      assistantsPresent: assistantsCount > 0,
      count: assistantsCount,
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

module.exports = router;
