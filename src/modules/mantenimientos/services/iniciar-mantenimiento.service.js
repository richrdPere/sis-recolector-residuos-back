const db = require('../../../database/models');

// Utils
const {
  error,
  validarId,
  validarBody,
  prepararDatos,
} = require("../utils/mantenimientos.utils");

// Validation
const {
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
  validarDisponibilidad,
  validarSinOperacionActiva,
} = require("../validations/mantenimientos.validation");

// Modelos
const { sequelize } = db;

// *********************************************************
// SERVICE: INICIAR MANTENIMIENTO
// *********************************************************
const iniciarMantenimientoService = async ({
  idMantenimiento,
  usuarioId,
  body = {},
}) => {
  const id = validarId(
    idMantenimiento,
    'ID del mantenimiento',
  );

  validarBody(body, [
    'kilometraje_ingreso',
    'fecha_fin_programada',
  ]);

  const datos = prepararDatos(body);

  return sequelize.transaction(
    async (transaction) => {
      const actorId = await validarActor(
        usuarioId,
        transaction,
      );

      const { mantenimiento, vehiculo } =
        await bloquearOrden(id, transaction);

      if (mantenimiento.estado_mantenimiento !== 'PROGRAMADO') {
        error(
          'Solo se puede iniciar un mantenimiento programado.',
          409,
        );
      }

      if (!vehiculo.estado) {
        error('El vehículo está desactivado.', 409);
      }

      if (
        ['EN_RUTA', 'EN_MANTENIMIENTO'].includes(
          vehiculo.estado_operativo,
        )
      ) {
        error(
          'El estado actual del vehículo impide iniciar la intervención.',
          409,
        );
      }

      await validarSinOperacionActiva(
        vehiculo.id_vehiculo,
        transaction,
      );

      const ahora = new Date();

      const fin = datos.fecha_fin_programada ??
        new Date(mantenimiento.fecha_fin_programada);

      if (fin <= ahora) {
        error(
          'Debe indicar una fecha de fin programada posterior al momento actual.',
        );
      }

      await validarDisponibilidad({
        idVehiculo: vehiculo.id_vehiculo,
        inicio: ahora,
        fin,
        excluirId: id,
        transaction,
      });

      const kilometraje = datos.kilometraje_ingreso ??
        String(vehiculo.kilometraje);

      if (
        Number(kilometraje) <
        Number(vehiculo.kilometraje)
      ) {
        error(
          'El kilometraje de ingreso no puede ser menor al registrado en el vehículo.',
        );
      }

      const anterior = mantenimiento.toJSON();

      mantenimiento.set({
        estado_mantenimiento: 'EN_PROCESO',
        id_usuario_inicio: actorId,
        fecha_inicio_real: ahora,
        fecha_fin_programada: fin,
        kilometraje_ingreso: kilometraje,
      });

      await mantenimiento.save({ transaction });

      await vehiculo.update(
        {
          estado_operativo: 'EN_MANTENIMIENTO',
          kilometraje,
        },
        { transaction },
      );

      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'INICIO',
        anterior,
        transaction,
      });

      return obtenerDetalle(id, transaction);
    },
  );
};

module.exports = iniciarMantenimientoService;