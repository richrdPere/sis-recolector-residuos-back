const { Op } = require('sequelize');
const db = require('../../../database/models');

const AppError = require('../../../utils/app-error');

// Models
const {
  PersonalOperativo,
  ProgramacionPersonal,
  Recorrido,
  ProgramacionRuta,
  Ruta,
  RutaVersion,
  Vehiculo,
} = db;

// ===============================================
// UTILIDAD: Convertir entero positivo
// ===============================================

const parsePositiveInteger = (
  value,
  defaultValue,
  maxValue = null,
) => {
  const parsedValue =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue <= 0
  ) {
    return defaultValue;
  }

  if (
    maxValue !== null &&
    parsedValue > maxValue
  ) {
    return maxValue;
  }

  return parsedValue;
};

// ===============================================
// UTILIDAD: Validar fecha
// ===============================================

const parseDateFilter = (
  value,
  fieldName,
  endOfDay = false,
) => {
  if (!value) {
    return null;
  }

  const normalizedValue =
    String(value).trim();

  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(
      normalizedValue,
    )
  ) {
    throw new AppError(
      `El campo ${fieldName} debe tener el formato YYYY-MM-DD.`,
      400,
      'INVALID_DATE_FILTER',
    );
  }

  const date = new Date(
    endOfDay
      ? `${normalizedValue}T23:59:59.999Z`
      : `${normalizedValue}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new AppError(
      `El campo ${fieldName} no contiene una fecha válida.`,
      400,
      'INVALID_DATE_FILTER',
    );
  }

  return date;
};

// ===============================================
// SERVICE: Obtener mis recorridos
// ===============================================
const getMisRecorridosService = async ({
  id_usuario,
  page = 1,
  limit = 10,
  estado = null,
  fecha_desde = null,
  fecha_hasta = null,
}) => {
  const usuarioId =
    Number.parseInt(
      id_usuario,
      10,
    );

  if (
    !Number.isInteger(
      usuarioId,
    ) ||
    usuarioId <= 0
  ) {
    throw new AppError(
      'El identificador del usuario no es válido.',
      400,
      'INVALID_USER_ID',
    );
  }

  const currentPage =
    parsePositiveInteger(
      page,
      1,
    );

  const currentLimit =
    parsePositiveInteger(
      limit,
      10,
      100,
    );

  const offset =
    (
      currentPage -
      1
    ) *
    currentLimit;

  // -------------------------------------------
  // 1. Buscar personal asociado al usuario
  // -------------------------------------------

  const personal =
    await PersonalOperativo.findOne({
      where: {
        id_usuario:
          usuarioId,
      },

      attributes: [
        'id_personal',
      ],
    });

  if (!personal) {
    throw new AppError(
      'El usuario no se encuentra asociado con personal operativo.',
      404,
      'OPERATIONAL_PERSONNEL_NOT_FOUND',
    );
  }

  // -------------------------------------------
  // 2. Obtener programaciones donde participó
  // -------------------------------------------

  const asignaciones =
    await ProgramacionPersonal.findAll({
      where: {
        id_personal:
          personal.id_personal,

        estado_asignacion: {
          [Op.notIn]: [
            'RECHAZADO',
            'RETIRADO',
          ],
        },
      },

      attributes: [
        'id_programacion',
        'funcion',
        'es_principal',
        'estado_asignacion',
      ],

      order: [
        [
          'id_programacion',
          'DESC',
        ],
      ],
    });

  const asignacionPorProgramacion =
    new Map();

  for (
    const asignacion
    of asignaciones
  ) {
    const item =
      asignacion.get({
        plain: true,
      });

    asignacionPorProgramacion.set(
      String(
        item.id_programacion,
      ),
      item,
    );
  }

  const programacionIds = [
    ...asignacionPorProgramacion
      .keys(),
  ];

  // -------------------------------------------
  // 3. Respuesta vacía
  // -------------------------------------------

  if (
    !programacionIds.length
  ) {
    return {
      items: [],

      pagination: {
        total_items: 0,
        total_pages: 0,
        current_page:
          currentPage,
        per_page:
          currentLimit,
        has_next_page:
          false,
        has_previous_page:
          false,
      },
    };
  }

  // -------------------------------------------
  // 4. Construir filtros del recorrido
  // -------------------------------------------

  const where = {
    id_programacion: {
      [Op.in]:
        programacionIds,
    },
  };

  const allowedStates = [
    'EN_CURSO',
    'PAUSADO',
    'FINALIZADO',
    'CANCELADO',
  ];

  if (estado) {
    const normalizedState =
      String(
        estado,
      )
        .trim()
        .toUpperCase();

    if (
      !allowedStates.includes(
        normalizedState,
      )
    ) {
      throw new AppError(
        'El estado del recorrido no es válido.',
        400,
        'INVALID_ROUTE_JOURNEY_STATUS',
      );
    }

    where.estado_recorrido =
      normalizedState;
  }

  const startDate =
    parseDateFilter(
      fecha_desde,
      'fecha_desde',
    );

  const endDate =
    parseDateFilter(
      fecha_hasta,
      'fecha_hasta',
      true,
    );

  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {
    throw new AppError(
      'La fecha desde no puede ser posterior a la fecha hasta.',
      400,
      'INVALID_DATE_RANGE',
    );
  }

  if (
    startDate ||
    endDate
  ) {
    where.fecha_hora_inicio = {};

    if (startDate) {
      where
        .fecha_hora_inicio[
        Op.gte
      ] = startDate;
    }

    if (endDate) {
      where
        .fecha_hora_inicio[
        Op.lte
      ] = endDate;
    }
  }

  // -------------------------------------------
  // 5. Consultar recorridos paginados
  // -------------------------------------------

  const {
    count,
    rows,
  } =
    await Recorrido
      .findAndCountAll({
        where,

        limit:
          currentLimit,

        offset,

        order: [
          [
            'fecha_hora_inicio',
            'DESC',
          ],
          [
            'id_recorrido',
            'DESC',
          ],
        ],
      });

  // -------------------------------------------
  // 6. Obtener las programaciones encontradas
  // -------------------------------------------

  const foundProgrammingIds = [
    ...new Set(
      rows.map(
        (recorrido) =>
          String(
            recorrido
              .id_programacion,
          ),
      ),
    ),
  ];

  const programaciones =
    foundProgrammingIds.length
      ? await ProgramacionRuta
        .findAll({
          where: {
            id_programacion: {
              [Op.in]:
                foundProgrammingIds,
            },
          },

          include: [
            {
              model: Ruta,

              /*
              | Ajustar si tu alias tiene
              | otro nombre.
              */
              as: 'ruta',

              required: false,
            },
            {
              model:
                RutaVersion,

              /*
              | Ajustar según tus
              | asociaciones.
              */
              as:
                'ruta_version',

              required: false,
            },
            {
              model:
                Vehiculo,

              /*
              | Ajustar según tus
              | asociaciones.
              */
              as:
                'vehiculo',

              required: false,
            },
          ],
        })
      : [];

  const programacionMap =
    new Map(
      programaciones.map(
        (programacion) => [
          String(
            programacion
              .id_programacion,
          ),

          programacion.get({
            plain: true,
          }),
        ],
      ),
    );

  // -------------------------------------------
  // 7. Formar respuesta
  // -------------------------------------------

  const items =
    rows.map(
      (recorrido) => {
        const item =
          recorrido.get({
            plain: true,
          });

        const key =
          String(
            item.id_programacion,
          );

        return {
          ...item,

          programacion:
            programacionMap.get(
              key,
            ) ||
            null,

          mi_asignacion:
            asignacionPorProgramacion
              .get(key) ||
            null,
        };
      },
    );

  const totalPages =
    count > 0
      ? Math.ceil(
        count /
        currentLimit,
      )
      : 0;

  return {
    items,

    pagination: {
      total_items:
        count,

      total_pages:
        totalPages,

      current_page:
        currentPage,

      per_page:
        currentLimit,

      has_next_page:
        currentPage <
        totalPages,

      has_previous_page:
        currentPage > 1,
    },
  };
};

module.exports = getMisRecorridosService;