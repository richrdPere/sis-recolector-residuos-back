const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Utils
const {
  validateId,
} = require('../../rutas/utils/rutas-service.utils');

// Auditoría
const {
  prepararAuditoria,
} = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Zona,
  Ruta,
  sequelize,
} = db;

// *********************************************************
// SERVICE: CAMBIAR ESTADO DE ZONA
// *********************************************************

const changeZonaEstadoService = async ({
  id_zona,
  estado,
}) => {
  const id = validateId(
    id_zona,
    'identificador de la zona',
  );

  if (typeof estado !== 'boolean') {
    throw new AppError(
      'El estado debe ser verdadero o falso.',
      400,
      'INVALID_ZONE_STATUS',
    );
  }

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

    if (zona.estado === estado) {
      throw new AppError(
        'La zona ya tiene el estado solicitado.',
        409,
        'ZONE_STATUS_NOT_CHANGED',
      );
    }

    // 2. Comprobar las restricciones de desactivación.
    if (!estado) {
      const activeRoutes = await Ruta.count({
        where: {
          id_zona: id,
          estado: true,
          estado_ruta: 'ACTIVA',
        },
        transaction,
      });

      if (activeRoutes > 0) {
        throw new AppError(
          'No se puede desactivar una zona con rutas activas.',
          409,
          'ZONE_HAS_ACTIVE_ROUTES',
        );
      }
    }

    // 3. Capturar el estado anterior.
    const auditarZona = prepararAuditoria(
      'ZONA',
      estado ? 'ACTIVAR' : 'DESACTIVAR',
      zona,
    );

    // 4. Actualizar zona.
    await zona.update(
      { estado },
      { transaction },
    );

    // 5. Registrar auditoría.
    await auditarZona(
      zona,
      transaction,
    );

    return zona;
  });
};

module.exports = changeZonaEstadoService;