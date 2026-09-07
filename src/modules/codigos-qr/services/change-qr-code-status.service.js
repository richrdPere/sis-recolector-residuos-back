// services/change-qr-code-status.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
  validateQrState,
} = require('../validations/codigo-qr.validation');

// Utils
const {
  getQrCodeOrFail,
} = require('../utils/codigo-qr-service.utils')

// Modelos
const {
  CodigoQr,
  sequelize,
} = db;

// ===============================================
// SERVICE: Cambiar estado del codigo QR
// ===============================================
const changeQrCodeStatusService = async ({
  id_codigo_qr,
  estado_qr,
  motivo = null,
}) => {
  const id = validateId(
    id_codigo_qr,
    'identificador del código QR',
  );

  const nextState = validateQrState(
    estado_qr,
  );

  const transaction = await sequelize.transaction();

  try {
    const codigoQr = await getQrCodeOrFail(
      id,
      {
        transaction,
        lock:
          transaction
            .LOCK.UPDATE,
      },
    );

    if (codigoQr.estado_qr === 'REVOCADO' && nextState !== 'REVOCADO') {
      throw new AppError(
        'Un código QR revocado no puede volver a activarse.',
        409,
        'REVOKED_QR_CANNOT_BE_REACTIVATED',
      );
    }

    if (nextState === 'REVOCADO') {
      const reason =
        String(
          motivo || '',
        ).trim();

      if (!reason) {
        throw new AppError(
          'Debe indicar el motivo de revocación.',
          400,
          'QR_REVOCATION_REASON_REQUIRED',
        );
      }

      await codigoQr.update(
        {
          estado_qr:            'REVOCADO',
          fecha_revocacion:            new Date(),
          motivo_revocacion:            reason,
        },
        {
          transaction,
        },
      );
    } else {
      if (
        nextState ===
        'ACTIVO'
      ) {
        const resourceWhere =
          codigoQr
            .tipo_recurso ===
            'ZONA'
            ? {
              id_zona:
                codigoQr
                  .id_zona,
            }
            : {
              id_ruta:
                codigoQr
                  .id_ruta,
            };

        const existingActive =
          await CodigoQr.findOne({
            where: {
              tipo_recurso:
                codigoQr
                  .tipo_recurso,

              estado_qr:
                'ACTIVO',

              id_codigo_qr: {
                [require(
                  'sequelize',
                ).Op.ne]:
                  id,
              },

              ...resourceWhere,
            },

            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          });

        if (existingActive) {
          throw new AppError(
            'El recurso ya tiene otro código QR activo.',
            409,
            'ACTIVE_QR_ALREADY_EXISTS',
          );
        }
      }

      await codigoQr.update(
        {
          estado_qr:
            nextState,

          fecha_revocacion:
            null,

          motivo_revocacion:
            null,
        },
        {
          transaction,
        },
      );
    }

    await transaction.commit();

    return codigoQr;
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = changeQrCodeStatusService;