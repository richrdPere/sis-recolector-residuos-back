const db = require('../../../../database/models');

// Validation
const { validateId } = require('../../validations/dispositivo.validation');

// Modelos
const {
  UsuarioDispositivo,
} = db;

// =======================================================
// Service: Obtener mi dispositivo
// =======================================================
const getMyDevicesService = async (idUsuario) => {
  const userId =
    validateId(
      idUsuario,
      'identificador del usuario',
    );

  const devices =
    await UsuarioDispositivo
      .findAll({
        where: {
          id_usuario:
            userId,
        },

        attributes: [
          'id_dispositivo',
          'id_usuario',
          'identificador_dispositivo',
          'plataforma',
          'nombre_dispositivo',
          'modelo_dispositivo',
          'version_sistema',
          'version_aplicacion',
          'permiso_notificaciones',
          'estado_dispositivo',
          'fecha_registro_token',
          'fecha_ultima_actividad',
          'fecha_desactivacion',
          'motivo_desactivacion',
          'created_at',
          'updated_at',
        ],

        order: [
          [
            'fecha_ultima_actividad',
            'DESC',
          ],
        ],
      });

  return devices;
};

module.exports = getMyDevicesService;