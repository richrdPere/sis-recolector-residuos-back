'use strict';

const {
  Op,
  Transaction,
} = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const getPuntos = require('../../recolecciones/services/get-route-collection-points.service');

const { getIncidenciasScope } = require('../../incidencias/utils/incidencia-service.utils');

const {
  calcularTiempos,
  construirTrazado,
} = require('../utils/historial.utils');

const ROLES_GENERALES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
];

// ==========================================================
// ACTOR Y AUTORIZACIÓN
// ==========================================================

const actorDe = usuario => {
  const id = Number(
    usuario?.id_usuario,
  );

  const roles = (
    usuario?.roles || []
  ).map(
    rol =>
      typeof rol === 'string'
        ? rol
        : rol.nombre,
  );

  const permitido = roles.some(
    rol => [
      ...ROLES_GENERALES,
      'CONDUCTOR',
      'RECOLECTOR',
    ].includes(rol),
  );

  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !permitido
  ) {
    throw new AppError(
      'No tienes acceso al historial.',
      403,
      'HISTORY_FORBIDDEN',
    );
  }

  return {
    id_usuario: id,
    roles,
  };
};

const cargarAutorizado = async (
  idRecorrido,
  usuario,
  transaction,
) => {
  const actor = actorDe(usuario);
  const id = Number(idRecorrido);

  if (
    !/^\d+$/.test(String(idRecorrido)) ||
    !Number.isSafeInteger(id) ||
    id < 1
  ) {
    throw new AppError(
      'Recorrido no válido.',
      400,
      'INVALID_ID',
    );
  }

  const recorrido = await db.Recorrido.findByPk(
    id,
    { transaction },
  );

  if (!recorrido) {
    throw new AppError(
      'Recorrido no encontrado.',
      404,
      'HISTORY_NOT_FOUND',
    );
  }

  const consultaGeneral = actor.roles.some(
    rol => ROLES_GENERALES.includes(rol),
  );

  const conductorInicio =
    String(recorrido.id_usuario_inicio) ===
    String(actor.id_usuario);

  if (!consultaGeneral && !conductorInicio) {
    const personal = await db.PersonalOperativo.findOne({
      where: {
        id_usuario: actor.id_usuario,
      },

      paranoid: false,
      transaction,
    });

    const asignacion =
      personal &&
      await db.ProgramacionPersonal.findOne({
        where: {
          id_programacion:
            recorrido.id_programacion,

          id_personal:
            personal.id_personal,

          funcion: {
            [Op.in]: [
              'CONDUCTOR',
              'RECOLECTOR',
            ],
          },

          estado_asignacion: {
            [Op.in]: [
              'ACEPTADO',
              'EN_SERVICIO',
              'FINALIZADO',
            ],
          },
        },

        transaction,
      });

    if (!asignacion) {
      throw new AppError(
        'El recorrido no pertenece a tu equipo autorizado.',
        403,
        'HISTORY_FORBIDDEN',
      );
    }
  }

  return {
    recorrido,
    actor,
  };
};

const transaccion = fn =>
  db.sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    },
    fn,
  );

// ==========================================================
// DETALLE INTEGRADO
// ==========================================================

const detalleHistorialService = (
  id,
  usuario,
) => transaccion(async transaction => {
  const {
    recorrido,
    actor,
  } = await cargarAutorizado(
    id,
    usuario,
    transaction,
  );

  const programacion = await db.ProgramacionRuta.findByPk(
    recorrido.id_programacion,
    {
      attributes: [
        'id_programacion',
        'id_ruta',
        'id_ruta_version',
        'id_vehiculo',
        'fecha_programada',
        'turno',
      ],

      include: [
        {
          association: 'ruta',

          attributes: [
            'id_ruta',
            'codigo',
            'nombre',
          ],

          include: [
            {
              association: 'zona',

              attributes: [
                'id_zona',
                'nombre',
              ],
            },
          ],
        },
        {
          association: 'vehiculo',

          attributes: [
            'id_vehiculo',
            'codigo',
            'placa',
            'capacidad_maxima',
            'unidad_capacidad',
          ],
        },
      ],

      transaction,
    },
  );

  if (!programacion) {
    throw new AppError(
      'La programación asociada no existe.',
      409,
      'HISTORY_PROGRAMMING_NOT_FOUND',
    );
  }

  const eventos = await db.RecorridoEvento.findAll({
    where: {
      id_recorrido: recorrido.id_recorrido,
    },

    attributes: [
      'id_recorrido_evento',
      'tipo_evento',
      'fecha_evento',
      'latitud',
      'longitud',
      'precision_gps',
      'observacion',
    ],

    include: [
      {
        association: 'usuario',

        attributes: [
          'id_usuario',
          'username',
        ],

        required: false,
      },
    ],

    order: [
      ['fecha_evento', 'ASC'],
      ['id_recorrido_evento', 'ASC'],
    ],

    transaction,
  });

  const equipo = await db.ProgramacionPersonal.findAll({
    where: {
      id_programacion:
        recorrido.id_programacion,

      estado_asignacion: {
        [Op.notIn]: [
          'RETIRADO',
          'RECHAZADO',
        ],
      },
    },

    attributes: [
      'id_personal',
      'funcion',
      'estado_asignacion',
    ],

    include: [
      {
        association: 'personal',
        attributes: ['id_personal'],
        paranoid: false,

        include: [
          {
            association: 'usuario',
            attributes: ['username'],
            required: false,
          },
        ],
      },
    ],

    transaction,
  });

  // Conservar la política de incidencias existente.
  const scope = await getIncidenciasScope(
    actor,
  );

  const incidencias = await db.Incidencia.findAll({
    where: {
      [Op.and]: [
        scope,
        {
          id_recorrido:
            recorrido.id_recorrido,

          estado: true,
        },
      ],
    },

    attributes: [
      'id_incidencia',
      'titulo',
      'descripcion',
      'tipo',
      'prioridad',
      'estado_incidencia',
      'fecha_reporte',
      'fecha_resolucion',
    ],

    order: [
      ['fecha_reporte', 'ASC'],
      ['id_incidencia', 'ASC'],
    ],

    transaction,
  });

  const puntos = await getPuntos(
    recorrido.id_recorrido,
    { transaction },
  );

  const eventosPlain = eventos.map(
    evento => evento.get({ plain: true }),
  );

  const r = recorrido.get({
    plain: true,
  });

  return {
    recorrido: {
      id_recorrido: r.id_recorrido,
      estado_recorrido: r.estado_recorrido,

      fecha_hora_inicio: r.fecha_hora_inicio,
      fecha_hora_finalizacion:
        r.fecha_hora_finalizacion,

      kilometraje_inicio: r.kilometraje_inicio,
      kilometraje_final: r.kilometraje_final,

      distancia_recorrida_metros:
        r.distancia_recorrida_metros,

      motivo_cancelacion:
        r.motivo_cancelacion,

      resultado_final: r.resultado_final,
    },

    programacion: programacion.get({
      plain: true,
    }),

    equipo: equipo.map(item => ({
      id_personal: item.id_personal,
      funcion: item.funcion,

      estado_asignacion:
        item.estado_asignacion,

      usuario:
        item.personal?.usuario?.username || null,
    })),

    eventos: eventosPlain,

    tiempos: calcularTiempos(
      r,
      eventosPlain,
    ),

    puntos,

    resumen_puntos: {
      total: puntos.length,

      atendidos: puntos.filter(
        p => p.estado_atencion === 'ATENDIDO',
      ).length,

      omitidos: puntos.filter(
        p => p.estado_atencion === 'OMITIDO',
      ).length,

      pendientes: puntos.filter(
        p => p.estado_atencion === 'PENDIENTE',
      ).length,
    },

    incidencias: incidencias.map(
      item => item.get({ plain: true }),
    ),

    generado_en: new Date().toISOString(),

    nota_incidencias:
      'Solo se muestran las incidencias permitidas por tu perfil.',
  };
});

// ==========================================================
// TRAZADO GPS COMPLETO RECIBIDO POR EL SERVIDOR
// ==========================================================

const trazadoHistorialService = (
  id,
  usuario,
) => transaccion(async transaction => {
  const {
    recorrido,
  } = await cargarAutorizado(
    id,
    usuario,
    transaction,
  );

  const posiciones = await db.RecorridoPosicion.findAll({
    where: {
      id_recorrido: recorrido.id_recorrido,
    },

    attributes: [
      'latitud',
      'longitud',
      'fecha_dispositivo',
      'es_valida',
      'es_ubicacion_simulada',
    ],

    order: [
      ['fecha_dispositivo', 'ASC'],
      ['id_posicion', 'ASC'],
    ],

    raw: true,
    transaction,
  });

  return construirTrazado(
    recorrido,
    posiciones,
  );
});

module.exports = {
  detalleHistorialService,
  trazadoHistorialService,
};