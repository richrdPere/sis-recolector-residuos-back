// services/update-citizen-profile.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validation
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

const MOTIVO_REVOCACION = 'Revocación del consentimiento para el tratamiento de datos.';

// Modelos
const {
  sequelize,
} = db;

// ===============================================
// SERVICE: Actualizar perfil del ciudadano
// ===============================================
const updateCitizenProfileService = async ({
  id_usuario,
  acepta_tratamiento_datos,
  version_consentimiento,
  observacion,
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  if (
    acepta_tratamiento_datos !== undefined &&
    typeof acepta_tratamiento_datos !== 'boolean'
  ) {
    throw new AppError(
      'acepta_tratamiento_datos debe ser booleano.',
      400,
      'INVALID_BOOLEAN',
    );
  }

  if (
    observacion !== undefined &&
    observacion !== null &&
    typeof observacion !== 'string'
  ) {
    throw new AppError(
      'La observación debe ser texto.',
      400,
      'INVALID_OBSERVATION',
    );
  }

  return db.sequelize.transaction(
    async (transaction) => {
      const ciudadano =
        await getCitizenByUserOrFail(
          userId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      const updateData = {};

      if (observacion !== undefined) {
        updateData.observacion =
          observacion?.trim() || null;
      }

      if (
        acepta_tratamiento_datos !== undefined
      ) {
        updateData.acepta_tratamiento_datos =
          acepta_tratamiento_datos;

        if (acepta_tratamiento_datos) {
          const version =
            version_consentimiento ??
            ciudadano.version_consentimiento;

          if (
            typeof version !== 'string' ||
            !version.trim() ||
            version.trim().length > 30
          ) {
            throw new AppError(
              'Debe indicar una versión de consentimiento válida, de hasta 30 caracteres.',
              400,
              'CONSENT_VERSION_REQUIRED',
            );
          }

          const normalizedVersion = version.trim();

          updateData.version_consentimiento =
            normalizedVersion;

          // No cambiar la fecha si solo se guarda
          // nuevamente la misma aceptación.
          if (
            !ciudadano.acepta_tratamiento_datos ||
            ciudadano.version_consentimiento !==
            normalizedVersion ||
            !ciudadano.fecha_consentimiento
          ) {
            updateData.fecha_consentimiento =
              new Date();
          }

          // Recuperar solo una inactivación causada
          // por la revocación del propio consentimiento.
          if (
            ciudadano.estado_ciudadano === 'INACTIVO' &&
            ciudadano.motivo_desactivacion ===
            MOTIVO_REVOCACION
          ) {
            updateData.estado_ciudadano = 'ACTIVO';
            updateData.fecha_activacion = new Date();
            updateData.fecha_desactivacion = null;
            updateData.motivo_desactivacion = null;
          }
        } else {
          // Conservar fecha y versión de última aceptación.
          // El booleano indica que ya no está vigente.
          if (
            ciudadano.estado_ciudadano !== 'SUSPENDIDO'
          ) {
            updateData.estado_ciudadano = 'INACTIVO';

            if (
              ciudadano.acepta_tratamiento_datos ||
              !ciudadano.fecha_desactivacion
            ) {
              updateData.fecha_desactivacion =
                new Date();
            }

            if (
              ciudadano.estado_ciudadano === 'ACTIVO' ||
              !ciudadano.motivo_desactivacion
            ) {
              updateData.motivo_desactivacion =
                MOTIVO_REVOCACION;
            }
          }

          await db.CiudadanoPreferenciaNotificacion.update(
            {
              notificaciones_habilitadas: false,
              estado_preferencia: 'INACTIVA',
            },
            {
              where: {
                id_ciudadano:
                  ciudadano.id_ciudadano,
              },
              transaction,
            },
          );
        }
      }

      await ciudadano.update(
        updateData,
        {
          transaction,
        },
      );

      return ciudadano;
    },
  );
};

module.exports = updateCitizenProfileService;