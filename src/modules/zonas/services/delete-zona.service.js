const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Utils
const {
  validateId,
} = require('../../rutas/utils/rutas-service.utils');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Zona,
  Ruta,
  sequelize,
} = db;

// *********************************************************
// SERVICE: ELIMINAR ZONA
// *********************************************************

const deleteZonaService = async (idZona) => {
  const id = validateId(
    idZona,
    'identificador de la zona',
  );

  return sequelize.transaction(async transaction => {

    // 1. Obtener y bloquear la zona.
    const zona = await Zona.findByPk(
      id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!zona) {
      throw new AppError(
        'La zona no fue encontrada.',
        404,
        'ZONE_NOT_FOUND',
      );
    }

    // 2. Comprobar si contiene rutas.
    // Conserva el comportamiento actual:
    // las rutas eliminadas lógicamente no se cuentan.
    const routesCount = await Ruta.count({
      where: {
        id_zona: id,
      },
      transaction,
    });

    if (routesCount > 0) {
      throw new AppError(
        'No se puede eliminar una zona que contiene rutas.',
        409,
        'ZONE_HAS_ROUTES',
      );
    }

    // 3. Capturar los valores anteriores.
    const auditarZona = prepararAuditoria(
      'ZONA',
      'ELIMINAR',
      zona,
    );

    // 4. Eliminar según la configuración del modelo.
    await zona.destroy({
      transaction,
    });

    // 5. Registrar que dejó de estar disponible.
    // El helper conserva el identificador anterior.
    await auditarZona(
      null,
      transaction,
    );

    return {
      id_zona: id,
      deleted: true,
    };
  });
};

module.exports = deleteZonaService;