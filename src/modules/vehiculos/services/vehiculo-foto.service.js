const db = require('../../../database/models');

const AppError = require('../../../utils/app-error');

// Modelos
const { sequelize, Vehiculo } = db;

// Utils
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');
const { procesarFoto, borrarGestionada } = require('../../../utils/vehiculo-foto-storage');

const validarId = value => {
  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      'El vehículo no es válido.',
      400,
      'INVALID_VEHICLE_ID',
    );
  }

  return id;
};

// ============================================
// SERVICE: CAMBIAR FOTO
// ============================================
const cambiarFoto = async (
  idVehiculo,
  file,
  eliminar = false,
) => {
  const id = validarId(idVehiculo);

  const nueva = eliminar
    ? null
    : await procesarFoto(file);

  let anterior = null;
  let resultado;

  try {
    resultado = await sequelize.transaction(
      async transaction => {
        const vehiculo =
          await Vehiculo.findByPk(
            id,
            {
              transaction,

              lock:
                transaction.LOCK.UPDATE,
            },
          );

        if (!vehiculo) {
          throw new AppError(
            'Vehículo no encontrado.',
            404,
            'VEHICLE_NOT_FOUND',
          );
        }

        anterior = vehiculo.foto_url;

        const auditar =
          prepararAuditoria(
            'VEHICULO',
            'ACTUALIZAR',
            vehiculo,
          );

        await vehiculo.update(
          {
            foto_url: nueva,
          },
          {
            transaction,
          },
        );

        await auditar(
          vehiculo,
          transaction,
          {
            motivo: eliminar
              ? 'Eliminar fotografía del vehículo.'
              : 'Actualizar fotografía del vehículo.',
          },
        );

        return vehiculo;
      },
    );
  } catch (error) {
    if (nueva) {
      /*
       * Si hubo un fallo al confirmar la transacción,
       * primero comprobamos si la foto quedó referenciada.
       */
      try {
        const actual = await Vehiculo.findByPk(
          id,
          {
            attributes: [
              'foto_url',
            ],

            paranoid: false,
          },
        );

        if (actual?.foto_url !== nueva) {
          await borrarGestionada(nueva);
        }
      } catch {
        // Ante incertidumbre, conservar el archivo para revisión.
        console.error(
          '[vehiculo-foto] Limpieza pendiente de revisión.',
        );
      }
    }

    throw error;
  }

  // La foto anterior se retira después de confirmar MySQL.
  if (anterior !== nueva) {
    await borrarGestionada(anterior);
  }

  return resultado;
};

module.exports = {
  validarId,
  cambiarFoto,
};