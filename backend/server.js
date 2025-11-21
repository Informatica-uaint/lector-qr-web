const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const qrRoutes = require('./routes/qr');
const dbRoutes = require('./routes/database');
const doorRoutes = require('./routes/door');
const readerTokenRoutes = require('./routes/readerToken');
const packageJson = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Configurar trust proxy para producción (detrás de load balancer/nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware de seguridad
app.use(helmet());
// Configurar CORS dinámicamente basado en el entorno
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production' 
    ? [
        'https://lector.lab.informaticauaint.com',
        'http://lector.lab.informaticauaint.com'
      ]
    : [
        'http://localhost:3020', 
        'http://127.0.0.1:3020'
      ];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, same-origin)
    if (!origin) return callback(null, true);

    // Validar si el origin está en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.debug(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting - configuración permisiva para dispositivos autorizados
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10000, // máximo 10000 requests por ventana de tiempo (muy permisivo)
  message: 'Demasiadas solicitudes desde esta IP'
});
app.use(limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  logger.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  logger.debug(`Headers:`, req.headers);
  if (req.headers.origin) {
    logger.debug(`🌐 Request origin: ${req.headers.origin}`);
  }
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug(`Body:`, JSON.stringify(req.body).slice(0, 500));
  }
  next();
});

// Rutas
app.use('/api/qr', qrRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/door', doorRoutes);
app.use('/api/reader', readerTokenRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'QR Lector API',
    version: packageJson.version
  });
});

// Ruta para obtener versión del API
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    service: 'QR Lector API',
    version: packageJson.version,
    timestamp: new Date().toISOString()
  });
});

// Ruta por defecto - redirect al frontend
app.get('/', (req, res) => {
  res.redirect(301, 'https://lector.lab.informaticauaint.com');
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  logger.error('💥 Server Error:', error.message);
  logger.debug('Error stack:', error.stack);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
  logger.log(`🚀 QR Lector API ejecutándose en puerto ${PORT}`);
  logger.log(`🌐 Bind address: ${HOST}`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.log(`🗄️ Base de datos: ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DB}`);
  logger.log(`🔗 Health check local: http://localhost:${PORT}/health`);
  logger.log(`🌐 CORS origins:`, allowedOrigins);
  if (process.env.NODE_ENV === 'production') {
    logger.log(`🌐 Health check: https://api.lector.lab.informaticauaint.com/health`);
  }
  logger.debug('Server started with full configuration');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.log('🛑 Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('🛑 Cerrando servidor gracefully...');  
  process.exit(0);
});
