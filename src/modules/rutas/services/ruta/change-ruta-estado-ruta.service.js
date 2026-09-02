const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const getRutaByIdService = require("./get-ruta-by-id.service");

// Modelos
const {
  Zona,
  Ruta,
  RutaVersion,
  RutaPunto,
  RutaHorario,
} = db;

// Utils
const {
  validateId,
  validateEnum,
} = require('../../utils/rutas-service.utils');

// Constans
const ESTADOS_RUTA = [
  'BORRADOR',
  'ACTIVA',
  'INACTIVA',
];

// ===============================================
// SERVICE: Cambiar ruta estado a otra ruta
// ===============================================
const changeRutaEstadoRutaService = async ({
  id_ruta,
  estado_ruta,
}) => {
  const id = validateId(
    id_ruta,
    'identificador de la ruta',
  );

  validateEnum({
    value: estado_ruta,
    values: ESTADOS_RUTA,
    message:
      'El estado de la ruta no es válido.',
    code:
      'INVALID_ROUTE_STATUS',
  });

  const ruta =
    await Ruta.findByPk(id, {
      include: [
        {
          model: Zona,
          as: 'zona',
        },
      ],
    });

  if (!ruta) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  if (
    ruta.estado_ruta ===
    estado_ruta
  ) {
    throw new AppError(
      'La ruta ya tiene el estado solicitado.',
      409,
      'ROUTE_STATUS_NOT_CHANGED',
    );
  }

  if (
    estado_ruta ===
    'ACTIVA'
  ) {
    if (
      !ruta.estado ||
      !ruta.zona?.estado
    ) {
      throw new AppError(
        'La ruta y su zona deben estar activas.',
        409,
        'ROUTE_OR_ZONE_INACTIVE',
      );
    }

    const version =
      await RutaVersion.findOne({
        where: {
          id_ruta: id,
          vigente: true,
          estado: true,
        },

        include: [
          {
            model:
              RutaPunto,

            as: 'puntos',

            where: {
              estado: true,
            },

            required: false,
          },
        ],
      });

    if (!version) {
      throw new AppError(
        'La ruta debe tener una versión vigente.',
        409,
        'ROUTE_WITHOUT_CURRENT_VERSION',
      );
    }

    const puntos =
      version.puntos || [];

    const hasStart =
      puntos.some(
        (item) =>
          item.tipo_punto ===
          'INICIO',
      );

    const hasEnd =
      puntos.some(
        (item) =>
          item.tipo_punto ===
          'FINAL',
      );

    if (
      puntos.length < 2 ||
      !hasStart ||
      !hasEnd
    ) {
      throw new AppError(
        'La versión vigente debe tener como mínimo un punto inicial y uno final.',
        409,
        'ROUTE_POINTS_INCOMPLETE',
      );
    }

    const schedules =
      await RutaHorario.count({
        where: {
          id_ruta: id,
          estado: true,
        },
      });

    if (!schedules) {
      throw new AppError(
        'La ruta debe tener al menos un horario activo.',
        409,
        'ROUTE_WITHOUT_ACTIVE_SCHEDULE',
      );
    }
  }

  await ruta.update({
    estado_ruta,
  });

  return getRutaByIdService(
    id,
  );
};

module.exports = changeRutaEstadoRutaService;