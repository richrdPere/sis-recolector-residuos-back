const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');
const getEditableVersion = require('../../utils/ruta-horario/ruta-punto.utils');

// Auditoría
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  sequelize,
  RutaPunto,
} = db;

// ===============================================
// SERVICE: ELIMINAR UN PUNTO DE RUTA
// ===============================================
const deleteRutaPuntoService = async (
  idVersion,
  idPunto,
) => {
  const versionId = validateId(idVersion, 'identificador de la versión');

  const pointId = validateId(idPunto, 'identificador del punto');

  return sequelize.transaction(
    async (transaction) => {
      // ----------------------------------------------------
      // 1. BLOQUEAR Y VALIDAR LA VERSIÓN
      // ----------------------------------------------------
      await getEditableVersion(
        versionId,
        transaction,
      );

      // ----------------------------------------------------
      // 2. BUSCAR Y BLOQUEAR EL PUNTO
      // ----------------------------------------------------
      const punto = await RutaPunto.findOne({
        where: {
          id_ruta_punto: pointId,
          id_ruta_version: versionId,
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!punto) {
        throw new AppError(
          'El punto no fue encontrado en la versión indicada.',
          404,
          'ROUTE_POINT_NOT_FOUND',
        );
      }

      // ----------------------------------------------------
      // 3. CAPTURAR ESTADO ANTERIOR
      // ----------------------------------------------------
      const auditarPunto = prepararAuditoria(
        'PUNTO',
        'ELIMINAR',
        punto,
      );

      // ----------------------------------------------------
      // 4. ELIMINACIÓN LÓGICA
      // ----------------------------------------------------
      await punto.destroy({
        transaction,
      });

      // ----------------------------------------------------
      // 5. REGISTRAR AUDITORÍA
      // null representa la eliminación lógica del recurso.
      // El helper conserva el ID capturado anteriormente.
      // ----------------------------------------------------
      await auditarPunto(
        null,
        transaction,
        {
          motivo: `Eliminación de un punto de la versión #${versionId}.`,
        },
      );

      return {
        id_ruta_punto: pointId,
        deleted: true,
      };
    },
  );
};

module.exports = deleteRutaPuntoService;

// const { Op } = require('sequelize');
// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Utils
// const { validateId } = require('../../utils/rutas-service.utils');

// const getEditableVersion = require("../../utils/ruta-horario/ruta-punto.utils");

// // Modelos
// const { RutaPunto } = db;

// // ===============================================
// // SERVICE: Eliminar un punto de la ruta
// // ===============================================
// const deleteRutaPuntoService = async (
//     idVersion,
//     idPunto,
// ) => {
//     const versionId =
//         validateId(
//             idVersion,
//             'identificador de la versión',
//         );

//     const pointId =
//         validateId(
//             idPunto,
//             'identificador del punto',
//         );

//     await getEditableVersion(
//         versionId,
//     );

//     const punto =
//         await RutaPunto.findOne({
//             where: {
//                 id_ruta_punto:
//                     pointId,

//                 id_ruta_version:
//                     versionId,
//             },
//         });

//     if (!punto) {
//         throw new AppError(
//             'El punto no fue encontrado.',
//             404,
//             'ROUTE_POINT_NOT_FOUND',
//         );
//     }

//     await punto.destroy();

//     return {
//         id_ruta_punto:
//             pointId,

//         deleted: true,
//     };
// };

// module.exports = deleteRutaPuntoService;