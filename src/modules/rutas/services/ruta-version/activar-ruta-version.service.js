const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
  RutaVersion,
  RutaPunto,
  sequelize,
} = db;

// Auditoria
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');


// ===============================================
// SERVICE: Activar ruta version
// ===============================================
const activarRutaVersionService = async (idVersion) => {

  const id = validateId(idVersion, 'identificador de la versión');

  const transaction = await sequelize.transaction();

  try {
    const version =
      await RutaVersion.findByPk(
        id,
        {
          include: [
            {
              model: RutaPunto,
              as: 'puntos',
              where: {
                estado: true,
              },
              required: false,
            },
          ],

          transaction,
          lock:
            transaction.LOCK
              .UPDATE,
        },
      );

    if (!version) {
      throw new AppError(
        'La versión de la ruta no fue encontrada.',
        404,
        'ROUTE_VERSION_NOT_FOUND',
      );
    }

    if (version.vigente) {
      throw new AppError(
        'La versión ya se encuentra vigente.',
        409,
        'VERSION_ALREADY_CURRENT',
      );
    }

    const points = version.puntos || [];

    const hasStart = points.some(
      (point) => point.tipo_punto === 'INICIO',
    );

    const hasEnd = points.some((point) => point.tipo_punto === 'FINAL',
    );

    if (points.length < 2 || !hasStart || !hasEnd) {
      throw new AppError(
        'La versión debe tener como mínimo un punto inicial y uno final.',
        409,
        'ROUTE_POINTS_INCOMPLETE',
      );
    }

    // Auditoria
    const versionesAnteriores = await RutaVersion.findAll({
      where: {
        id_ruta: version.id_ruta,
        vigente: true,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const auditoresAnteriores = versionesAnteriores.map(item => ({
      version: item,

      auditar: prepararAuditoria(
        'VERSION',
        'DESACTIVAR_VIGENCIA',
        item,
      ),
    }));

    const auditarVersion = prepararAuditoria(
      'VERSION',
      'ACTIVAR_VERSION',
      version,
    );

    await RutaVersion.update(
      {
        vigente: false,
      },
      {
        where: {
          id_ruta: version.id_ruta,
          vigente: true,
        },

        transaction,
      },
    );

    await version.update(
      {
        vigente: true,
        estado: true,
      },
      {
        transaction,
      },
    );

    // Auditoria
    for (const item of auditoresAnteriores) {
      await item.version.reload({ transaction });

      await item.auditar(
        item.version,
        transaction,
      );
    }

    await auditarVersion(version, transaction);

    await transaction.commit();

    return version.reload({
      include: [
        {
          model: RutaPunto,
          as: 'puntos',
          where: {
            estado: true,
          },
          required: false,
        },
      ],
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = activarRutaVersionService;