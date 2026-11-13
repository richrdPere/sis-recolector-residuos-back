const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
  validateRequiredText,
} = require('../validations/codigo-qr.validation');

// Utils
const {
  generatePublicToken,
  generateAdministrativeCode,
  buildPublicQrUrl,
  getQrCodeOrFail,
} = require('../utils/codigo-qr-service.utils');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const { CodigoQr, sequelize } = db;

// ==========================================================
// SERVICE: REEMPLAZAR CÓDIGO QR Y REVOCAR EL ANTERIOR
// ==========================================================
const regenerateQrCodeService = async ({
  id_codigo_qr,
  id_usuario_creacion,
  motivo,
  confirmar_reemplazo = false,
}) => {
  if (confirmar_reemplazo !== true) {
    throw new AppError(
      'Debe confirmar que el enlace anterior dejará de funcionar.',
      400,
      'QR_REPLACEMENT_CONFIRMATION_REQUIRED',
    );
  }

  const id = validateId(
    id_codigo_qr,
    'identificador del código QR',
  );

  const creatorId = validateId(
    id_usuario_creacion,
    'identificador del usuario creador',
  );

  const reason = validateRequiredText(
    motivo,
    'motivo de reemplazo',
    500,
  );

  const token = generatePublicToken();

  // Validar la configuración antes de modificar la base de datos.
  const urlPublica = buildPublicQrUrl(token);

  return sequelize.transaction(async transaction => {
    const anterior = await getQrCodeOrFail(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (anterior.estado_qr === 'REVOCADO') {
      throw new AppError(
        'El código QR ya fue revocado o reemplazado.',
        409,
        'QR_ALREADY_REVOKED',
      );
    }

    const reemplazo = await CodigoQr.findOne({
      where: {
        id_codigo_reemplazado: id,
      },

      transaction,
    });

    if (reemplazo) {
      throw new AppError(
        'El código QR ya tiene un reemplazo.',
        409,
        'QR_ALREADY_REPLACED',
      );
    }

    const filtroRecurso =
      anterior.tipo_recurso === 'ZONA'
        ? { id_zona: anterior.id_zona }
        : { id_ruta: anterior.id_ruta };

    const otroActivo = await CodigoQr.findOne({
      where: {
        ...filtroRecurso,

        tipo_recurso: anterior.tipo_recurso,
        estado_qr: 'ACTIVO',

        id_codigo_qr: {
          [Op.ne]: id,
        },
      },

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (otroActivo) {
      throw new AppError(
        'El recurso ya tiene otro QR activo. Utilice ese código.',
        409,
        'ACTIVE_QR_ALREADY_EXISTS',
      );
    }

    // ======================================================
    // CAPTURAR EL ESTADO ANTERIOR
    // ======================================================

    // El QR anterior existe y todavía no ha sido modificado.
    const auditarAnterior = prepararAuditoria(
      'QR',
      'REVOCAR_POR_REEMPLAZO',
      anterior,
    );

    // El reemplazo aún no existe.
    const auditarNuevo = prepararAuditoria(
      'QR',
      'CREAR_REEMPLAZO',
      null,
    );

    const ahora = new Date();

    // ======================================================
    // CREAR EL REEMPLAZO
    // ======================================================
    const nuevo = await CodigoQr.create(
      {
        codigo: generateAdministrativeCode(
          anterior.tipo_recurso,
        ),

        token_publico: token,

        tipo_recurso: anterior.tipo_recurso,

        id_zona: anterior.id_zona,
        id_ruta: anterior.id_ruta,

        titulo: anterior.titulo,
        descripcion: anterior.descripcion,

        version: Number(anterior.version) + 1,

        id_codigo_reemplazado: anterior.id_codigo_qr,

        estado_qr: 'ACTIVO',
        fecha_generacion: ahora,

        // El reemplazo no hereda la expiración anterior.
        fecha_expiracion: null,

        id_usuario_creacion: creatorId,

        observacion: `Código reemplazado. ${reason}`,
      },
      { transaction },
    );

    // ======================================================
    // REVOCAR EL ANTERIOR
    // ======================================================
    await anterior.update(
      {
        estado_qr: 'REVOCADO',
        fecha_revocacion: ahora,
        motivo_revocacion: reason,
      },
      { transaction },
    );

    // ======================================================
    // REGISTRAR AMBAS AUDITORÍAS
    // ======================================================
    await auditarAnterior(
      anterior,
      transaction,
      { motivo: reason },
    );

    await auditarNuevo(
      nuevo,
      transaction,
      { motivo: reason },
    );

    return {
      codigo_anterior: {
        id_codigo_qr: anterior.id_codigo_qr,
        codigo: anterior.codigo,
        estado_qr: anterior.estado_qr,
      },

      codigo_nuevo: nuevo,
      url_publica: urlPublica,
    };
  });
};

module.exports = regenerateQrCodeService;

// // services/regenerate-qr-code.service.js

// const db = require('../../../database/models');
// const AppError = require('../../../utils/app-error');

// // Validations
// const {
//   validateId,
//   validateRequiredText,
// } = require('../validations/codigo-qr.validation');

// // Utils
// const {
//   generatePublicToken,
//   generateAdministrativeCode,
//   buildPublicQrUrl,
//   getQrCodeOrFail,
// } = require('../utils/codigo-qr-service.utils');

// // Modelos
// const {
//   CodigoQr,
//   sequelize,
// } = db;

// // ===============================================
// // SERVICE: Regenerar imagen del codigo QR
// // ===============================================
// module.exports = async function regenerateQrCodeService({
//   id_codigo_qr,
//   id_usuario_creacion,
//   motivo,
//   confirmar_reemplazo = false,
// }) {
//   if (confirmar_reemplazo !== true) {
//     throw new AppError(
//       'Debe confirmar que el enlace anterior dejará de funcionar.',
//       400,
//       'QR_REPLACEMENT_CONFIRMATION_REQUIRED',
//     );
//   }

//   const id = validateId(
//     id_codigo_qr,
//     'identificador del código QR',
//   );

//   const creatorId = validateId(
//     id_usuario_creacion,
//     'identificador del usuario creador',
//   );

//   const reason = validateRequiredText(
//     motivo,
//     'motivo de reemplazo',
//     500,
//   );

//   const token = generatePublicToken();

//   // Validar la URL antes de modificar la base de datos.
//   const urlPublica = buildPublicQrUrl(token);

//   return db.sequelize.transaction(
//     async (transaction) => {
//       const anterior = await getQrCodeOrFail(
//         id,

//         {
//           transaction,
//           lock: transaction.LOCK.UPDATE,
//         },
//       );

//       if (
//         anterior.estado_qr === 'REVOCADO'
//       ) {
//         throw new AppError(
//           'El código QR ya fue revocado o reemplazado.',
//           409,
//           'QR_ALREADY_REVOKED',
//         );
//       }

//       // Auditoria
//       const auditarAnterior = prepararAuditoria(
//         'QR',
//         'REVOCAR_POR_REEMPLAZO',
//         anterior,
//       );

//       const auditarNuevo = prepararAuditoria(
//         'QR',
//         'CREAR_REEMPLAZO',
//       );

//       const reemplazo = await db.CodigoQr.findOne({
//         where: {
//           id_codigo_reemplazado: id,
//         },

//         transaction,
//       });

//       if (reemplazo) {
//         throw new AppError(
//           'El código QR ya tiene un reemplazo.',
//           409,
//           'QR_ALREADY_REPLACED',
//         );
//       }

//       const otroActivo = await db.CodigoQr.findOne({
//         where: {
//           tipo_recurso: anterior.tipo_recurso,

//           estado_qr: 'ACTIVO',

//           id_codigo_qr: {
//             [Op.ne]: id,
//           },

//           ...(
//             anterior.tipo_recurso === 'ZONA'
//               ? {
//                 id_zona: anterior.id_zona,
//               }
//               : {
//                 id_ruta: anterior.id_ruta,
//               }
//           ),
//         },

//         transaction,
//         lock: transaction.LOCK.UPDATE,
//       });

//       if (otroActivo) {
//         throw new AppError(
//           'El recurso ya tiene otro QR activo. Utilice ese código.',
//           409,
//           'ACTIVE_QR_ALREADY_EXISTS',
//         );
//       }

//       const nuevo = await db.CodigoQr.create(
//         {
//           codigo: generateAdministrativeCode(
//             anterior.tipo_recurso,
//           ),

//           token_publico: token,

//           tipo_recurso:
//             anterior.tipo_recurso,

//           id_zona: anterior.id_zona,
//           id_ruta: anterior.id_ruta,

//           titulo: anterior.titulo,
//           descripcion: anterior.descripcion,

//           version:
//             Number(anterior.version) + 1,

//           id_codigo_reemplazado:
//             anterior.id_codigo_qr,

//           estado_qr: 'ACTIVO',

//           fecha_generacion: new Date(),

//           // El reemplazo permanente no hereda
//           // la expiración del código anterior.
//           fecha_expiracion: null,

//           id_usuario_creacion:
//             creatorId,

//           observacion:
//             `Código reemplazado. ${reason}`,
//         },

//         {
//           transaction,
//         },
//       );

//       await anterior.update(
//         {
//           estado_qr: 'REVOCADO',

//           fecha_revocacion:
//             new Date(),

//           motivo_revocacion:
//             reason,
//         },

//         {
//           transaction,
//         },
//       );

//       // Auditoria
//       await auditarAnterior(
//         anterior,
//         transaction,
//         {
//           motivo: reason,
//         },
//       );

//       await auditarNuevo(
//         nuevo,
//         transaction,
//         {
//           motivo: reason,
//         },
//       );

//       return {
//         codigo_anterior: {
//           id_codigo_qr:
//             anterior.id_codigo_qr,

//           codigo: anterior.codigo,

//           estado_qr:
//             anterior.estado_qr,
//         },

//         codigo_nuevo: nuevo,
//         url_publica: urlPublica,
//       };
//     },
//   );
// };
