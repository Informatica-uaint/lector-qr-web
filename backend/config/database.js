const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'registro_qr',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      charset: 'utf8mb4',
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    };
  }

  async getPool() {
    try {
      if (!this.pool) {
        this.pool = mysql.createPool(this.config);
        logger.log('✓ Pool MySQL establecido');
        logger.debug('Pool config:', {
          host: this.config.host,
          user: this.config.user,
          database: this.config.database,
          port: this.config.port,
          connectionLimit: this.config.connectionLimit
        });
      }
      return this.pool;
    } catch (error) {
      logger.error('✗ Error creando pool MySQL:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      const pool = await this.getPool();
      const [rows] = await pool.execute('SELECT 1 as test');
      logger.log('✓ Test de conexión MySQL exitoso');
      return true;
    } catch (error) {
      logger.error('✗ Error en test de conexión MySQL:', error.message);
      return false;
    }
  }

  async closePool() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        logger.log('✓ Pool MySQL cerrado');
      } catch (error) {
        logger.error('✗ Error cerrando pool MySQL:', error.message);
      }
    }
  }

  async query(sql, params = []) {
    const startTime = Date.now();
    
    try {
      // Log de la query (solo en desarrollo)
      logger.debug('\n🔍 [DB QUERY]');
      logger.debug('📝 SQL:', sql);
      if (params && params.length > 0) {
        logger.debug('📋 Params:', params);
      }
      
      const pool = await this.getPool();
      const [rows] = await pool.execute(sql, params);
      
      const duration = Date.now() - startTime;
      
      // Log del resultado (solo en desarrollo)
      logger.debug('✅ Rows affected/returned:', Array.isArray(rows) ? rows.length : 1);
      logger.debug('⏱️  Query duration:', `${duration}ms`);
      if (duration > 1000) {
        logger.warn('⚠️  Slow query detected:', `${duration}ms`);
      }
      logger.debug('🔚 [DB QUERY END]\n');
      
      return rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('\n❌ [DB ERROR]');
      logger.error('📝 SQL:', sql);
      if (params && params.length > 0) {
        logger.error('📋 Params:', params);
      }
      logger.error('💥 Error:', error.message);
      logger.error('⏱️  Query duration:', `${duration}ms`);
      logger.debug('Stack trace:', error.stack);
      logger.error('🔚 [DB ERROR END]\n');
      
      throw error;
    }
  }
}

// Instancia global
const dbManager = new DatabaseManager();

module.exports = dbManager;