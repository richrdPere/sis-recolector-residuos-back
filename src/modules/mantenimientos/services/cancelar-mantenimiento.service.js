const db = require('../../../database/models');

// Utils
const {
    error,
    validarId,
    validarBody,
    texto,
} = require("../utils/mantenimientos.utils");

// Validation
const {
    obtenerDetalle,
    validarActor,
    bloquearOrden,
    registrarHistorial,
} = require("../validations/mantenimientos.validation");

// Modelos
const {    sequelize} = db;

// *********************************************************
// SERVICE: CANCELAR MANTENIMIENTO
// *********************************************************
const cancelarMantenimientoService = async ({
  idMantenimiento,
  usuarioId,
  body,
}) => {
  const id = validarId(
    idMantenimiento,
    'ID del mantenimiento',
  );

  validarBody(body, ['motivo_cancelacion']);

  const motivo = texto(
    body.motivo_cancelacion,
    'motivo_cancelacion',
    true,
  );

  return sequelize.transaction(
    async (transaction) => {
      const actorId = await validarActor(
        usuarioId,
        transaction,
      );

      const { mantenimiento } =
        await bloquearOrden(id, transaction);

      if (mantenimiento.estado_mantenimiento !== 'PROGRAMADO') {
        error(
          'Solo se pueden cancelar mantenimientos programados.',
          409,
        );
      }

      const anterior = mantenimiento.toJSON();

      mantenimiento.set({
        estado_mantenimiento: 'CANCELADO',
        id_usuario_cancelacion: actorId,
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date(),
      });

      await mantenimiento.save({ transaction });

      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'CANCELACION',
        anterior,
        observacion: motivo,
        transaction,
      });

      return obtenerDetalle(id, transaction);
    },
  );
};

module.exports = cancelarMantenimientoService;