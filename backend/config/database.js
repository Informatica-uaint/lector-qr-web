const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'registro_qr',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      charset: 'utf8mb4'
    };
  }

  async getConnection() {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection(this.config);
        console.log('✓ Conexión MySQL establecida');
      }
      return this.connection;
    } catch (error) {
      console.error('✗ Error conectando a MySQL:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      const connection = await this.getConnection();
      await connection.execute('SELECT 1 as test');
      console.log('✓ Test de conexión MySQL exitoso');
      return true;
    } catch (error) {
      console.error('✗ Error en test de conexión MySQL:', error.message);
      return false;
    }
  }

  async closeConnection() {
    if (this.connection) {
      try {
        await this.connection.end();
        this.connection = null;
        console.log('✓ Conexión MySQL cerrada');
      } catch (error) {
        console.error('✗ Error cerrando conexión MySQL:', error.message);
      }
    }
  }

  async query(sql, params = []) {
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('✗ Error ejecutando query:', error.message);
      throw error;
    }
  }
}

// Instancia global
const dbManager = new DatabaseManager();

module.exports = dbManager;