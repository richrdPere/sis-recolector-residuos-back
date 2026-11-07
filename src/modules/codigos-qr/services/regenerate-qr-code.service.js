// services/regenerate-qr-code.service.js

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

// Modelos
const {
  CodigoQr,
  sequelize,
} = db;

// ===============================================
// SERVICE: Regenerar imagen del codigo QR
// ===============================================
module.exports = async function regenerateQrCodeService({
  id_codigo_qr,
  id_usuario_creacion,
  motivo,
  confirmar_reemplazo = false,
}) {
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

  // Validar la URL antes de modificar la base de datos.
  const urlPublica = buildPublicQrUrl(token);

  return db.sequelize.transaction(
    async (transaction) => {
      const anterior = await getQrCodeOrFail(
        id,

        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        },
      );

      if (
        anterior.estado_qr === 'REVOCADO'
      ) {
        throw new AppError(
          'El código QR ya fue revocado o reemplazado.',
          409,
          'QR_ALREADY_REVOKED',
        );
      }

      const reemplazo =
        await db.CodigoQr.findOne({
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

      const otroActivo =
        await db.CodigoQr.findOne({
          where: {
            tipo_recurso:
              anterior.tipo_recurso,

            estado_qr: 'ACTIVO',

            id_codigo_qr: {
              [Op.ne]: id,
            },

            ...(
              anterior.tipo_recurso === 'ZONA'
                ? {
                  id_zona:
                    anterior.id_zona,
                }
                : {
                  id_ruta:
                    anterior.id_ruta,
                }
            ),
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

      const nuevo = await db.CodigoQr.create(
        {
          codigo:
            generateAdministrativeCode(
              anterior.tipo_recurso,
            ),

          token_publico: token,

          tipo_recurso:
            anterior.tipo_recurso,

          id_zona: anterior.id_zona,
          id_ruta: anterior.id_ruta,

          titulo: anterior.titulo,
          descripcion: anterior.descripcion,

          version:
            Number(anterior.version) + 1,

          id_codigo_reemplazado:
            anterior.id_codigo_qr,

          estado_qr: 'ACTIVO',

          fecha_generacion: new Date(),

          // El reemplazo permanente no hereda
          // la expiración del código anterior.
          fecha_expiracion: null,

          id_usuario_creacion:
            creatorId,

          observacion:
            `Código reemplazado. ${reason}`,
        },

        {
          transaction,
        },
      );

      await anterior.update(
        {
          estado_qr: 'REVOCADO',

          fecha_revocacion:
            new Date(),

          motivo_revocacion:
            reason,
        },

        {
          transaction,
        },
      );

      return {
        codigo_anterior: {
          id_codigo_qr:
            anterior.id_codigo_qr,

          codigo: anterior.codigo,

          estado_qr:
            anterior.estado_qr,
        },

        codigo_nuevo: nuevo,
        url_publica: urlPublica,
      };
    },
  );
};
// const regenerateQrCodeService = async ({
//   id_codigo_qr,
//   id_usuario_creacion,
//   motivo,
// }) => {
//   const id =
//     validateId(
//       id_codigo_qr,
//       'identificador del código QR',
//     );

//   const creatorId =
//     validateId(
//       id_usuario_creacion,
//       'identificador del usuario creador',
//     );

//   const reason =
//     validateRequiredText(
//       motivo,
//       'motivo de regeneración',
//       500,
//     );

//   const transaction =
//     await sequelize.transaction();

//   try {
//     const previousQr =
//       await getQrCodeOrFail(
//         id,
//         {
//           transaction,

//           lock:
//             transaction
//               .LOCK.UPDATE,
//         },
//       );

//     if (
//       previousQr
//         .estado_qr ===
//       'REVOCADO'
//     ) {
//       throw new AppError(
//         'El código QR ya fue revocado.',
//         409,
//         'QR_ALREADY_REVOKED',
//       );
//     }

//     const existingReplacement =
//       await CodigoQr.findOne({
//         where: {
//           id_codigo_reemplazado:
//             previousQr
//               .id_codigo_qr,
//         },

//         transaction,

//         lock:
//           transaction
//             .LOCK.UPDATE,
//       });

//     if (
//       existingReplacement
//     ) {
//       throw new AppError(
//         'El código QR ya tiene un reemplazo.',
//         409,
//         'QR_ALREADY_REPLACED',
//       );
//     }

//     const newToken =
//       generatePublicToken();

//     const newQr =
//       await CodigoQr.create(
//         {
//           codigo:
//             generateAdministrativeCode(
//               previousQr
//                 .tipo_recurso,
//             ),

//           token_publico:
//             newToken,

//           tipo_recurso:
//             previousQr
//               .tipo_recurso,

//           id_zona:
//             previousQr
//               .id_zona,

//           id_ruta:
//             previousQr
//               .id_ruta,

//           titulo:
//             previousQr
//               .titulo,

//           descripcion:
//             previousQr
//               .descripcion,

//           version:
//             Number(
//               previousQr
//                 .version,
//             ) + 1,

//           id_codigo_reemplazado:
//             previousQr
//               .id_codigo_qr,

//           estado_qr:
//             'ACTIVO',

//           fecha_generacion:
//             new Date(),

//           fecha_expiracion:
//             previousQr
//               .fecha_expiracion,

//           id_usuario_creacion:
//             creatorId,

//           observacion:
//             `Código regenerado. ${reason}`,
//         },
//         {
//           transaction,
//         },
//       );

//     await previousQr.update(
//       {
//         estado_qr:
//           'REVOCADO',

//         fecha_revocacion:
//           new Date(),

//         motivo_revocacion:
//           reason,
//       },
//       {
//         transaction,
//       },
//     );

//     await transaction.commit();

//     return {
//       codigo_anterior: {
//         id_codigo_qr:
//           previousQr
//             .id_codigo_qr,

//         codigo:
//           previousQr
//             .codigo,

//         estado_qr:
//           previousQr
//             .estado_qr,
//       },

//       codigo_nuevo:
//         newQr,

//       url_publica:
//         buildPublicQrUrl(
//           newToken,
//         ),
//     };
//   } catch (error) {
//     if (
//       !transaction.finished
//     ) {
//       await transaction.rollback();
//     }

//     throw error;
//   }
// };

// module.exports = regenerateQrCodeService;