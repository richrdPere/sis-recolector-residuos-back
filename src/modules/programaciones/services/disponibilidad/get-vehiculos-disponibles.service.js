const { Op } = require('sequelize');

const db = require('../../../../database/models');

const { validateProgrammingWindow } = require('../../utils/programacion-service.utils');

const { getBusyVehicleIds } = require('../../utils/disponibilidad.utils');

const { construirFiltroMantenimiento } = require('../../utils/mantenimiento-disponibilidad.utils');

const {
  Vehiculo,
  VehiculoMantenimiento,
} = db;

// ==========================================================
// SERVICE: VEHÍCULOS DISPONIBLES
// ==========================================================

const getVehiculosDisponiblesService = async (
  params,
) => {
  validateProgrammingWindow(params);

  // Vehículos ocupados por otras programaciones.
  const busyIds = await getBusyVehicleIds(
    params,
  );

  // Vehículos con mantenimiento incompatible.
  const mantenimientos =
    await VehiculoMantenimiento.findAll({
      where: construirFiltroMantenimiento(
        params,
      ),

      attributes: [
        'id_vehiculo',
      ],

      raw: true,
    });

  // Normalizamos como texto para comparar también
  // los BIGINT que Sequelize devuelve como strings.
  const excludedIds = [
    ...new Set([
      ...busyIds.map(
        id => String(id),
      ),

      ...mantenimientos.map(
        item => String(item.id_vehiculo),
      ),
    ]),
  ];

  const where = {
    estado: true,

    estado_operativo: {
      [Op.notIn]: [
        'EN_MANTENIMIENTO',
        'FUERA_DE_SERVICIO',
      ],
    },
  };

  if (excludedIds.length > 0) {
    where.id_vehiculo = {
      [Op.notIn]: excludedIds,
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

// const { Op } = require('sequelize');
// const db = require('../../../../database/models');

// // Utils
// const { validateProgrammingWindow } = require('../../utils/programacion-service.utils');

// const { getBusyVehicleIds } = require("../../utils/disponibilidad.utils");

// // Modelos
// const { Vehiculo } = db;


// // ===============================================
// // SERVICE: Obtener vehiculos disponibles
// // ===============================================
// const getVehiculosDisponiblesService = async (params) => {
//   validateProgrammingWindow(
//     params,
//   );

//   const busyIds =
//     await getBusyVehicleIds(
//       params,
//     );

//   const where = {
//     estado: true,

//     estado_operativo: {
//       [Op.notIn]: [
//         'EN_MANTENIMIENTO',
//         'FUERA_DE_SERVICIO',
//       ],
//     },
//   };

//   if (busyIds.length) {
//     where.id_vehiculo = {
//       [Op.notIn]:
//         busyIds,
//     };
//   }

//   return Vehiculo.findAll({
//     where,

//     order: [
//       ['placa', 'ASC'],
//     ],
//   });
// };

// module.exports = getVehiculosDisponiblesService;