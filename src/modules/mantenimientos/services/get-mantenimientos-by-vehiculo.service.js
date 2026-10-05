const db = require('../../../database/models');

// Utils
const {
  error,
  validarId,
} = require("../utils/mantenimientos.utils");

// Modelos
const { Vehiculo } = db;

// Service
const getMantenimientosPaginatedService = require("./get-mantenimientos-paginated.service");

// *********************************************************
// SERVICE:  HISTORIAL DE MANTENIMIENTOS DEL VEHÍCULO
// *********************************************************

const getMantenimientosByVehiculoService = async ({
  idVehiculo,
  query = {},
}) => {
  const id = validarId(
    idVehiculo,
    'ID del vehículo',
  );

  const vehiculo = await Vehiculo.findByPk(id, {
    paranoid: false,
    attributes: ['id_vehiculo'],
  });

  if (!vehiculo) {
    error('El vehículo no existe.', 404);
  }

  return getMantenimientosPaginatedService({
    ...query,
    id_vehiculo: id,
  });
};

module.exports = getMantenimientosByVehiculoService;