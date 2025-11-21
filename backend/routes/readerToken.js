const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

const router = express.Router();

const signingKey = process.env.READER_QR_SECRET;
const defaultTtlSeconds = parseInt(process.env.READER_QR_TTL || '60', 10);
const stationId = process.env.STATION_ID || 'lector-web';

router.get('/token', (req, res) => {
  if (!signingKey) {
    logger.error('❌ READER_QR_SECRET no configurada');
    return res.status(500).json({
      success: false,
      message: 'Configuración inválida: falta READER_QR_SECRET'
    });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const expiresIn = Math.max(defaultTtlSeconds, 15); // evitar TTL demasiado corto

  const payload = {
    station_id: stationId,
    nonce,
    iat: nowSeconds
  };

  const token = jwt.sign(payload, signingKey, {
    algorithm: 'HS256',
    expiresIn
  });

  res.json({
    success: true,
    token,
    stationId,
    expiresIn
  });
});

module.exports = router;
