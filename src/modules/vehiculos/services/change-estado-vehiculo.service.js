const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Vehiculo,
  sequelize,
} = db;

// *********************************************************
// SERVICE: CAMBIAR ESTADO DEL VEHÍCULO
// *********************************************************

const changeEstadoVehiculoService = async ({
  id_vehiculo,
  estado,
}) => {
  const id = Number(id_vehiculo);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(
      'El identificador del vehículo no es válido.',
      400,
      'INVALID_VEHICLE_ID',
    );
  }

  if (typeof estado !== 'boolean') {
    throw new AppError(
      'El campo estado debe ser verdadero o falso.',
      400,
      'INVALID_VEHICLE_STATUS',
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

    if (vehiculo.estado === estado) {
      throw new AppError(
        estado
          ? 'El vehículo ya se encuentra activo.'
          : 'El vehículo ya se encuentra inactivo.',
        409,
        'VEHICLE_STATUS_NOT_CHANGED',
      );
    }

    // 2. Capturar el estado anterior.
    const auditarVehiculo = prepararAuditoria(
      'VEHICULO',
      estado ? 'ACTIVAR' : 'DESACTIVAR',
      vehiculo,
    );

    // 3. Actualizar el estado administrativo.
    await vehiculo.update(
      { estado },
      { transaction },
    );

    // 4. Registrar el cambio en la misma transacción.
    await auditarVehiculo(
      vehiculo,
      transaction,
    );

    return vehiculo;
  });
};

module.exports = changeEstadoVehiculoService;