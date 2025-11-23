const dbManager = require('../config/database');
const logger = require('../utils/logger');

/**
 * QRModel - Modelo para consultas relacionadas con el estado del laboratorio
 *
 * Este modelo se encarga de verificar el estado de ayudantes presentes en el laboratorio,
 * consultando la base de datos de registros que es gestionada por otro servicio.
 */
class QRModel {
  /**
   * Verifica si actualmente hay ayudantes en el laboratorio
   * @returns {number} Cantidad de ayudantes presentes
   */
  static async checkAssistantsPresent() {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      logger.debug(`🔍 Verificando ayudantes presentes en fecha: ${fechaHoy}`);

      // Query para obtener todos los registros de ayudantes del día, ordenados por hora
      const registros = await dbManager.query(`
        SELECT email, tipo, hora, nombre, apellido
        FROM registros
        WHERE fecha = ?
        ORDER BY hora ASC
      `, [fechaHoy]);

      logger.debug(`📊 Total registros ayudantes hoy: ${registros.length}`);

      // Agrupar registros por email para determinar el último estado
      const ayudantesStatus = {};

      registros.forEach(registro => {
        ayudantesStatus[registro.email] = {
          ultimoTipo: registro.tipo,
          ultimaHora: registro.hora,
          nombre: registro.nombre,
          apellido: registro.apellido
        };
      });

      // Contar ayudantes que tienen "Entrada" como último registro
      const ayudantesDentro = Object.values(ayudantesStatus)
        .filter(status => status.ultimoTipo === 'Entrada');

      const cantidadAyudantes = ayudantesDentro.length;

      logger.log(`👥 Ayudantes actualmente en laboratorio: ${cantidadAyudantes}`);

      if (cantidadAyudantes > 0) {
        logger.debug('Ayudantes presentes:', ayudantesDentro.map(a => `${a.nombre} ${a.apellido}`));
      }

      return cantidadAyudantes;
    } catch (error) {
      logger.error('Error verificando ayudantes presentes:', error.message);
      logger.debug('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Obtiene el detalle de ayudantes actualmente presentes
   * @returns {Array} Lista de ayudantes presentes con detalles
   */
  static async getAssistantsPresent() {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      logger.debug(`📋 Obteniendo detalles de ayudantes presentes: ${fechaHoy}`);

      const registros = await dbManager.query(`
        SELECT email, tipo, hora, nombre, apellido
        FROM registros
        WHERE fecha = ?
        ORDER BY hora ASC
      `, [fechaHoy]);

      const ayudantesStatus = {};

      registros.forEach(registro => {
        ayudantesStatus[registro.email] = {
          email: registro.email,
          ultimoTipo: registro.tipo,
          ultimaHora: registro.hora,
          nombre: registro.nombre,
          apellido: registro.apellido
        };
      });

      const ayudantesDentro = Object.values(ayudantesStatus)
        .filter(status => status.ultimoTipo === 'Entrada')
        .map(ayudante => ({
          email: ayudante.email,
          nombre: ayudante.nombre,
          apellido: ayudante.apellido,
          horaEntrada: ayudante.ultimaHora
        }));

      logger.debug(`✅ Encontrados ${ayudantesDentro.length} ayudantes presentes`);
      return ayudantesDentro;
    } catch (error) {
      logger.error('Error obteniendo detalles de ayudantes:', error.message);
      logger.debug('Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = QRModel;
