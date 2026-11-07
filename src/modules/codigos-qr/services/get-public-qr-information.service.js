const db = require('../../../database/models');

const resolvePublicQrService = require('./resolve-public-qr.service');
const getPublicScheduleService = require('./get-public-schedule.service');
const getPublicRouteData = require('./get-public-route-data.service');

module.exports = async function getPublicQrInformationService({
  token_publico,
  fecha_referencia = null,
  ip = null,
  user_agent = null,
  referer = null,
  idioma = null,
}) {
  const qr = await resolvePublicQrService({
    token_publico,
    ip,
    user_agent,
    referer,
    idioma,
  });

  // Únicamente un problema del QR invalida la consulta.
  if (!qr.encontrado || !qr.disponible) {
    return {
      codigo_qr: qr,
      cronograma: null,
      rutas: [],
    };
  }

  const recurso = qr.recurso;

  const base = {
    codigo_qr: {
      ...qr.codigo,
      disponible: true,
      estado: 'ACTIVO',
    },

    tipo_recurso: recurso.tipo,
    recurso,

    fecha_actualizacion:
      new Date().toISOString(),
  };

  if (recurso.tipo === 'RUTA') {
    const datos = await getPublicRouteData({
      id_ruta: recurso.id,
      fecha_referencia,
    });

    const cronograma =
      datos.cronograma_disponible
        ? await getPublicScheduleService({
          id_ruta: recurso.id,
          fecha_referencia,
        })
        : null;

    const horario =
      cronograma?.rutas?.[0];

    return {
      ...base,

      fecha_consulta:
        cronograma?.fecha_consulta ??
        base.fecha_actualizacion,

      cronograma: {
        fecha_consulta:
          cronograma?.fecha_consulta ??
          base.fecha_actualizacion,

        tipo_recurso: 'RUTA',

        rutas: [
          {
            ruta: datos.ruta,
            horarios: horario?.horarios ?? [],
            proxima_recoleccion: horario?.proxima_recoleccion ?? null,
          },
        ],
      },

      estado: datos.estado,
      ubicacion: datos.ubicacion,
    };
  }

  const zona = await db.Zona.findByPk(
    recurso.id,
  );

  // Un recurso retirado no convierte el QR en revocado.
  if (!zona) {
    return {
      ...base,

      fecha_consulta: base.fecha_actualizacion,

      zona: {
        id_zona: recurso.id,
        nombre: recurso.nombre,
      },

      estado_recurso: 'RECURSO_NO_DISPONIBLE',

      rutas: [],
    };
  }

  const cronograma =
    await getPublicScheduleService({
      id_zona: recurso.id,
      fecha_referencia,
    });

  const rutas = await Promise.all(
    cronograma.rutas.map(async (item) => {
      const datos = await getPublicRouteData({
        id_ruta: item.ruta.id_ruta,
        fecha_referencia,
      });

      return {
        ...item,
        ...datos,

        horarios:
          datos.cronograma_disponible
            ? item.horarios
            : [],

        proxima_recoleccion:
          datos.cronograma_disponible
            ? item.proxima_recoleccion
            : null,
      };
    }),
  );

  return {
    ...base,
    fecha_consulta: cronograma.fecha_consulta,
    zona: cronograma.zona,
    rutas,
  };
};
// // services/get-public-qr-information.service.js

// const resolvePublicQrService = require("./resolve-public-qr.service");

// const getPublicScheduleService = require('./get-public-schedule.service');
// const getPublicRouteStatusService = require('./get-public-route-status.service');
// const getPublicRouteLocationService = require('./get-public-route-location.service');

// // ===============================================
// // SERVICE: Información pública completa
// // ===============================================
// const getPublicQrInformationService = async ({
//   token_publico,
//   fecha_referencia = null,
//   ip = null,
//   user_agent = null,
//   referer = null,
//   idioma = null,
// }) => {
//   const qrResult =
//     await resolvePublicQrService({
//       token_publico,
//       ip,
//       user_agent,
//       referer,
//       idioma,
//     });

//   if (
//     !qrResult.encontrado ||
//     !qrResult.disponible
//   ) {
//     return {
//       codigo_qr:
//         qrResult,

//       cronograma:
//         null,

//       rutas:
//         [],
//     };
//   }

//   const resource =
//     qrResult.recurso;

//   /*
//    * QR asociado directamente con una ruta.
//    */

//   if (
//     resource.tipo ===
//     'RUTA'
//   ) {
//     const [
//       cronograma,
//       estado,
//       ubicacion,
//     ] =
//       await Promise.all([
//         getPublicScheduleService({
//           id_ruta:
//             resource.id,

//           fecha_referencia,
//         }),

//         getPublicRouteStatusService({
//           id_ruta:
//             resource.id,

//           fecha_referencia,
//         }),

//         getPublicRouteLocationService({
//           id_ruta:
//             resource.id,
//         }),
//       ]);

//     return {
//       codigo_qr:
//         qrResult.codigo,

//       tipo_recurso:
//         'RUTA',

//       recurso:
//         resource,

//       fecha_consulta:
//         cronograma
//           .fecha_consulta,

//       cronograma,

//       estado,

//       ubicacion,
//     };
//   }

//   /*
//    * QR asociado con una zona.
//    */

//   const cronograma =
//     await getPublicScheduleService({
//       id_zona:
//         resource.id,

//       fecha_referencia,
//     });

//   const rutas =
//     await Promise.all(
//       cronograma.rutas.map(
//         async (
//           routeSchedule,
//         ) => {
//           const [
//             estado,
//             ubicacion,
//           ] =
//             await Promise.all([
//               getPublicRouteStatusService({
//                 id_ruta:
//                   routeSchedule
//                     .ruta
//                     .id_ruta,

//                 fecha_referencia,
//               }),

//               getPublicRouteLocationService({
//                 id_ruta:
//                   routeSchedule
//                     .ruta
//                     .id_ruta,
//               }),
//             ]);

//           return {
//             ...routeSchedule,
//             estado,
//             ubicacion,
//           };
//         },
//       ),
//     );

//   return {
//     codigo_qr:
//       qrResult.codigo,

//     tipo_recurso:
//       'ZONA',

//     recurso:
//       resource,

//     fecha_consulta:
//       cronograma
//         .fecha_consulta,

//     zona:
//       cronograma.zona,

//     rutas,
//   };
// };

// module.exports =
//   getPublicQrInformationService;