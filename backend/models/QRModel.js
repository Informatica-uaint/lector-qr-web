const dbManager = require('../config/database');

class QRModel {
  /**
   * Procesa los datos de un código QR y registra la asistencia
   * @param {Object} qrData - Datos del código QR
   * @returns {Object} Resultado del procesamiento
   */
  static async processQRData(qrData) {
    try {
      console.log('🔍 Procesando QR, tipo:', typeof qrData, 'contenido:', JSON.stringify(qrData).slice(0, 100));
      
      // Parsear datos del QR
      let qrJson;
      if (typeof qrData === 'string') {
        try {
          qrJson = JSON.parse(qrData);
          console.log('✓ QR parseado desde string:', JSON.stringify(qrJson));
        } catch (jsonError) {
          console.log('❌ Error parseando JSON:', jsonError.message);
          return { success: false, message: 'Formato QR inválido' };
        }
      } else {
        qrJson = qrData;
        console.log('✓ QR recibido como objeto:', JSON.stringify(qrJson));
      }

      // Validar timestamp del QR (15 segundos de tolerancia)
      const qrTimestamp = qrJson.timestamp;
      if (qrTimestamp) {
        const currentTimeMs = Date.now();
        const timeDiffSeconds = (currentTimeMs - qrTimestamp) / 1000;
        
        if (Math.abs(timeDiffSeconds) > 15) {
          return { success: false, message: 'QR expirado o inválido' };
        }
      } else {
        return { success: false, message: 'QR sin timestamp válido' };
      }

      // Extraer y validar datos del QR
      const name = qrJson.name || qrJson.nombre || '';
      const surname = qrJson.surname || qrJson.apellido || '';
      const email = qrJson.email || '';
      const userType = qrJson.type || qrJson.tipo || qrJson.tipoUsuario || '';

      console.log('📋 Datos extraídos - Nombre:', name, 'Apellido:', surname, 'Email:', email, 'Tipo:', userType);

      if (!name || !surname || !email) {
        console.log('❌ Datos incompletos:', { name, surname, email });
        return { success: false, message: 'Datos QR incompletos' };
      }

      // Buscar usuario en la base de datos
      console.log('🔍 Buscando usuario con email:', email);
      const user = await this.findUser(email);
      
      if (!user) {
        console.log('❌ Usuario no encontrado en base de datos:', email);
        return { success: false, message: `Usuario no autorizado: ${email}` };
      }
      
      console.log('✓ Usuario encontrado:', JSON.stringify(user));

      // Determinar tipo de registro (Entrada/Salida)
      const now = new Date();
      const fechaHoy = now.toISOString().split('T')[0];
      
      // Determinar el tipo de usuario del QR (AYUDANTE o ESTUDIANTE)
      const qrTipoUsuario = qrJson.tipoUsuario;
      
      const registrosCount = await this.getRegistrosCount(email, fechaHoy, qrTipoUsuario);
      const tipoRegistro = registrosCount % 2 === 0 ? 'Entrada' : 'Salida';

      // Insertar registro en la tabla correcta según el tipo de usuario
      const registroId = await this.insertRegistro({
        fecha: fechaHoy,
        hora: now.toTimeString().split(' ')[0],
        dia: now.toLocaleDateString('es-ES', { weekday: 'long' }),
        nombre: name,
        apellido: surname,
        email: email,
        metodo: 'QR',
        tipo: tipoRegistro,
        tipoUsuario: qrTipoUsuario
      });

      return {
        success: true,
        message: `${name} ${surname}`,
        tipo: tipoRegistro,
        usuario_tipo: user.tipo,
        fecha: fechaHoy,
        hora: now.toTimeString().split(' ')[0],
        timestamp: now.toLocaleTimeString(),
        registro_id: registroId
      };

    } catch (error) {
      console.error('Error procesando QR:', error);
      return { 
        success: false, 
        message: `Error interno: ${error.message.slice(0, 50)}` 
      };
    }
  }

  /**
   * Busca un usuario en las tablas de usuarios permitidos y estudiantes
   * @param {string} email - Email del usuario
   * @returns {Object|null} Usuario encontrado o null
   */
  static async findUser(email) {
    try {
      // Buscar en usuarios_permitidos (ayudantes)
      let users = await dbManager.query(`
        SELECT id, nombre, apellido, email, TP as tipo, activo 
        FROM usuarios_permitidos 
        WHERE email = ? AND activo = 1
      `, [email]);

      if (users.length > 0) {
        return users[0];
      }

      // Si no se encuentra, buscar en usuarios_estudiantes
      users = await dbManager.query(`
        SELECT id, nombre, apellido, email, TP as tipo, activo 
        FROM usuarios_estudiantes 
        WHERE email = ? AND activo = 1
      `, [email]);

      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error buscando usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de registros de un usuario en una fecha específica
   * @param {string} email - Email del usuario
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @param {string} tipoUsuario - Tipo de usuario (AYUDANTE o ESTUDIANTE)
   * @returns {number} Número de registros
   */
  static async getRegistrosCount(email, fecha, tipoUsuario = 'AYUDANTE') {
    try {
      // Seleccionar tabla correcta según el tipo de usuario
      const tabla = tipoUsuario === 'ESTUDIANTE' ? 'EST_registros' : 'registros';
      
      const result = await dbManager.query(`
        SELECT COUNT(*) as registros
        FROM ${tabla} 
        WHERE email = ? AND fecha = ?
      `, [email, fecha]);

      return result[0]?.registros || 0;
    } catch (error) {
      console.error('Error obteniendo conteo de registros:', error);
      throw error;
    }
  }

  /**
   * Inserta un nuevo registro en la base de datos
   * @param {Object} registro - Datos del registro
   * @returns {number} ID del registro insertado
   */
  static async insertRegistro(registro) {
    try {
      // Seleccionar tabla correcta según el tipo de usuario
      const tabla = registro.tipoUsuario === 'ESTUDIANTE' ? 'EST_registros' : 'registros';
      
      const result = await dbManager.query(`
        INSERT INTO ${tabla} (fecha, hora, dia, nombre, apellido, email, metodo, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        registro.fecha,
        registro.hora, 
        registro.dia,
        registro.nombre,
        registro.apellido,
        registro.email,
        registro.metodo,
        registro.tipo
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error insertando registro:', error);
      throw error;
    }
  }

  /**
   * Obtiene los registros recientes
   * @param {number} limit - Límite de registros
   * @returns {Array} Array de registros
   */
  static async getRecentRegistros(limit = 10) {
    try {
      return await dbManager.query(`
        SELECT * FROM registros 
        ORDER BY fecha DESC, hora DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      console.error('Error obteniendo registros recientes:', error);
      throw error;
    }
  }
}

module.exports = QRModel;