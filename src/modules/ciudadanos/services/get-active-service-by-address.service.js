const { Op, Transaction } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  validateId,
} = require('../validations/ciudadano.validation');

const {
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
} = require('../utils/ciudadano-service.utils');

const {
  sequelize,
  Ruta,
  RutaVersion,
  Recorrido,
} = db;

// ==========================================================
// PROYECCIÓN DE DATOS PARA EL MAPA CIUDADANO
// ==========================================================

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const toIsoOrNull = (value) => {
  if (!value) return null;

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
};

const projectLocation = (location) => {
  if (!location) return null;

  const latitud = toNumberOrNull(location.latitud);
  const longitud = toNumberOrNull(location.longitud);

  if (
    latitud === null ||
    longitud === null ||
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    return null;
  }

  return {
    latitud,
    longitud,
    rumbo: toNumberOrNull(location.rumbo),
    fecha_dispositivo: toIsoOrNull(location.fecha_dispositivo),
    fecha_recepcion: toIsoOrNull(location.fecha_recepcion),
  };
};

// ==========================================================
// SERVICE: SERVICIO ACTIVO DEL DOMICILIO
// ==========================================================

const getActiveServiceByAddressService = async ({
  id_usuario,
  id_domicilio,
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const addressId = validateId(
    id_domicilio,
    'identificador del domicilio',
  );

  // Una misma instantánea para propiedad, ruta y servicio.
  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    },
    async (transaction) => {
      const ciudadano = await getCitizenByUserOrFail(
        userId,
        { transaction },
      );

      if (ciudadano.estado_ciudadano !== 'ACTIVO') {
        throw new AppError(
          'El perfil ciudadano no se encuentra activo.',
          409,
          'CITIZEN_PROFILE_NOT_ACTIVE',
        );
      }

      const domicilio = await getAddressOwnedOrFail({
        idDomicilio: addressId,
        idCiudadano: ciudadano.id_ciudadano,
        transaction,
      });

      if (domicilio.estado_domicilio !== 'ACTIVO') {
        throw new AppError(
          'El domicilio no se encuentra activo.',
          409,
          'CITIZEN_ADDRESS_NOT_ACTIVE',
        );
      }

      // No devolver el modelo completo del domicilio.
      const addressData = {
        id_domicilio: domicilio.id_domicilio,
        nombre: domicilio.nombre_domicilio,
        latitud: toNumberOrNull(domicilio.latitud),
        longitud: toNumberOrNull(domicilio.longitud),
      };

      if (!domicilio.id_ruta) {
        return {
          fecha_consulta: new Date().toISOString(),
          situacion: 'SIN_RUTA',
          domicilio: addressData,
          ruta: null,
          servicio: null,
        };
      }

      const ruta = await Ruta.findOne({
        where: {
          id_ruta: domicilio.id_ruta,
          estado: true,
          estado_ruta: 'ACTIVA',
        },
        attributes: [
          'id_ruta',
          'codigo',
          'nombre',
          'color',
        ],
        transaction,
      });

      if (!ruta) {
        throw new AppError(
          'La ruta asociada al domicilio no está disponible.',
          409,
          'CITIZEN_ROUTE_UNAVAILABLE',
        );
      }

      // Consultar solo los recorridos de la ruta del domicilio.
      // Dos resultados bastan para detectar ambigüedad.
      const recorridos = await Recorrido.findAll({
        where: {
          estado: true,
          estado_recorrido: {
            [Op.in]: ['EN_CURSO', 'PAUSADO'],
          },
        },
        attributes: [
          'id_recorrido',
          'id_programacion',
          'estado_recorrido',
        ],
        include: [
          {
            association: 'programacion',
            required: true,
            where: {
              id_ruta: ruta.id_ruta,
            },
            attributes: [
              'id_programacion',
              'id_ruta',
              'id_ruta_version',
              'fecha_programada',
              'hora_inicio_programada',
              'hora_fin_programada',
            ],
          },
          {
            association: 'ultima_ubicacion',
            required: false,
            attributes: [
              'latitud',
              'longitud',
              'rumbo',
              'fecha_dispositivo',
              'fecha_recepcion',
            ],
          },
        ],
        order: [
          ['id_recorrido', 'DESC'],
        ],
        limit: 2,
        transaction,
      });

      if (recorridos.length > 1) {
        throw new AppError(
          'Hay más de un servicio activo para esta ruta. '
          + 'No se puede seleccionar un único camión.',
          409,
          'MULTIPLE_ACTIVE_SERVICES',
        );
      }

      const recorrido = recorridos[0] || null;

      const programacion = recorrido
        ? recorrido.get('programacion')
        : null;

      // Con servicio activo: usar la versión de su programación.
      // Sin servicio activo: usar la versión vigente disponible.
      const version = await RutaVersion.findOne({
        where: recorrido
          ? {
            id_ruta_version: programacion.id_ruta_version,
            id_ruta: ruta.id_ruta,
          }
          : {
            id_ruta: ruta.id_ruta,
            vigente: true,
            estado: true,
          },
        attributes: [
          'id_ruta_version',
          'geometria_geojson',
        ],
        order: [
          ['id_ruta_version', 'DESC'],
        ],
        transaction,
      });

      const routeData = {
        id_ruta: ruta.id_ruta,
        codigo: ruta.codigo,
        nombre: ruta.nombre,
        color: ruta.color,
        id_ruta_version: version?.id_ruta_version ?? null,
        geometria_geojson: version?.geometria_geojson ?? null,
        origen_geometria: version
          ? recorrido
            ? 'PROGRAMACION'
            : 'VERSION_VIGENTE'
          : null,
      };

      if (!recorrido) {
        return {
          fecha_consulta: new Date().toISOString(),
          situacion: 'SIN_SERVICIO_ACTIVO',
          domicilio: addressData,
          ruta: routeData,
          servicio: null,
        };
      }

      return {
        fecha_consulta: new Date().toISOString(),
        situacion: recorrido.estado_recorrido,
        domicilio: addressData,
        ruta: routeData,
        servicio: {
          id_recorrido: recorrido.id_recorrido,
          estado: recorrido.estado_recorrido,
          fecha_programada: programacion.fecha_programada,
          hora_inicio_programada:
            programacion.hora_inicio_programada,
          hora_fin_programada:
            programacion.hora_fin_programada,
          ultima_ubicacion: projectLocation(
            recorrido.get('ultima_ubicacion'),
          ),
        },
      };
    },
  );
};

module.exports = getActiveServiceByAddressService;