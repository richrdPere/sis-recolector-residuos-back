const db = require('../../../database/models');

// Utils
const {
  error,
  validarId,
  validarBody,
  texto,
} = require('../utils/mantenimientos.utils');

// Validaciones
const {
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
} = require('../validations/mantenimientos.validation');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const { sequelize } = db;

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

  validarBody(body, [
    'motivo_cancelacion',
  ]);

  const motivo = texto(
    body.motivo_cancelacion,
    'motivo_cancelacion',
    true,
  );

  return sequelize.transaction(
    async (transaction) => {
      // ----------------------------------------------------
      // 1. VALIDAR ACTOR Y BLOQUEAR REGISTROS
      // ----------------------------------------------------
      const actorId = await validarActor(
        usuarioId,
        transaction,
      );

      const {
        mantenimiento,
      } = await bloquearOrden(id, transaction);

      // ----------------------------------------------------
      // 2. VALIDAR ESTADO
      // ----------------------------------------------------
      if (mantenimiento.estado_mantenimiento !== 'PROGRAMADO') {
        error(
          'Solo se pueden cancelar mantenimientos programados.',
          409,
        );
      }

      // ----------------------------------------------------
      // 3. CAPTURAR ESTADO ANTERIOR
      // Debe realizarse antes de set() o update().
      // ----------------------------------------------------
      const anterior = mantenimiento.toJSON();

      const auditarMantenimiento = prepararAuditoria(
        'MANTENIMIENTO',
        'CANCELAR',
        mantenimiento,
      );

      // ----------------------------------------------------
      // 4. CANCELAR MANTENIMIENTO
      // ----------------------------------------------------
      mantenimiento.set({
        estado_mantenimiento: 'CANCELADO',
        id_usuario_cancelacion: actorId,
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date(),
      });

      await mantenimiento.save({
        transaction,
      });

      // ----------------------------------------------------
      // 5. REGISTRAR HISTORIAL
      // ----------------------------------------------------
      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'CANCELACION',
        anterior,
        observacion: motivo,
        transaction,
      });

      // ----------------------------------------------------
      // 6. REGISTRAR AUDITORÍA
      // ----------------------------------------------------
      await auditarMantenimiento(
        mantenimiento,
        transaction,
        {
          // Auditoría admite hasta 1000 caracteres.
          // El motivo completo se conserva en la orden
          // y en su historial.
          motivo: motivo.slice(0, 1000),
        },
      );

      // ----------------------------------------------------
      // 7. DEVOLVER DETALLE
      // ----------------------------------------------------
      return obtenerDetalle(id, transaction);
    },
  );
};

module.exports = cancelarMantenimientoService;