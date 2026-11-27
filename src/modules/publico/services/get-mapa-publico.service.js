const { Op } = require('sequelize');

const db = require('../../../database/models');

const { publicarUbicacion } = require('../../codigos-qr/services/get-public-route-data.service');

module.exports = async function getMapaPublicoService() {
  // Se toma antes de consultar para identificar respuestas antiguas.
  const generadoEn = new Date().toISOString();

  const rows = await db.Recorrido.findAll({
    where: {
      estado: true,

      estado_recorrido: {
        [Op.in]: ['EN_CURSO', 'PAUSADO'],
      },
    },

    attributes: [
      'id_recorrido',
      'estado_recorrido',
      'fecha_hora_inicio',
    ],

    include: [
      {
        association: 'programacion',
        required: true,

        attributes: ['id_programacion'],

        where: {
          estado_programacion: {
            [Op.in]: ['EN_CURSO', 'PAUSADA'],
          },
        },

        include: [
          {
            association: 'ruta',
            required: true,

            attributes: [
              'id_ruta',
              'codigo',
              'nombre',
              'color',
            ],

            where: {
              estado: true,
              estado_ruta: 'ACTIVA',
            },

            include: [
              {
                association: 'zona',
                required: true,

                attributes: [
                  'id_zona',
                  'nombre',
                ],

                where: {
                  estado: true,
                },
              },
            ],
          },
          {
            association: 'version_ruta',
            required: false,

            attributes: [
              'id_ruta_version',
              'geometria_geojson',
            ],
          },
          {
            association: 'vehiculo',
            required: true,

            attributes: ['tipo_vehiculo'],

            where: {
              estado: true,
            },
          },
        ],
      },
      {
        association: 'ultima_ubicacion',
        required: false,

        attributes: [
          'latitud',
          'longitud',
          'fecha_dispositivo',
          'fecha_recepcion',
          'es_ubicacion_simulada',
        ],
      },
    ],

    order: [['id_recorrido', 'DESC']],
    limit: 101,
  });

  return {
    generado_en: generadoEn,

    truncado: rows.length > 100,

    items: rows.slice(0, 100).map(row => {
      const recorrido = row.get({
        plain: true,
      });

      const programacion =
        recorrido.programacion;

      const ruta = programacion.ruta;

      const version =
        programacion.version_ruta;

      return {
        id_recorrido:
          recorrido.id_recorrido,

        estado:
          recorrido.estado_recorrido,

        tipo_vehiculo:
          programacion.vehiculo.tipo_vehiculo,

        ruta: {
          id_ruta: ruta.id_ruta,

          codigo: ruta.codigo,
          nombre: ruta.nombre,
          color: ruta.color,

          zona: {
            id_zona: ruta.zona.id_zona,
            nombre: ruta.zona.nombre,
          },

          id_ruta_version:
            version?.id_ruta_version ?? null,

          geometria_geojson:
            version?.geometria_geojson ?? null,
        },

        // Conserva tu validación de vigencia y precisión pública.
        ubicacion: publicarUbicacion(
          recorrido.ultima_ubicacion,
          recorrido,
        ),
      };
    }),
  };
};

// const { Op } = require('sequelize');

// const db = require('../../../database/models');

// const { publicarUbicacion } = require('../../codigos-qr/services/get-public-route-data.service');

// module.exports = async function getMapaPublicoService() {
//   const rows = await db.Recorrido.findAll({
//     where: {
//       estado: true,

//       estado_recorrido: {
//         [Op.in]: ['EN_CURSO', 'PAUSADO'],
//       },
//     },

//     attributes: [
//       'id_recorrido',
//       'estado_recorrido',
//       'fecha_hora_inicio',
//     ],

//     include: [
//       {
//         association: 'programacion',
//         required: true,
//         attributes: ['id_programacion'],

//         where: {
//           estado_programacion: {
//             [Op.in]: ['EN_CURSO', 'PAUSADA'],
//           },
//         },

//         include: [
//           {
//             association: 'ruta',
//             required: true,
//             attributes: ['id_ruta', 'nombre', 'color'],

//             where: {
//               estado: true,
//               estado_ruta: 'ACTIVA',
//             },
//           },
//           {
//             association: 'version_ruta',
//             required: false,
//             attributes: ['geometria_geojson'],
//           },
//           {
//             association: 'vehiculo',
//             required: true,
//             attributes: ['tipo_vehiculo'],

//             where: {
//               estado: true,
//             },
//           },
//         ],
//       },
//       {
//         association: 'ultima_ubicacion',
//         required: false,

//         attributes: [
//           'latitud',
//           'longitud',
//           'fecha_dispositivo',
//           'fecha_recepcion',
//           'es_ubicacion_simulada',
//         ],
//       },
//     ],

//     order: [['id_recorrido', 'DESC']],
//     limit: 101,
//   });

//   return {
//     generado_en: new Date().toISOString(),
//     truncado: rows.length > 100,

//     items: rows.slice(0, 100).map(row => {
//       const recorrido = row.get({ plain: true });
//       const programacion = recorrido.programacion;

//       return {
//         id_recorrido: recorrido.id_recorrido,
//         estado: recorrido.estado_recorrido,
//         tipo_vehiculo: programacion.vehiculo.tipo_vehiculo,

//         ruta: {
//           id_ruta: programacion.ruta.id_ruta,
//           nombre: programacion.ruta.nombre,
//           color: programacion.ruta.color,

//           geometria_geojson:
//             programacion.version_ruta?.geometria_geojson ?? null,
//         },

//         ubicacion: publicarUbicacion(
//           recorrido.ultima_ubicacion,
//           recorrido,
//         ),
//       };
//     }),
//   };
// };