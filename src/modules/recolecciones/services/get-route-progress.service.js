'use strict';

const db = require('../../../database/models');

const { validateId } = require('../validations/recoleccion.validation');

const getPoints = require('./get-route-collection-points.service',);

const porcentaje = (
  cantidad,
  total,
) => {
  return total
    ? Number(
      (cantidad / total * 100).toFixed(2),
    )
    : 0;
};

module.exports = async (idRecorrido) => {
  const id = validateId(
    idRecorrido,
    'identificador del recorrido',
  );

  return db.sequelize.transaction(
    {
      isolationLevel: 'REPEATABLE READ',
    },
    async (transaction) => {
      const puntos = await getPoints(
        id,
        { transaction },
      );

      const recorrido = await db.Recorrido.findByPk(
        id,
        { transaction },
      );

      const contar = (
        items,
        estado,
      ) => {
        return items.filter(
          (item) =>
            item.estado_atencion === estado,
        ).length;
      };

      const obligatorios = puntos.filter(
        (punto) =>
          punto.obligatorio === true ||
          punto.obligatorio === 1 ||
          punto.obligatorio === '1',
      );

      const atendidos = contar(
        puntos,
        'ATENDIDO',
      );

      const omitidos = contar(
        puntos,
        'OMITIDO',
      );

      const pendientes = contar(
        puntos,
        'PENDIENTE',
      );

      const obligatoriosAtendidos = contar(
        obligatorios,
        'ATENDIDO',
      );

      const obligatoriosOmitidos = contar(
        obligatorios,
        'OMITIDO',
      );

      const obligatoriosPendientes = contar(
        obligatorios,
        'PENDIENTE',
      );

      // Cantidades registradas por punto.
      // Cada unidad conserva su propio acumulado.
      const cantidadesPorPunto = {};

      for (const punto of puntos) {
        const collection = punto.recoleccion;

        if (
          punto.estado_atencion !== 'ATENDIDO' ||
          collection?.cantidad_recolectada == null ||
          !collection.unidad_medida
        ) {
          continue;
        }

        const cantidad = Number(
          collection.cantidad_recolectada,
        );

        if (!Number.isFinite(cantidad)) continue;

        const unidad = collection.unidad_medida;

        cantidadesPorPunto[unidad] =
          (cantidadesPorPunto[unidad] || 0) +
          cantidad;
      }

      for (
        const unidad
        of Object.keys(cantidadesPorPunto)
      ) {
        cantidadesPorPunto[unidad] = Number(
          cantidadesPorPunto[unidad].toFixed(3),
        );
      }

      // Conserva el criterio anterior de progreso:
      // atención de obligatorios.
      // Si no hay obligatorios, utiliza todos.
      const base = obligatorios.length
        ? obligatorios
        : puntos;

      const baseAtendidos = contar(
        base,
        'ATENDIDO',
      );

      const resultadoFinal =
        recorrido.resultado_final;

      return {
        id_recorrido: id,

        total_puntos: puntos.length,
        puntos_atendidos: atendidos,
        puntos_omitidos: omitidos,
        puntos_pendientes: pendientes,

        puntos_obligatorios: obligatorios.length,

        obligatorios_atendidos: obligatoriosAtendidos,

        obligatorios_omitidos: obligatoriosOmitidos,

        obligatorios_pendientes: obligatoriosPendientes,

        obligatorios_no_atendidos: obligatoriosOmitidos + obligatoriosPendientes,

        porcentaje_atencion: porcentaje(
          atendidos,
          puntos.length,
        ),

        porcentaje_gestion: porcentaje(
          atendidos + omitidos,
          puntos.length,
        ),

        porcentaje_progreso: porcentaje(
          baseAtendidos,
          base.length,
        ),

        ruta_completada:
          base.length > 0 &&
          baseAtendidos === base.length,

        gestion_completada:
          puntos.length > 0 &&
          pendientes === 0,

        cantidades_por_punto:
          cantidadesPorPunto,

        // Conserva el significado de este campo:
        // total final declarado del recorrido.
        // No se suma nuevamente a lo registrado por punto.
        cantidades_por_unidad: resultadoFinal
          ? {
            [resultadoFinal.unidad_medida]:
              resultadoFinal.cantidad_total,
          }
          : {},

        resultado_final_pendiente:
          !resultadoFinal,
      };
    },
  );
};

// // services/get-route-progress.service.js

// const db = require('../../../database/models');
// const AppError = require('../../../utils/app-error');

// // Validations
// const { validateId } = require('../validations/recoleccion.validation');

// // Modelos
// const {
//   Recorrido,
//   ProgramacionRuta,
//   RutaPunto,
//   RecoleccionPunto,
// } = db;

// // ===============================================
// // Services: Obtener resumen de progreso
// // ===============================================
// const getRouteProgressService = async (idRecorrido) => {
//   const recorridoId =
//     validateId(
//       idRecorrido,
//       'identificador del recorrido',
//     );

//   const recorrido =
//     await Recorrido.findByPk(
//       recorridoId,
//     );

//   if (!recorrido) {
//     throw new AppError(
//       'El recorrido no fue encontrado.',
//       404,
//       'ROUTE_JOURNEY_NOT_FOUND',
//     );
//   }

//   const programacion =
//     await ProgramacionRuta
//       .findByPk(
//         recorrido
//           .id_programacion,
//       );

//   if (!programacion) {
//     throw new AppError(
//       'La programación asociada no fue encontrada.',
//       404,
//       'PROGRAMMING_NOT_FOUND',
//     );
//   }

//   const points =
//     await RutaPunto.findAll({
//       where: {
//         id_ruta_version: programacion.id_ruta_version,
//         estado: true,
//       },

//       attributes: [
//         'id_ruta_punto',
//         'obligatorio',
//       ],

//       raw: true,
//     });

//   const registeredCollections =
//     await RecoleccionPunto
//       .findAll({
//         where: {
//           id_recorrido:
//             recorridoId,

//           estado_recoleccion:
//             'REGISTRADA',
//         },

//         attributes: [
//           'id_ruta_punto',
//           'cantidad_recolectada',
//           'unidad_medida',
//         ],

//         raw:
//           true,
//       });

//   const collectedPointIds =
//     new Set(
//       registeredCollections.map(
//         (
//           item,
//         ) =>
//           String(
//             item
//               .id_ruta_punto,
//           ),
//       ),
//     );

//   const mandatoryPoints =
//     points.filter((point) =>
//       // point.es_obligatorio !== false,
//       point.obligatorio !== false
//     );

//   const attendedMandatory =
//     mandatoryPoints.filter(
//       (
//         point,
//       ) =>
//         collectedPointIds.has(
//           String(point.id_ruta_punto),
//         ),
//     ).length;

//   const totalMandatory = mandatoryPoints.length;

//   const percentage = totalMandatory > 0
//     ? Number(
//       (
//         attendedMandatory /
//         totalMandatory *
//         100
//       ).toFixed(2),
//     )
//     : 0;

//   const totalsByUnit = {};

//   for (
//     const item
//     of registeredCollections
//   ) {
//     if (
//       item.cantidad_recolectada === null || !item.unidad_medida
//     ) {
//       continue;
//     }

//     totalsByUnit[
//       item.unidad_medida
//     ] =
//       (
//         totalsByUnit[
//         item.unidad_medida
//         ] || 0
//       ) +
//       Number(
//         item
//           .cantidad_recolectada,
//       );
//   }

//   return {
//     id_recorrido: recorridoId,

//     total_puntos: points.length,

//     puntos_atendidos: collectedPointIds.size,

//     puntos_pendientes: Math.max(
//       points.length - collectedPointIds.size,
//       0,
//     ),

//     puntos_obligatorios: totalMandatory,

//     obligatorios_atendidos: attendedMandatory,

//     obligatorios_pendientes: Math.max(
//       totalMandatory - attendedMandatory,
//       0,
//     ),

//     porcentaje_progreso: percentage,

//     ruta_completada: totalMandatory > 0 &&
//       attendedMandatory === totalMandatory,

//     cantidades_por_unidad: recorrido.resultado_final
//       ? {
//         [recorrido.resultado_final.unidad_medida]:
//           recorrido.resultado_final.cantidad_total,
//       }
//       : {},

//     resultado_final_pendiente:
//       !recorrido.resultado_final,
//     // cantidades_por_unidad: totalsByUnit,
//   };
// };

// module.exports = getRouteProgressService;