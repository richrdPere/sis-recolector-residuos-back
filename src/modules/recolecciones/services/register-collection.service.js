'use strict';

const AppError = require('../../../utils/app-error');
const db = require('../../../database/models');

const {
  validateId,
  normalizeCollectionPayload,
} = require('../validations/recoleccion.validation');

const {
  PRECISION_MAXIMA_ATENCION_METROS,
} = require('../constants/atencion.constants');

const validarCaptura = require(
  '../../../utils/validar-captura-recorrido',
);

const {
  getOperationalContext,
  getRoutePointOrFail,
  calculateDistanceMeters,
} = require('../utils/recoleccion-service.utils');

const {
  prepararAuditoria,
} = require(
  '../../auditoria/utils/auditar-cambio.utils',
);

const {
  RecoleccionPunto,
  sequelize,
} = db;

// ==========================================================
// REGISTRAR ATENCIÓN U OMISIÓN
// ==========================================================

const registerCollectionService = async (
  payload,
  {
    id_usuario,
    origen = 'MOVIL',
  },
) => {
  const data = normalizeCollectionPayload(payload);

  const recorridoId = validateId(
    payload.id_recorrido,
    'identificador del recorrido',
  );

  const puntoId = validateId(
    payload.id_ruta_punto,
    'identificador del punto de ruta',
  );

  const usuarioId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  if (
    ![
      'MOVIL',
      'WEB',
      'SISTEMA',
      'API',
    ].includes(origen)
  ) {
    throw new AppError(
      'El origen no es válido.',
      400,
      'INVALID_COLLECTION_ORIGIN',
    );
  }

  // ========================================================
  // RECONOCER UN REINTENTO IDÉNTICO
  // ========================================================

  const duplicado = (fila) => {
    const scales = {
      latitud: 7,
      longitud: 7,
      precision_gps: 2,
      cantidad_recolectada: 3,
    };

    const mismosNumeros = Object.entries(scales)
      .every(([key, digits]) => {
        const anterior =
          fila[key] == null
            ? null
            : Number(
              Number(fila[key]).toFixed(digits),
            );

        return anterior === data[key];
      });

    const mismoContenido =
      String(fila.id_recorrido) === String(recorridoId) &&
      String(fila.id_ruta_punto) === String(puntoId) &&
      String(fila.id_usuario) === String(usuarioId) &&

      new Date(fila.fecha_dispositivo).getTime() ===
      data.fecha_dispositivo.getTime() &&

      mismosNumeros &&

      (fila.resultado_atencion ?? 'ATENDIDO') ===
      data.resultado_atencion &&

      (fila.motivo_omision ?? null) ===
      data.motivo_omision &&

      (fila.unidad_medida ?? null) ===
      data.unidad_medida &&

      (fila.observacion ?? null) ===
      data.observacion;

    if (!mismoContenido) {
      throw new AppError(
        'La clave pertenece a otra operación o contenido.',
        409,
        'COLLECTION_IDEMPOTENCY_CONFLICT',
      );
    }

    // Si el registro fue anulado, el reintento lo devuelve
    // anulado. No lo reactiva.
    return {
      recoleccion: fila,
      duplicada: true,
    };
  };

  const existing = await RecoleccionPunto.findOne({
    where: {
      clave_idempotencia: data.clave_idempotencia,
    },
  });

  if (existing) {
    return duplicado(existing);
  }

  // ========================================================
  // TRANSACCIÓN
  // ========================================================

  const transaction = await sequelize.transaction();

  try {
    // El helper bloquea la fila del recorrido.
    // Serializa registros provenientes de distintos celulares.
    const {
      programacion,
      recorrido,
    } = await getOperationalContext({
      id_recorrido: recorridoId,
      id_usuario: usuarioId,
      transaction,

      // La captura puede haberse realizado antes del cierre
      // y sincronizarse después.
      requireInProgress: false,
    });

    // Volver a consultar después de obtener el bloqueo.
    // FOR UPDATE permite leer un registro confirmado por
    // una solicitud concurrente mientras esperábamos.
    const concurrent = await RecoleccionPunto.findOne({
      where: {
        clave_idempotencia: data.clave_idempotencia,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (concurrent) {
      const result = duplicado(concurrent);

      await transaction.commit();

      return result;
    }

    // ======================================================
    // VALIDAR PERÍODO OPERATIVO
    // ======================================================

    await validarCaptura(
      recorrido,
      data.fecha_dispositivo,
      transaction,
    );

    // ======================================================
    // VALIDAR PUNTO Y VERSIÓN
    // ======================================================

    const punto = await getRoutePointOrFail({
      id_ruta_punto: puntoId,
      id_ruta_version: programacion.id_ruta_version,
      transaction,
    });

    if (punto.tipo_punto !== 'RECOLECCION') {
      throw new AppError(
        'Solo se atienden u omiten puntos de tipo RECOLECCION.',
        409,
        'POINT_NOT_COLLECTION_TYPE',
      );
    }

    // ======================================================
    // UNA DECISIÓN VIGENTE POR PUNTO Y RECORRIDO
    // ======================================================

    const active = await RecoleccionPunto.findOne({
      where: {
        id_recorrido: recorridoId,
        id_ruta_punto: puntoId,
        estado_recoleccion: 'REGISTRADA',
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (active) {
      throw new AppError(
        'El punto ya tiene una atención u omisión vigente. Debe anularse antes de corregirlo.',
        409,
        'COLLECTION_POINT_ALREADY_REGISTERED',
      );
    }

    // ======================================================
    // UBICACIÓN OBLIGATORIA PARA NUEVOS REGISTROS
    // ======================================================

    if (
      data.latitud === null ||
      data.longitud === null ||
      data.precision_gps === null
    ) {
      throw new AppError(
        'Registra ubicación y precisión GPS para atender u omitir el punto.',
        400,
        'COLLECTION_LOCATION_REQUIRED',
      );
    }

    const radio = Number(
      punto.radio_atencion_metros,
    );

    const distancia = calculateDistanceMeters(
      data.latitud,
      data.longitud,
      punto.latitud,
      punto.longitud,
    );

    if (
      !Number.isInteger(radio) ||
      radio < 1 ||
      radio > 1000 ||
      !Number.isFinite(distancia) ||
      distancia < 0
    ) {
      throw new AppError(
        'El punto no tiene una ubicación o radio válido configurado.',
        409,
        'POINT_INVALID_GEOFENCE',
      );
    }

    // ======================================================
    // VALIDACIÓN GEOGRÁFICA DE ATENCIÓN
    // ======================================================

    if (data.resultado_atencion === 'ATENDIDO') {
      const precisionMaxima = Math.min(
        PRECISION_MAXIMA_ATENCION_METROS,
        radio,
      );

      if (data.precision_gps > precisionMaxima) {
        throw new AppError(
          `La precisión GPS es de ${data.precision_gps} m; ` +
          `se requiere ${precisionMaxima} m o menos. ` +
          'Obtén otra ubicación.',
          422,
          'COLLECTION_GPS_INACCURATE',
        );
      }

      if (distancia > radio) {
        throw new AppError(
          `Estás a ${distancia.toFixed(1)} m del punto. ` +
          `El radio permitido es de ${radio} m.`,
          422,
          'COLLECTION_OUTSIDE_RADIUS',
        );
      }
    }

    // OMITIDO puede registrarse fuera del radio.
    // Se conserva su ubicación y distancia para revisión.

    // ======================================================
    // REGISTRAR Y AUDITAR
    // ======================================================

    const auditar = prepararAuditoria(
      'ATENCION',
      'REGISTRAR_ATENCION',
    );

    const recoleccion = await RecoleccionPunto.create(
      {
        ...data,

        id_recorrido: recorridoId,
        id_ruta_punto: puntoId,

        // Procede de metadata/JWT, no del body.
        id_usuario: usuarioId,

        fecha_recepcion: new Date(),

        distancia_punto_metros: Number(
          distancia.toFixed(2),
        ),

        dentro_radio_permitido:
          distancia <= radio,

        origen,
        estado_recoleccion: 'REGISTRADA',
      },
      {
        transaction,
      },
    );

    await auditar(
      recoleccion,
      transaction,
      {
        clave_operacion: data.clave_idempotencia,
        fecha_dispositivo: data.fecha_dispositivo,
      },
    );

    await transaction.commit();

    return {
      recoleccion,
      punto,
      duplicada: false,
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    // Defensa adicional ante conflicto del índice UNIQUE
    // existente de clave_idempotencia.
    if (
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      const concurrent = await RecoleccionPunto.findOne({
        where: {
          clave_idempotencia: data.clave_idempotencia,
        },
      });

      if (concurrent) {
        return duplicado(concurrent);
      }
    }

    throw error;
  }
};

module.exports = registerCollectionService;

// // services/register-collection.service.js
// const AppError = require('../../../utils/app-error');
// const db = require('../../../database/models');

// // Validations
// const {
//   validateId,
//   normalizeCollectionPayload,
// } = require('../validations/recoleccion.validation');

// const validarCaptura = require('../../../utils/validar-captura-recorrido');

// // Utils
// const {
//   getOperationalContext,
//   getRoutePointOrFail,
//   calculateDistanceMeters,
// } = require('../utils/recoleccion-service.utils');

// // Auditoria
// const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// // Modelos
// const {
//   RecoleccionPunto,
//   sequelize,
// } = db;

// const DEFAULT_ALLOWED_RADIUS = 150;

// // ===============================================
// // Services: Register colleccion
// // ===============================================
// const registerCollectionService = async (
//   payload,
//   {
//     id_usuario,
//     origen = 'MOVIL',
//   },
// ) => {
//   const recorridoId = validateId(
//     payload.id_recorrido,
//     'identificador del recorrido',
//   );

//   const routePointId = validateId(
//     payload.id_ruta_punto,
//     'identificador del punto de ruta',
//   );

//   const userId = validateId(
//     id_usuario,
//     'identificador del usuario',
//   );

//   const normalizedData = normalizeCollectionPayload(
//     payload,
//   );

//   const duplicado = fila => {
//     const igual =
//       String(fila.id_recorrido) === String(recorridoId) &&
//       String(fila.id_ruta_punto) === String(routePointId) &&
//       String(fila.id_usuario) === String(userId) &&

//       new Date(fila.fecha_dispositivo).getTime() ===
//       normalizedData.fecha_dispositivo.getTime() &&

//       [
//         'latitud',
//         'longitud',
//         'precision_gps',
//         'cantidad_recolectada',
//       ].every(key =>
//         (fila[key] == null ? null : Number(fila[key])) ===
//         normalizedData[key],
//       ) &&

//       (fila.unidad_medida ?? null) ===
//       normalizedData.unidad_medida &&

//       (fila.observacion ?? null) ===
//       normalizedData.observacion;

//     if (!igual) {
//       throw new AppError(
//         'La clave pertenece a otra operación o contenido.',
//         409,
//         'COLLECTION_IDEMPOTENCY_CONFLICT',
//       );
//     }

//     return {
//       recoleccion: fila,
//       duplicada: true,
//     };
//   };

//   const existingByKey = await RecoleccionPunto
//     .findOne({
//       where: {
//         clave_idempotencia:
//           normalizedData
//             .clave_idempotencia,
//       },
//     });

//   if (existingByKey) {
//     return duplicado(existingByKey);
//     // return {
//     //   recoleccion:
//     //     existingByKey,

//     //   duplicada:
//     //     true,
//     // };
//   }

//   const transaction = await sequelize.transaction();

//   try {
//     const {
//       programacion,
//       recorrido,
//     } = await getOperationalContext({
//       id_recorrido: recorridoId,
//       id_usuario: userId,
//       transaction,
//       requireInProgress: false,
//     });

//     await validarCaptura(
//       recorrido,
//       normalizedData.fecha_dispositivo,
//       transaction,
//     );

//     const punto = await getRoutePointOrFail({
//       id_ruta_punto: routePointId,
//       id_ruta_version: programacion.id_ruta_version,
//       transaction,
//     });

//     const existingCollection = await RecoleccionPunto
//       .findOne({
//         where: {
//           id_recorrido: recorridoId,
//           id_ruta_punto: routePointId,
//           estado_recoleccion: 'REGISTRADA',
//         },

//         transaction,

//         lock:
//           transaction
//             .LOCK.UPDATE,
//       });

//     if (existingCollection) {
//       const error = new Error();
//       error.name = 'ACTIVE_COLLECTION_EXISTS';
//       error.existingCollection = existingCollection;

//       throw error;
//     }

//     const distance = calculateDistanceMeters(
//       normalizedData.latitud,
//       normalizedData.longitud,
//       punto.latitud,
//       punto.longitud,
//     );

//     // Auditoria
//     const auditarAtencion = prepararAuditoria(
//       'ATENCION',
//       'REGISTRAR_ATENCION',
//     );

//     const collection = await RecoleccionPunto
//       .create(
//         {
//           id_recorrido: recorridoId,
//           id_ruta_punto: routePointId,
//           id_usuario: userId,
//           fecha_dispositivo: normalizedData.fecha_dispositivo,
//           fecha_recepcion: new Date(),
//           latitud: normalizedData.latitud,
//           longitud: normalizedData.longitud,
//           precision_gps: normalizedData.precision_gps,
//           distancia_punto_metros: distance,
//           dentro_radio_permitido: distance === null
//             ? null
//             : distance <= DEFAULT_ALLOWED_RADIUS,
//           cantidad_recolectada: normalizedData.cantidad_recolectada,
//           unidad_medida: normalizedData.unidad_medida,
//           observacion: normalizedData.observacion,
//           clave_idempotencia: normalizedData.clave_idempotencia,
//           origen,
//           estado_recoleccion: 'REGISTRADA',
//         },
//         {
//           transaction,
//         },
//       );

//     // Auditoria
//     await auditarAtencion(
//       collection,
//       transaction,
//       {
//         clave_operacion: normalizedData.clave_idempotencia,
//         fecha_dispositivo: normalizedData.fecha_dispositivo,
//       },
//     );

//     await transaction.commit();

//     return {
//       recoleccion: collection,
//       punto,
//       duplicada: false,
//     };
//   } catch (error) {
//     if (
//       !transaction.finished
//     ) {
//       await transaction
//         .rollback();
//     }

//     if (error.name === 'ACTIVE_COLLECTION_EXISTS') {

//       throw new AppError(
//         'El punto ya fue atend atendido durante este recorrido.',
//         409,
//         'COLLECTION_POINT_ALREADY_REGISTERED',
//       );
//     }

//     if (error.name === 'SequelizeUniqueConstraintError') {
//       const duplicated =
//         await RecoleccionPunto
//           .findOne({
//             where: {
//               clave_idempotencia: normalizedData.clave_idempotencia,
//             },
//           });

//       if (duplicated) {
//         return duplicado(duplicated);
//         // return {
//         //   recoleccion: duplicated,
//         //   duplicada: true,
//         // };
//       }
//     }

//     throw error;
//   }
// };

// module.exports = registerCollectionService;