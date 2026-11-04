const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const crearAvisoCiudadano = require(
  '../../notificaciones/services/ciudadanos/crear-aviso-ciudadano.service',
);

const ESTADOS_PUBLICABLES = new Set([
  'EN_REVISION',
  'EN_ATENCION',
]);

const publicarAvisoIncidencia = async ({
  idIncidencia,
  idUsuario,
}) => {
  if (!/^[1-9]\d*$/.test(String(idIncidencia))) {
    throw new AppError(
      'El identificador de la incidencia no es válido.',
      400,
      'INVALID_INCIDENT_ID',
    );
  }

  return db.sequelize.transaction(async (transaction) => {
    const incidencia = await db.Incidencia.findByPk(idIncidencia, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!incidencia || !incidencia.estado) {
      throw new AppError(
        'No se encontró una incidencia habilitada.',
        404,
        'INCIDENT_NOT_FOUND',
      );
    }

    if (!ESTADOS_PUBLICABLES.has(incidencia.estado_incidencia)) {
      throw new AppError(
        'La incidencia debe estar en revisión o en atención.',
        409,
        'INCIDENT_NOT_PUBLISHABLE',
      );
    }

    const idRuta = incidencia.id_ruta;
    const idZona = idRuta == null ? incidencia.id_zona : null;

    if (idRuta == null && idZona == null) {
      throw new AppError(
        'Asocia la incidencia con una ruta o zona antes de publicar.',
        409,
        'INCIDENT_SCOPE_REQUIRED',
      );
    }

    return crearAvisoCiudadano({
      evento: 'INCIDENCIA',
      idRuta,
      idZona,
      tipoEntidad: 'INCIDENCIA',
      idEntidad: incidencia.id_incidencia,
      claveEvento: `INCIDENCIA_PUBLICA:${incidencia.id_incidencia}`,
      titulo: 'Incidencia en el servicio de recolección',
      mensaje: idRuta != null
        ? 'Una incidencia afecta el servicio de tu ruta. '
        + 'Consulta el calendario de tu domicilio para ver el estado del servicio.'
        : 'Una incidencia afecta el servicio de tu sector. '
        + 'Consulta los avisos de recolección en la aplicación.',
      datos: {
        destino_app: 'CALENDARIO',
      },
      idUsuarioCreacion: idUsuario,
      transaction,
    });
  });
};

module.exports = publicarAvisoIncidencia;