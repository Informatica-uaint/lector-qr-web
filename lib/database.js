const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'horarios_lab',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      charset: 'utf8mb4',
      timezone: 'local',
      acquireTimeout: 60000,
      timeout: 60000,
    };
  }

  async getConnection() {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection(this.config);
      }
      return this.connection;
    } catch (error) {
      console.error('Error conectando a MySQL:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      const connection = await this.getConnection();
      await connection.execute('SELECT 1');
      console.log('✓ Conexión MySQL exitosa');
      return true;
    } catch (error) {
      console.error('✗ Error probando conexión MySQL:', error.message);
      return false;
    }
  }

  async processQRData(qrData) {
    let connection = null;
    
    try {
      connection = await this.getConnection();
      
      // Parsear datos del QR
      let qrJson;
      if (typeof qrData === 'string') {
        try {
          qrJson = JSON.parse(qrData);
        } catch (jsonError) {
          return { success: false, message: 'Formato QR inválido' };
        }
      } else {
        qrJson = qrData;
      }

      // Validar timestamp del QR (15 segundos de tolerancia)
      const qrTimestamp = qrJson.timestamp;
      if (qrTimestamp) {
        const currentTimeMs = Date.now();
        const timeDiffSeconds = (currentTimeMs - qrTimestamp) / 1000;
        
        // Verificar si el QR ha expirado (más de 15 segundos)
        if (Math.abs(timeDiffSeconds) > 15) {
          return { success: false, message: 'QR expirado o inválido' };
        }
      } else {
        return { success: false, message: 'QR sin timestamp válido' };
      }

      // Extraer datos del QR
      const name = qrJson.name || qrJson.nombre || '';
      const surname = qrJson.surname || qrJson.apellido || '';
      const email = qrJson.email || '';
      const userType = qrJson.type || qrJson.tipo || '';

      if (!name || !surname || !email) {
        return { success: false, message: 'Datos QR incompletos' };
      }

      // Buscar usuario en la base de datos
      let user = null;
      
      // Primero buscar en usuarios_permitidos (ayudantes)
      const [permitidosRows] = await connection.execute(`
        SELECT id, nombre, apellido, email, TP as tipo, activo 
        FROM usuarios_permitidos 
        WHERE email = ? AND activo = 1
      `, [email]);

      if (permitidosRows.length > 0) {
        user = permitidosRows[0];
      } else {
        // Si no se encuentra, buscar en usuarios_estudiantes
        const [estudiantesRows] = await connection.execute(`
          SELECT id, nombre, apellido, email, TP as tipo, activo 
          FROM usuarios_estudiantes 
          WHERE email = ? AND activo = 1
        `, [email]);

        if (estudiantesRows.length > 0) {
          user = estudiantesRows[0];
        }
      }

      if (!user) {
        return { success: false, message: `Usuario no autorizado: ${email}` };
      }

      // Determinar tipo de registro (Entrada/Salida)
      const now = new Date();
      const fechaHoy = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const [registrosRows] = await connection.execute(`
        SELECT COUNT(*) as registros
        FROM registros 
        WHERE email = ? AND fecha = ?
      `, [email, fechaHoy]);

      const count = registrosRows[0].registros || 0;
      const tipoRegistro = count % 2 === 0 ? 'Entrada' : 'Salida';

      // Insertar registro
      const horaActual = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const diaSemana = now.toLocaleDateString('es-ES', { weekday: 'long' });

      await connection.execute(`
        INSERT INTO registros (fecha, hora, dia, nombre, apellido, email, metodo, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [fechaHoy, horaActual, diaSemana, name, surname, email, 'QR', tipoRegistro]);

      return {
        success: true,
        message: `${name} ${surname}`,
        tipo: tipoRegistro,
        usuario_tipo: user.tipo,
        fecha: fechaHoy,
        hora: horaActual,
        timestamp: now.toLocaleTimeString()
      };

    } catch (error) {
      console.error('Error procesando QR:', error);
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Error en rollback:', rollbackError);
        }
      }
      return { 
        success: false, 
        message: `Error interno: ${error.message.slice(0, 50)}` 
      };
    }
  }

  async close() {
    if (this.connection) {
      try {
        await this.connection.end();
        this.connection = null;
        console.log('✓ Conexión MySQL cerrada');
      } catch (error) {
        console.error('Error cerrando conexión:', error);
      }
    }
  }
}

module.exports = { DatabaseManager };