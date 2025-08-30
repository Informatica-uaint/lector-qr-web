const express = require('express');
const dbManager = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/db/test
 * Prueba la conexión a la base de datos
 */
router.get('/test', async (req, res) => {
  try {
    logger.log('🔍 Testing database connection...');
    const isConnected = await dbManager.testConnection();
    
    if (isConnected) {
      logger.log('✓ Database connection test successful');
      res.status(200).json({
        success: true,
        message: 'Conexión a base de datos exitosa',
        timestamp: new Date().toISOString(),
        database: {
          host: process.env.MYSQL_HOST,
          port: process.env.MYSQL_PORT,
          database: process.env.MYSQL_DB
        }
      });
    } else {
      logger.error('❌ Database connection test failed');
      res.status(500).json({
        success: false,
        message: 'Error conectando a base de datos'
      });
    }

  } catch (error) {
    logger.error('Error en /api/db/test:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/db/status
 * Obtiene el estado actual de la base de datos
 */
router.get('/status', async (req, res) => {
  try {
    logger.debug('🔍 Getting database status...');
    const connection = await dbManager.getConnection();
    const [result] = await connection.execute('SELECT NOW() as server_time, VERSION() as version');
    
    logger.log('✓ Database status retrieved successfully');
    logger.debug('DB Status:', result[0]);
    
    res.status(200).json({
      success: true,
      message: 'Base de datos operativa',
      data: {
        server_time: result[0].server_time,
        version: result[0].version,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        database: process.env.MYSQL_DB
      }
    });

  } catch (error) {
    logger.error('Error en /api/db/status:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de base de datos'
    });
  }
});

/**
 * POST /api/db/reconnect
 * Fuerza una reconexión a la base de datos
 */
router.post('/reconnect', async (req, res) => {
  try {
    logger.log('🔄 Attempting database reconnection...');
    await dbManager.closeConnection();
    const isConnected = await dbManager.testConnection();
    
    if (isConnected) {
      logger.log('✓ Database reconnection successful');
      res.status(200).json({
        success: true,
        message: 'Reconexión exitosa'
      });
    } else {
      logger.error('❌ Database reconnection failed');
      res.status(500).json({
        success: false,
        message: 'Error en reconexión'
      });
    }

  } catch (error) {
    logger.error('Error en /api/db/reconnect:', error.message);
    logger.debug('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;