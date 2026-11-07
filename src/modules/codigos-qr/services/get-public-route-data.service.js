const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  validateId,
} = require('../validations/codigo-qr.validation');

const {
  getPeruDateOnly,
  parseDateOnly,
  mapProgrammingState,
} = require('../utils/public-consultation.utils');

// ==========================================================
// UBICACIÓN PÚBLICA
// ==========================================================

const sinUbicacion = (
  motivo,
  mensaje,
  fecha = null,
) => ({
  disponible: false,
  motivo,
  mensaje,
  ultima_actualizacion: fecha,
});

function publicarUbicacion(
  ultima,
  recorrido,
) {
  if (!recorrido) {
    return sinUbicacion(
      'SIN_RECORRIDO_ACTIVO',
      'No hay un recorrido activo.',
    );
  }

  if (!ultima) {
    return sinUbicacion(
      'SIN_UBICACION',
      'Esperando la primera ubicación del vehículo.',
    );
  }

  if (ultima.es_ubicacion_simulada) {
    return sinUbicacion(
      'UBICACION_SIMULADA',
      'La ubicación disponible no corresponde a una medición real.',
    );
  }

  const captura = new Date(
    ultima.fecha_dispositivo,
  ).getTime();

  const recepcion = new Date(
    ultima.fecha_recepcion,
  ).getTime();

  const inicio = new Date(
    recorrido.fecha_hora_inicio,
  ).getTime();

  const ahora = Date.now();

  const configurado = Number(
    process.env.PUBLIC_LOCATION_MAX_AGE_SECONDS,
  );

  const maxEdad =
    Number.isFinite(configurado) &&
      configurado >= 15
      ? configurado
      : 120;

  const fechaInvalida =
    ![captura, recepcion, inicio].every(
      Number.isFinite,
    ) ||
    ultima.fecha_dispositivo == null ||
    ultima.fecha_recepcion == null ||
    captura < inicio ||
    captura > ahora + 5000 ||
    recepcion > ahora + 5000 ||
    captura > recepcion + 5000;

  if (fechaInvalida) {
    return sinUbicacion(
      'FECHA_INVALIDA',
      'No se pudo validar la fecha de la ubicación.',
    );
  }

  if (
    ahora - captura > maxEdad * 1000 ||
    ahora - recepcion > maxEdad * 1000
  ) {
    return sinUbicacion(
      'UBICACION_DESACTUALIZADA',
      'La última ubicación está desactualizada.',
      ultima.fecha_dispositivo,
    );
  }

  const latitud = Number(ultima.latitud);
  const longitud = Number(ultima.longitud);

  if (
    ultima.latitud == null ||
    ultima.longitud == null ||
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    Math.abs(latitud) > 90 ||
    Math.abs(longitud) > 180
  ) {
    return sinUbicacion(
      'COORDENADAS_INVALIDAS',
      'No hay coordenadas válidas para mostrar.',
    );
  }

  const valor = Number(
    process.env.PUBLIC_LOCATION_DECIMALS,
  );

  const decimales = Number.isInteger(valor)
    ? Math.min(4, Math.max(2, valor))
    : 3;

  return {
    disponible: true,

    latitud: Number(
      latitud.toFixed(decimales),
    ),

    longitud: Number(
      longitud.toFixed(decimales),
    ),

    ultima_actualizacion:
      ultima.fecha_dispositivo,

    valida_hasta: new Date(
      Math.min(captura, recepcion) +
      maxEdad * 1000,
    ).toISOString(),

    estado_recorrido:
      recorrido.estado_recorrido,

    es_aproximada: true,

    antiguedad_segundos: Math.max(
      0,
      Math.floor(
        (ahora - captura) / 1000,
      ),
    ),
  };
}

// ==========================================================
// DATOS PÚBLICOS DE UNA RUTA
// ==========================================================

module.exports = async function getPublicRouteData({
  id_ruta,
  fecha_referencia = null,
}) {
  const id = validateId(
    id_ruta,
    'identificador de la ruta',
  );

  const fecha =
    fecha_referencia || getPeruDateOnly();

  parseDateOnly(fecha);

  const ruta = await db.Ruta.findByPk(id, {
    include: [
      {
        association: 'zona',

        attributes: [
          'id_zona',
          'nombre',
          'estado',
        ],
      },
    ],
  });

  const recursoDisponible = Boolean(
    ruta && ruta.zona,
  );

  const habilitada = Boolean(
    recursoDisponible &&
    ruta.estado &&
    ruta.zona.estado &&
    ruta.estado_ruta === 'ACTIVA',
  );

  // Una ruta suspendida puede conservar su información
  // publicada. Una ruta borrador no publica su geometría.
  const cronogramaDisponible = Boolean(
    recursoDisponible &&
    ruta.estado &&
    ruta.zona.estado &&
    ruta.estado_ruta !== 'BORRADOR',
  );

  const version = cronogramaDisponible
    ? await db.RutaVersion.findOne({
      where: {
        id_ruta: id,
        vigente: true,
        estado: true,
      },

      order: [
        ['numero_version', 'DESC'],
      ],
    })
    : null;

  const datosRuta = {
    id_ruta: ruta?.id_ruta ?? id,
    nombre: ruta?.nombre ?? 'Ruta no disponible',
    codigo: ruta?.codigo ?? '',
    color: ruta?.color ?? '#64748B',

    zona: {
      id_zona:
        ruta?.zona?.id_zona ?? null,

      nombre:
        ruta?.zona?.nombre ??
        'Sector no disponible',
    },

    id_ruta_version:
      version?.id_ruta_version ?? null,

    geometria_geojson:
      version?.geometria_geojson ?? null,
  };

  // La indisponibilidad del servicio no invalida el QR.
  if (!habilitada) {
    const codigo = recursoDisponible
      ? 'SERVICIO_SUSPENDIDO'
      : 'RECURSO_NO_DISPONIBLE';

    const mensaje = recursoDisponible
      ? 'El servicio de esta ruta está suspendido. El código QR sigue vigente.'
      : 'El recurso asociado ya no está disponible. El código QR sigue registrado.';

    return {
      recurso_disponible:
        recursoDisponible,

      cronograma_disponible:
        cronogramaDisponible,

      ruta: datosRuta,

      estado: {
        disponible: false,
        codigo,
        mensaje,
        programacion: null,
        recorrido: null,
      },

      ubicacion: sinUbicacion(
        codigo,
        'No hay seguimiento público disponible.',
      ),
    };
  }

  // El recorrido activo tiene prioridad.
  const activo = await db.Recorrido.findOne({
    where: {
      estado_recorrido: {
        [Op.in]: [
          'EN_CURSO',
          'PAUSADO',
        ],
      },
    },

    include: [
      {
        association: 'programacion',
        required: true,

        where: {
          id_ruta: id,
        },
      },
    ],

    order: [
      ['fecha_hora_inicio', 'DESC'],
      ['id_recorrido', 'DESC'],
    ],
  });

  const programacion =
    activo?.programacion ||

    await db.ProgramacionRuta.findOne({
      where: {
        id_ruta: id,
        fecha_programada: fecha,

        estado_programacion: {
          [Op.notIn]: [
            'FINALIZADA',
            'CANCELADA',
          ],
        },
      },

      order: [
        ['hora_inicio_programada', 'ASC'],
      ],
    }) ||

    await db.ProgramacionRuta.findOne({
      where: {
        id_ruta: id,
        fecha_programada: fecha,
      },

      order: [
        ['hora_inicio_programada', 'DESC'],
      ],
    }) ||

    await db.ProgramacionRuta.findOne({
      where: {
        id_ruta: id,

        fecha_programada: {
          [Op.gt]: fecha,
        },

        estado_programacion: {
          [Op.notIn]: [
            'FINALIZADA',
            'CANCELADA',
          ],
        },
      },

      order: [
        ['fecha_programada', 'ASC'],
        ['hora_inicio_programada', 'ASC'],
      ],
    });

  // Conservar el estado de la ejecución finalizada.
  const recorrido =
    activo ||

    (
      programacion
        ? await db.Recorrido.findOne({
          where: {
            id_programacion:
              programacion.id_programacion,
          },

          order: [
            ['id_recorrido', 'DESC'],
          ],
        })
        : null
    );

  // Durante la ejecución se dibuja la versión asignada.
  if (activo) {
    const asignada =
      await db.RutaVersion.findOne({
        where: {
          id_ruta: id,

          id_ruta_version:
            activo.programacion.id_ruta_version,
        },
      });

    datosRuta.id_ruta_version =
      asignada?.id_ruta_version ?? null;

    datosRuta.geometria_geojson =
      asignada?.geometria_geojson ?? null;
  }

  const estadosRecorrido = {
    EN_CURSO: {
      codigo: 'EN_PROCESO',
      mensaje: 'El vehículo está realizando la recolección.',
    },

    PAUSADO: {
      codigo: 'DEMORADA',
      mensaje: 'La recolección está pausada temporalmente.',
    },

    FINALIZADO: {
      codigo: 'COMPLETADA',
      mensaje: 'La recolección finalizó. Puedes seguir consultando los horarios desde este QR.',
    },

    CANCELADO: {
      codigo: 'CANCELADA',
      mensaje: 'El recorrido fue cancelado.',
    },
  };

  const estado = estadosRecorrido[
    recorrido?.estado_recorrido
  ] ||

    mapProgrammingState(
      programacion?.estado_programacion,
    );

  // No consultar ni publicar el GPS de un recorrido terminado.
  const ultima = activo
    ? await db.RecorridoUltimaUbicacion.findOne({
      where: {
        id_recorrido:
          activo.id_recorrido,
      },
    })
    : null;

  return {
    recurso_disponible: true,
    cronograma_disponible: true,

    ruta: datosRuta,

    estado: {
      disponible: Boolean(programacion),

      codigo: programacion
        ? estado.codigo
        : 'SIN_PROGRAMACION',

      mensaje: programacion
        ? estado.mensaje
        : 'No hay una programación próxima disponible. Consulta los horarios publicados.',

      programacion: programacion
        ? {
          fecha_programada: programacion.fecha_programada,
          hora_inicio: programacion.hora_inicio_programada,
          hora_fin: programacion.hora_fin_programada,
          turno: programacion.turno,
        }
        : null,

      recorrido: recorrido
        ? {
          estado: recorrido.estado_recorrido,
          fecha_hora_inicio: recorrido.fecha_hora_inicio,
          fecha_hora_finalizacion: recorrido.fecha_hora_finalizacion,
        }
        : null,
    },

    ubicacion: publicarUbicacion(
      ultima,
      activo,
    ),
  };
};