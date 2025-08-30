const dbManager = require('../config/database');
const logger = require('../utils/logger');

class QRModel {
  /**
   * Procesa los datos de un código QR y registra la asistencia
   * @param {Object} qrData - Datos del código QR
   * @returns {Object} Resultado del procesamiento
   */
  static async processQRData(qrData) {
    try {
      logger.log('🔍 Procesando QR, tipo:', typeof qrData, 'contenido:', JSON.stringify(qrData).slice(0, 100));
      
      // Parsear datos del QR
      let qrJson;
      if (typeof qrData === 'string') {
        try {
          qrJson = JSON.parse(qrData);
          logger.debug('✓ QR parseado desde string:', JSON.stringify(qrJson));
        } catch (jsonError) {
          logger.error('❌ Error parseando JSON:', jsonError.message);
          return { success: false, message: 'Formato QR inválido' };
        }
      } else {
        qrJson = qrData;
        logger.debug('✓ QR recibido como objeto:', JSON.stringify(qrJson));
      }

      // Validar timestamp del QR (15 segundos de tolerancia)
      const qrTimestamp = qrJson.timestamp;
      if (qrTimestamp) {
        const currentTimeMs = Date.now();
        const timeDiffSeconds = (currentTimeMs - qrTimestamp) / 1000;
        
        logger.debug(`🕰️ Timestamp validation: QR=${qrTimestamp}, Current=${currentTimeMs}, Diff=${timeDiffSeconds}s`);
        
        if (Math.abs(timeDiffSeconds) > 15) {
          logger.warn('❌ QR expirado - Diferencia de tiempo:', timeDiffSeconds, 'segundos');
          return { success: false, message: 'QR expirado o inválido' };
        }
      } else {
        logger.error('❌ QR sin timestamp válido');
        return { success: false, message: 'QR sin timestamp válido' };
      }

      // Extraer y validar datos del QR
      const name = qrJson.name || qrJson.nombre || '';
      const surname = qrJson.surname || qrJson.apellido || '';
      const email = qrJson.email || '';
      const userType = qrJson.type || qrJson.tipo || qrJson.tipoUsuario || '';

      logger.log('📋 Datos extraídos - Nombre:', name, 'Apellido:', surname, 'Email:', email, 'Tipo:', userType);

      if (!name || !surname || !email) {
        logger.warn('❌ Datos incompletos:', { name, surname, email });
        return { success: false, message: 'Datos QR incompletos' };
      }

      // Buscar usuario en la base de datos
      logger.log('🔍 Buscando usuario con email:', email);
      const user = await this.findUser(email);
      
      if (!user) {
        logger.warn('❌ Usuario no encontrado en base de datos:', email);
        
        // Determinar tipo de error según el tipo de usuario del QR
        const qrTipoUsuario = qrJson.tipoUsuario;
        
        if (qrTipoUsuario === 'ESTUDIANTE') {
          return { 
            success: false, 
            message: `Solicita ser agregado a la base de datos`,
            errorType: 'ESTUDIANTE_NO_REGISTRADO',
            email: email
          };
        } else {
          return { 
            success: false, 
            message: `No Autorizado`,
            errorType: 'USUARIO_NO_AUTORIZADO',
            email: email
          };
        }
      }
      
      logger.log('✓ Usuario encontrado:', JSON.stringify(user));
      logger.debug('User details:', user);

      // Determinar tipo de registro (Entrada/Salida)
      const now = new Date();
      const fechaHoy = now.toISOString().split('T')[0];
      
      // Determinar el tipo de usuario del QR (AYUDANTE o ESTUDIANTE)
      const qrTipoUsuario = qrJson.tipoUsuario;
      
      logger.debug(`📅 Procesando registro para fecha: ${fechaHoy}, tipo usuario: ${qrTipoUsuario}`);
      
      const registrosCount = await this.getRegistrosCount(email, fechaHoy, qrTipoUsuario);
      const tipoRegistro = registrosCount % 2 === 0 ? 'Entrada' : 'Salida';
      
      logger.log(`🔢 Registros existentes: ${registrosCount}, Tipo a registrar: ${tipoRegistro}`);

      // Insertar registro en la tabla correcta según el tipo de usuario
      const registroData = {
        fecha: fechaHoy,
        hora: now.toTimeString().split(' ')[0],
        dia: now.toLocaleDateString('es-ES', { weekday: 'long' }),
        nombre: name,
        apellido: surname,
        email: email,
        metodo: 'QR',
        tipo: tipoRegistro,
        tipoUsuario: qrTipoUsuario
      };
      
      logger.debug('📦 Insertando registro:', registroData);
      const registroId = await this.insertRegistro(registroData);
      logger.log(`✓ Registro insertado con ID: ${registroId}`);

      const result = {
        success: true,
        message: `${name} ${surname}`,
        tipo: tipoRegistro,
        usuario_tipo: user.tipo,
        fecha: fechaHoy,
        hora: now.toTimeString().split(' ')[0],
        timestamp: now.toLocaleTimeString(),
        registro_id: registroId
      };
      
      logger.log('✅ QR procesado exitosamente:', result.message, result.tipo);
      return result;

    } catch (error) {
      logger.error('Error procesando QR:', error.message);
      logger.debug('Error stack:', error.stack);
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
      logger.debug('🔍 [FIND USER] Buscando usuario con email:', email);
      
      // Buscar en usuarios_permitidos (ayudantes)
      logger.debug('📋 [FIND USER] Buscando en tabla usuarios_permitidos...');
      let users = await dbManager.query(`
        SELECT id, nombre, apellido, email, TP as tipo, activo 
        FROM usuarios_permitidos 
        WHERE email = ? AND activo = 1
      `, [email]);

      if (users.length > 0) {
        logger.debug('✅ [FIND USER] Usuario encontrado en usuarios_permitidos:', JSON.stringify(users[0]));
        return users[0];
      }
      logger.debug('❌ [FIND USER] Usuario no encontrado en usuarios_permitidos');

      // Si no se encuentra, buscar en usuarios_estudiantes
      logger.debug('📋 [FIND USER] Buscando en tabla usuarios_estudiantes...');
      users = await dbManager.query(`
        SELECT id, nombre, apellido, email, TP as tipo, activo 
        FROM usuarios_estudiantes 
        WHERE email = ? AND activo = 1
      `, [email]);

      if (users.length > 0) {
        logger.debug('✅ [FIND USER] Usuario encontrado en usuarios_estudiantes:', JSON.stringify(users[0]));
        return users[0];
      }
      
      logger.debug('❌ [FIND USER] Usuario no encontrado en ninguna tabla');
      return null;
    } catch (error) {
      logger.error('💥 [FIND USER] Error buscando usuario:', error.message);
      logger.debug('Error stack:', error.stack);
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
      logger.debug(`🔢 Contando registros en tabla: ${tabla} para ${email} en ${fecha}`);
      
      const result = await dbManager.query(`
        SELECT COUNT(*) as registros
        FROM ${tabla} 
        WHERE email = ? AND fecha = ?
      `, [email, fecha]);

      const count = result[0]?.registros || 0;
      logger.debug(`🔢 Registros encontrados: ${count}`);
      return count;
    } catch (error) {
      logger.error('Error obteniendo conteo de registros:', error.message);
      logger.debug('Error stack:', error.stack);
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
      logger.debug(`📦 Insertando en tabla: ${tabla}`);
      
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

      logger.debug(`✓ Registro insertado con ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      logger.error('Error insertando registro:', error.message);
      logger.debug('Error stack:', error.stack);
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
      logger.debug(`📄 Obteniendo ${limit} registros recientes`);
      return await dbManager.query(`
        SELECT * FROM registros 
        ORDER BY fecha DESC, hora DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error obteniendo registros recientes:', error.message);
      logger.debug('Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = QRModel;