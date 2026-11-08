// services/register-collection.service.js
const AppError = require('../../../utils/app-error');
const db = require('../../../database/models');

// Validations
const {
  validateId,
  normalizeCollectionPayload,
} = require('../validations/recoleccion.validation');

const validarCaptura = require('../../../utils/validar-captura-recorrido');

// Utils
const {
  getOperationalContext,
  getRoutePointOrFail,
  calculateDistanceMeters,
} = require('../utils/recoleccion-service.utils');

// Auditoria
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  RecoleccionPunto,
  sequelize,
} = db;

const DEFAULT_ALLOWED_RADIUS = 150;

// ===============================================
// Services: Register colleccion
// ===============================================
const registerCollectionService = async (
  payload,
  {
    id_usuario,
    origen = 'MOVIL',
  },
) => {
  const recorridoId = validateId(
    payload.id_recorrido,
    'identificador del recorrido',
  );

  const routePointId = validateId(
    payload.id_ruta_punto,
    'identificador del punto de ruta',
  );

  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const normalizedData = normalizeCollectionPayload(
    payload,
  );

  const duplicado = fila => {
    const igual =
      String(fila.id_recorrido) === String(recorridoId) &&
      String(fila.id_ruta_punto) === String(routePointId) &&
      String(fila.id_usuario) === String(userId) &&

      new Date(fila.fecha_dispositivo).getTime() ===
      normalizedData.fecha_dispositivo.getTime() &&

      [
        'latitud',
        'longitud',
        'precision_gps',
        'cantidad_recolectada',
      ].every(key =>
        (fila[key] == null ? null : Number(fila[key])) ===
        normalizedData[key],
      ) &&

      (fila.unidad_medida ?? null) ===
      normalizedData.unidad_medida &&

      (fila.observacion ?? null) ===
      normalizedData.observacion;

    if (!igual) {
      throw new AppError(
        'La clave pertenece a otra operación o contenido.',
        409,
        'COLLECTION_IDEMPOTENCY_CONFLICT',
      );
    }

    return {
      recoleccion: fila,
      duplicada: true,
    };
  };

  const existingByKey = await RecoleccionPunto
    .findOne({
      where: {
        clave_idempotencia:
          normalizedData
            .clave_idempotencia,
      },
    });

  if (existingByKey) {
    return duplicado(existingByKey);
    // return {
    //   recoleccion:
    //     existingByKey,

    //   duplicada:
    //     true,
    // };
  }

  const transaction = await sequelize.transaction();

  try {
    const {
      programacion,
      recorrido,
    } = await getOperationalContext({
      id_recorrido: recorridoId,
      id_usuario: userId,
      transaction,
      requireInProgress: false,
    });

    await validarCaptura(
      recorrido,
      normalizedData.fecha_dispositivo,
      transaction,
    );

    const punto = await getRoutePointOrFail({
      id_ruta_punto: routePointId,
      id_ruta_version: programacion.id_ruta_version,
      transaction,
    });

    const existingCollection = await RecoleccionPunto
      .findOne({
        where: {
          id_recorrido: recorridoId,
          id_ruta_punto: routePointId,
          estado_recoleccion: 'REGISTRADA',
        },

        transaction,

        lock:
          transaction
            .LOCK.UPDATE,
      });

    if (existingCollection) {
      const error = new Error();
      error.name = 'ACTIVE_COLLECTION_EXISTS';
      error.existingCollection = existingCollection;

      throw error;
    }

    const distance = calculateDistanceMeters(
      normalizedData.latitud,
      normalizedData.longitud,
      punto.latitud,
      punto.longitud,
    );

    // Auditoria
    const auditarAtencion = prepararAuditoria(
      'ATENCION',
      'REGISTRAR_ATENCION',
    );

    const collection = await RecoleccionPunto
      .create(
        {
          id_recorrido: recorridoId,
          id_ruta_punto: routePointId,
          id_usuario: userId,
          fecha_dispositivo: normalizedData.fecha_dispositivo,
          fecha_recepcion: new Date(),
          latitud: normalizedData.latitud,
          longitud: normalizedData.longitud,
          precision_gps: normalizedData.precision_gps,
          distancia_punto_metros: distance,
          dentro_radio_permitido: distance === null
            ? null
            : distance <= DEFAULT_ALLOWED_RADIUS,
          cantidad_recolectada: normalizedData.cantidad_recolectada,
          unidad_medida: normalizedData.unidad_medida,
          observacion: normalizedData.observacion,
          clave_idempotencia: normalizedData.clave_idempotencia,
          origen,
          estado_recoleccion: 'REGISTRADA',
        },
        {
          transaction,
        },
      );

    // Auditoria
    await auditarAtencion(
      collection,
      transaction,
      {
        clave_operacion: normalizedData.clave_idempotencia,
        fecha_dispositivo: normalizedData.fecha_dispositivo,
      },
    );

    await transaction.commit();

    return {
      recoleccion: collection,
      punto,
      duplicada: false,
    };
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction
        .rollback();
    }

    if (error.name === 'ACTIVE_COLLECTION_EXISTS') {

      throw new AppError(
        'El punto ya fue atend atendido durante este recorrido.',
        409,
        'COLLECTION_POINT_ALREADY_REGISTERED',
      );
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      const duplicated =
        await RecoleccionPunto
          .findOne({
            where: {
              clave_idempotencia: normalizedData.clave_idempotencia,
            },
          });

      if (duplicated) {
        return duplicado(duplicated);
        // return {
        //   recoleccion: duplicated,
        //   duplicada: true,
        // };
      }
    }

    throw error;
  }
};

module.exports = registerCollectionService;