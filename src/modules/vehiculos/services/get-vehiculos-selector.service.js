const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

// *********************************************************
// OBTENER SELECTOR DE VEHÍCULOS
// *********************************************************
const getVehiculosSelectorService = async ({ search } = {}) => {
  const where = {
    // estado: true,
    estado_operativo: 'DISPONIBLE'
  };

  if (search !== undefined && search !== null) {
    if (typeof search !== 'string') {
      throw new AppError(
        'El filtro de búsqueda debe ser texto.',
        400,
      );
    }

    const texto = search.trim();

    if (texto.length > 150) {
      throw new AppError(
        'La búsqueda no puede superar 150 caracteres.',
        400,
      );
    }

    if (texto) {
      where[Op.or] = [
        {
          codigo: {
            [Op.like]: `%${texto}%`,
          },
        },
        {
          placa: {
            [Op.like]: `%${texto}%`,
          },
        },
        {
          marca: {
            [Op.like]: `%${texto}%`,
          },
        },
        {
          modelo: {
            [Op.like]: `%${texto}%`,
          },
        },
      ];
    }
  }

  const vehiculos = await Vehiculo.findAll({
    where,

    attributes: [
      'id_vehiculo',
      'codigo',
      'placa',
      'marca',
      'modelo',
      'estado_operativo',
    ],

    order: [
      ['codigo', 'ASC'],
      ['id_vehiculo', 'ASC'],
    ],
  });

  return vehiculos.map((vehiculo) => {
    const data = vehiculo.toJSON();

    return {
      ...data,

      label:
        `${data.codigo} — ${data.placa} — ` +
        `${data.marca} ${data.modelo}`,
    };
  });
};

module.exports = getVehiculosSelectorService;