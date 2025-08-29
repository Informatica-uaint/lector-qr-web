const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const qrRoutes = require('./routes/qr');
const dbRoutes = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para producción (detrás de load balancer/nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware de seguridad
app.use(helmet());
// Configurar CORS dinámicamente basado en el entorno
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://lector.lab.informaticauaint.com',
      'http://lector.lab.informaticauaint.com'
    ]
  : [
      'http://localhost:3020', 
      'http://127.0.0.1:3020'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: 'Demasiadas solicitudes desde esta IP'
});
app.use(limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/qr', qrRoutes);
app.use('/api/db', dbRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'QR Lector API',
    version: '1.0.0'
  });
});

// Ruta por defecto - redirect al frontend
app.get('/', (req, res) => {
  res.redirect(301, 'https://lector.lab.informaticauaint.com');
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('Error:', error);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QR Lector API ejecutándose en puerto ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️ Base de datos: ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DB}`);
  console.log(`🔗 Health check local: http://localhost:${PORT}/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Health check: https://api.lector.lab.informaticauaint.com/health`);
  }
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor gracefully...');  
  process.exit(0);
});