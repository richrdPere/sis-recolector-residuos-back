const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { validarSinOperacionActiva } = require('../../mantenimientos/validations/mantenimientos.validation');

const ESTADOS_MANUALES = [
  'DISPONIBLE',
  'FUERA_DE_SERVICIO',
];

// El service debe bloquear previamente el vehículo
// dentro de la misma transacción.
const validarCambioOperativo = async (
  vehiculo,
  destino,
  transaction,
) => {
  // Permite editar otros datos manteniendo el estado actual.
  if (destino === vehiculo.estado_operativo) {
    return;
  }

  if (!ESTADOS_MANUALES.includes(destino)) {
    throw new AppError(
      'Solo puede cambiar manualmente a DISPONIBLE o ' +
      'FUERA_DE_SERVICIO. Los demás estados se gestionan ' +
      'desde recorridos y mantenimientos.',
      400,
      'VEHICLE_STATUS_MANAGED_BY_OPERATION',
    );
  }

  if (!vehiculo.estado) {
    throw new AppError(
      'El vehículo está desactivado.',
      409,
      'VEHICLE_INACTIVE',
    );
  }

  // Reutiliza tus validaciones existentes:
  // programación en ejecución y recorrido activo o pausado.
  await validarSinOperacionActiva(
    vehiculo.id_vehiculo,
    transaction,
  );

  const mantenimiento =
    await db.VehiculoMantenimiento.findOne({
      where: {
        id_vehiculo: vehiculo.id_vehiculo,
        estado_mantenimiento: 'EN_PROCESO',
      },
      attributes: ['id_mantenimiento'],
      transaction,
    });

  if (
    mantenimiento ||
    vehiculo.estado_operativo === 'EN_MANTENIMIENTO'
  ) {
    throw new AppError(
      'Finaliza el mantenimiento antes de cambiar ' +
      'el estado operativo.',
      409,
      'VEHICLE_MAINTENANCE_IN_PROGRESS',
    );
  }

  if (vehiculo.estado_operativo === 'EN_RUTA') {
    throw new AppError(
      'El vehículo figura EN_RUTA. Revisa y cierra ' +
      'su operación antes de cambiarlo.',
      409,
      'VEHICLE_ROUTE_STATE_CONFLICT',
    );
  }
};

module.exports = {
  ESTADOS_MANUALES,
  validarCambioOperativo,
};