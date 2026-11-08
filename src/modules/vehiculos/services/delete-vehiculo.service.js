const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Auditoría
const {
  prepararAuditoria,
} = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Vehiculo,
  sequelize,
} = db;

// *********************************************************
// SERVICE: ELIMINAR VEHÍCULO
// *********************************************************

const deleteVehiculoService = async (idVehiculo) => {
  const id = Number(idVehiculo);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(
      'El identificador del vehículo no es válido.',
      400,
      'INVALID_VEHICLE_ID',
    );
  }

  return sequelize.transaction(async transaction => {

    // 1. Obtener y bloquear el vehículo.
    const vehiculo = await Vehiculo.findByPk(
      id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!vehiculo) {
      throw new AppError(
        'El vehículo no fue encontrado.',
        404,
        'VEHICLE_NOT_FOUND',
      );
    }

    if (
      ['ASIGNADO', 'EN_RUTA'].includes(
        vehiculo.estado_operativo,
      )
    ) {
      throw new AppError(
        'No se puede eliminar un vehículo asignado o en ruta.',
        409,
        'VEHICLE_IN_OPERATION',
      );
    }

    // 2. Capturar los valores anteriores a la eliminación.
    const auditarVehiculo = prepararAuditoria(
      'VEHICULO',
      'ELIMINAR',
      vehiculo,
    );

    // 3. Eliminar según la configuración del modelo.
    // Si tiene paranoid: true, la eliminación es lógica.
    await vehiculo.destroy({
      transaction,
    });

    // 4. Registrar la eliminación.
    // El helper conserva el identificador capturado
    // y registra que la entidad dejó de estar disponible.
    await auditarVehiculo(
      null,
      transaction,
    );

    return {
      id_vehiculo: id,
      deleted: true,
    };
  });
};

module.exports = deleteVehiculoService;