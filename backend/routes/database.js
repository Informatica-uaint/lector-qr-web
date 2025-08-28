const express = require('express');
const dbManager = require('../config/database');

const router = express.Router();

/**
 * GET /api/db/test
 * Prueba la conexión a la base de datos
 */
router.get('/test', async (req, res) => {
  try {
    const isConnected = await dbManager.testConnection();
    
    if (isConnected) {
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
      res.status(500).json({
        success: false,
        message: 'Error conectando a base de datos'
      });
    }

  } catch (error) {
    console.error('Error en /api/db/test:', error);
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
    const connection = await dbManager.getConnection();
    const [result] = await connection.execute('SELECT NOW() as server_time, VERSION() as version');
    
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
    console.error('Error en /api/db/status:', error);
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
    await dbManager.closeConnection();
    const isConnected = await dbManager.testConnection();
    
    if (isConnected) {
      res.status(200).json({
        success: true,
        message: 'Reconexión exitosa'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error en reconexión'
      });
    }

  } catch (error) {
    console.error('Error en /api/db/reconnect:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;