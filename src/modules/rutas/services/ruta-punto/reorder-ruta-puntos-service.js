const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

const getEditableVersion = require("../../utils/ruta-horario/ruta-punto.utils");

// Modelos
const {
  RutaPunto,
  sequelize,
} = db;

// ===============================================
// SERVICE: Reordenar los puntos de la ruta
// ===============================================
const reorderRutaPuntosService = async (
  idVersion,
  puntos,
) => {
  const versionId =
    validateId(
      idVersion,
      'identificador de la versión',
    );

  if (
    !Array.isArray(puntos) ||
    !puntos.length
  ) {
    throw new AppError(
      'Debe proporcionar los puntos que serán reordenados.',
      400,
      'ROUTE_POINTS_REQUIRED',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    await getEditableVersion(
      versionId,
      transaction,
    );

    const existingPoints =
      await RutaPunto.findAll({
        where: {
          id_ruta_version:
            versionId,

          estado: true,
        },

        transaction,
      });

    if (
      existingPoints.length !==
      puntos.length
    ) {
      throw new AppError(
        'Debe enviar todos los puntos activos de la versión.',
        400,
        'ALL_ROUTE_POINTS_REQUIRED',
      );
    }

    const ids =
      puntos.map((item) =>
        Number(
          item.id_ruta_punto,
        ),
      );

    const orders =
      puntos.map((item) =>
        Number(item.orden),
      );

    if (
      new Set(ids).size !==
      ids.length ||
      new Set(orders).size !==
      orders.length ||
      orders.some(
        (order) =>
          !Number.isInteger(
            order,
          ) ||
          order < 1,
      )
    ) {
      throw new AppError(
        'Los identificadores y órdenes deben ser únicos y válidos.',
        400,
        'INVALID_ROUTE_POINT_ORDER',
      );
    }

    const existingIds =
      new Set(
        existingPoints.map(
          (item) =>
            Number(
              item.id_ruta_punto,
            ),
        ),
      );

    if (
      ids.some(
        (id) =>
          !existingIds.has(id),
      )
    ) {
      throw new AppError(
        'Uno o más puntos no pertenecen a la versión.',
        400,
        'ROUTE_POINT_VERSION_MISMATCH',
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Primera fase: órdenes temporales
    |--------------------------------------------------------------------------
    */

    for (
      let index = 0;
      index < puntos.length;
      index += 1
    ) {
      await RutaPunto.update(
        {
          orden:
            1000000 + index,
        },
        {
          where: {
            id_ruta_punto:
              ids[index],
          },

          transaction,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Segunda fase: órdenes definitivos
    |--------------------------------------------------------------------------
    */

    for (
      const item of puntos
    ) {
      await RutaPunto.update(
        {
          orden:
            Number(
              item.orden,
            ),
        },
        {
          where: {
            id_ruta_punto:
              Number(
                item.id_ruta_punto,
              ),
          },

          transaction,
        },
      );
    }

    await transaction.commit();

    return RutaPunto.findAll({
      where: {
        id_ruta_version:
          versionId,

        estado: true,
      },

      order: [
        ['orden', 'ASC'],
      ],
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = reorderRutaPuntosService;