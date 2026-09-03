const { Op } = require('sequelize');
const db = require('../../../../database/models');

// Utils
const { validateProgrammingWindow } = require('../../utils/programacion-service.utils');

const { getBusyVehicleIds } = require("../../utils/disponibilidad.utils");

// Modelos
const { Vehiculo } = db;


// ===============================================
// SERVICE: Obtener vehiculos disponibles
// ===============================================
const getVehiculosDisponiblesService = async (params) => {
  validateProgrammingWindow(
    params,
  );

  const busyIds =
    await getBusyVehicleIds(
      params,
    );

  const where = {
    estado: true,

    estado_operativo: {
      [Op.notIn]: [
        'EN_MANTENIMIENTO',
        'FUERA_DE_SERVICIO',
      ],
    },
  };

  if (busyIds.length) {
    where.id_vehiculo = {
      [Op.notIn]:
        busyIds,
    };
  }

  return Vehiculo.findAll({
    where,

    order: [
      ['placa', 'ASC'],
    ],
  });
};

module.exports = getVehiculosDisponiblesService;