const express = require('express');
const Joi = require('joi');
const QRModel = require('../models/QRModel');
const logger = require('../utils/logger');

const router = express.Router();

// Schema de validación para datos QR
const qrSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  nombre: Joi.string().min(1).max(100),
  surname: Joi.string().min(1).max(100),
  apellido: Joi.string().min(1).max(100),
  email: Joi.string().email().required(),
  type: Joi.string().min(1).max(50),
  tipo: Joi.string().min(1).max(50),
  tipoUsuario: Joi.string().valid('ESTUDIANTE', 'AYUDANTE'),
  timestamp: Joi.number().integer().positive().required(),
  status: Joi.string().optional(),
  autoRenewal: Joi.boolean().optional()
}).or('name', 'nombre').or('surname', 'apellido').or('type', 'tipo', 'tipoUsuario');

/**
 * POST /api/qr/process
 * Procesa un código QR y registra la asistencia
 */
router.post('/process', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    logger.log('📱 QR recibido:', JSON.stringify(qrData).slice(0, 200));
    logger.debug('Request headers:', req.headers);
    logger.debug('Full request body:', req.body);

    if (!qrData) {
      logger.warn('❌ Error: Datos QR faltantes');
      return res.status(400).json({
        success: false,
        message: 'Datos QR requeridos'
      });
    }

    // Validar formato de datos QR
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (parseError) {
      logger.error('❌ Error parseando QR data:', parseError.message);
      logger.debug('Raw QR data:', qrData);
      return res.status(400).json({
        success: false,
        message: 'Formato QR inválido'
      });
    }

    // Validar schema
    const { error } = qrSchema.validate(parsedData);
    if (error) {
      logger.warn('❌ Schema validation failed:', error.details[0].message);
      logger.debug('Invalid data:', parsedData);
      return res.status(400).json({
        success: false,
        message: `Datos QR inválidos: ${error.details[0].message}`
      });
    }
    
    logger.debug('✓ QR data validation passed');

    // Procesar QR
    const result = await QRModel.processQRData(parsedData);

    if (result.success) {
      logger.log(`✓ QR procesado exitosamente: ${result.message} - ${result.tipo}`);
      logger.debug('Process result:', result);
      res.status(200).json(result);
    } else {
      logger.warn(`✗ Error procesando QR: ${result.message}`);
      logger.debug('Process failure result:', result);
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error('Error en /api/qr/process:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/qr/recent
 * Obtiene los registros más recientes
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    logger.debug(`Getting recent records with limit: ${limit}`);
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100'
      });
    }

    const registros = await QRModel.getRecentRegistros(limit);
    
    logger.log(`✓ Retrieved ${registros.length} recent records`);
    logger.debug('Recent records:', registros.slice(0, 3)); // Log first 3 records only
    
    res.status(200).json({
      success: true,
      data: registros,
      count: registros.length
    });

  } catch (error) {
    logger.error('Error en /api/qr/recent:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo registros'
    });
  }
});

/**
 * GET /api/qr/stats
 * Obtiene estadísticas básicas de registros
 */
router.get('/stats', async (req, res) => {
  try {
    // Implementar estadísticas básicas (opcional)
    res.status(200).json({
      success: true,
      message: 'Estadísticas no implementadas aún'
    });
  } catch (error) {
    logger.error('Error en /api/qr/stats:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

module.exports = router;