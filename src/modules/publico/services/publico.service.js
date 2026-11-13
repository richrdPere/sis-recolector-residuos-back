const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Servicios públicos existentes
const getPublicRouteData = require('../../codigos-qr/services/get-public-route-data.service');

const getPublicScheduleService = require('../../codigos-qr/services/get-public-schedule.service');

// Utils
const { getPeruDateOnly } = require('../../codigos-qr/utils/public-consultation.utils');

// Modelos
const { Zona, Ruta } = db;

// Campos permitidos para consulta pública
const CAMPOS_ZONA = [
  'id_zona',
  'codigo',
  'nombre',
  'color',
];

const CAMPOS_RUTA = [
  'id_ruta',
  'id_zona',
  'codigo',
  'nombre',
  'color',
  'estado_ruta',
];

// ==========================================================
// VALIDACIONES Y FILTROS
// ==========================================================
const validarIdPublico = (valor, nombre) => {
  if (!/^\d+$/.test(String(valor ?? ''))) {
    throw new AppError(
      `${nombre} no válido.`,
      400,
      'INVALID_PUBLIC_ID',
    );
  }

  const id = Number(valor);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(
      `${nombre} no válido.`,
      400,
      'INVALID_PUBLIC_ID',
    );
  }

  return id;
};

const filtroRutasPublicas = () => ({
  estado: true,

  // Las rutas inactivas permiten consultar sus horarios,
  // indicando que el servicio está suspendido.
  estado_ruta: {
    [Op.in]: ['ACTIVA', 'INACTIVA'],
  },
});

// ==========================================================
// SERVICE: LISTAR ZONAS PÚBLICAS
// ==========================================================
const getZonasPublicasService = async () => {
  const zonas = await Zona.findAll({
    attributes: CAMPOS_ZONA,

    where: {
      estado: true,
    },

    order: [
      ['nombre', 'ASC'],
      ['id_zona', 'ASC'],
    ],
  });

  return {
    items: zonas.map(
      zona => zona.get({ plain: true }),
    ),

    total: zonas.length,
  };
};

// ==========================================================
// SERVICE: LISTAR RUTAS PÚBLICAS DE UNA ZONA
// ==========================================================
const getRutasPublicasPorZonaService = async (
  idZona,
) => {
  const id = validarIdPublico(
    idZona,
    'ID de zona',
  );

  const zona = await Zona.findOne({
    attributes: CAMPOS_ZONA,

    where: {
      id_zona: id,
      estado: true,
    },
  });

  if (!zona) {
    throw new AppError(
      'La zona no está disponible.',
      404,
      'PUBLIC_ZONE_NOT_FOUND',
    );
  }

  const rutas = await Ruta.findAll({
    attributes: CAMPOS_RUTA,

    where: {
      ...filtroRutasPublicas(),
      id_zona: id,
    },

    order: [
      ['nombre', 'ASC'],
      ['id_ruta', 'ASC'],
    ],
  });

  return {
    zona: zona.get({ plain: true }),

    items: rutas.map(
      ruta => ruta.get({ plain: true }),
    ),

    total: rutas.length,
  };
};

// ==========================================================
// SERVICE: INFORMACIÓN PÚBLICA DE UNA RUTA
// ==========================================================
const getInformacionRutaPublicaService = async (
  idRuta,
) => {
  const id = validarIdPublico(
    idRuta,
    'ID de ruta',
  );

  // Verifica que la ruta y su zona estén publicadas.
  const ruta = await Ruta.findOne({
    attributes: CAMPOS_RUTA,

    where: {
      ...filtroRutasPublicas(),
      id_ruta: id,
    },

    include: [
      {
        association: 'zona',
        attributes: CAMPOS_ZONA,
        required: true,

        where: {
          estado: true,
        },
      },
    ],
  });

  if (!ruta) {
    throw new AppError(
      'La ruta no está disponible.',
      404,
      'PUBLIC_ROUTE_NOT_FOUND',
    );
  }

  // Ambas consultas utilizan la misma fecha de Perú.
  const fecha = getPeruDateOnly();

  const datos = await getPublicRouteData({
    id_ruta: id,
    fecha_referencia: fecha,
  });

  if (
    !datos.recurso_disponible ||
    !datos.cronograma_disponible
  ) {
    throw new AppError(
      'La ruta no está disponible.',
      404,
      'PUBLIC_ROUTE_NOT_FOUND',
    );
  }

  const cronograma =
    await getPublicScheduleService({
      id_ruta: id,
      fecha_referencia: fecha,
    });

  const horario = cronograma.rutas?.[0];

  // Mensajes apropiados para ingresar desde el navegador.
  const mensajes = {
    SERVICIO_SUSPENDIDO:
      'El servicio de esta ruta está suspendido. Puedes consultar sus horarios publicados.',

    COMPLETADA:
      'La recolección finalizó. Puedes seguir consultando los horarios publicados.',
  };

  return {
    tipo_recurso: 'RUTA',
    origen_consulta: 'WEB',

    fecha_consulta: fecha,
    fecha_actualizacion: new Date().toISOString(),

    recurso_disponible: true,
    cronograma_disponible: true,

    ruta: datos.ruta,

    horarios: horario?.horarios ?? [],

    proxima_recoleccion:
      horario?.proxima_recoleccion ?? null,

    estado: {
      ...datos.estado,

      mensaje:
        mensajes[datos.estado.codigo] ??
        datos.estado.mensaje,
    },

    // Conserva la aproximación y caducidad del GPS
    // que aplica tu servicio público existente.
    ubicacion: datos.ubicacion,
  };
};

module.exports = {
  getZonasPublicasService,
  getRutasPublicasPorZonaService,
  getInformacionRutaPublicaService,
};