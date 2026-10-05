const { Op } = require('sequelize');
const db = require('../../../database/models');

// Utils
const {
  CAMPOS_FINALIZACION,
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
  validarSinOperacionActiva,
} = require("../validations/mantenimientos.validation");

// Modelos
const {
  sequelize,
  VehiculoMantenimiento,
} = db;

// *********************************************************
// SERVICE: FINALIZAR MANTENIMIENTO
// *********************************************************
const finalizarMantenimientoService = async ({
  idMantenimiento,
  usuarioId,
  body,
}) => {
  const id = validarId(
    idMantenimiento,
    'ID del mantenimiento',
  );

  validarBody(body, CAMPOS_FINALIZACION);

  const datos = prepararDatos(body);

  if (typeof datos.vehiculo_operativo !== 'boolean') {
    error('Debe indicar si el vehículo quedó operativo.');
  }

  if (!datos.trabajos_realizados) {
    error('Debe registrar los trabajos realizados.');
  }

  return sequelize.transaction(
    async (transaction) => {
      const actorId = await validarActor(
        usuarioId,
        transaction,
      );

      const { mantenimiento, vehiculo } =
        await bloquearOrden(id, transaction);

      if (mantenimiento.estado_mantenimiento !== 'EN_PROCESO') {
        error(
          'Solo se puede finalizar una intervención en proceso.',
          409,
        );
      }

      if (vehiculo.estado_operativo !== 'EN_MANTENIMIENTO') {
        error(
          'El vehículo ya no figura en mantenimiento. Revise su estado antes de finalizar.',
          409,
        );
      }

      const otraIntervencion =
        await VehiculoMantenimiento.findOne({
          where: {
            id_vehiculo: vehiculo.id_vehiculo,
            id_mantenimiento: { [Op.ne]: id },
            estado_mantenimiento: 'EN_PROCESO',
          },

          transaction,
        });

      if (otraIntervencion) {
        error(
          'Existe otra intervención abierta para este vehículo.',
          409,
        );
      }

      await validarSinOperacionActiva(
        vehiculo.id_vehiculo,
        transaction,
      );

      const ahora = new Date();

      const kilometrajeSalida =
        datos.kilometraje_salida ??
        mantenimiento.kilometraje_ingreso;

      const minimo = Math.max(
        Number(vehiculo.kilometraje),
        Number(mantenimiento.kilometraje_ingreso),
      );

      if (Number(kilometrajeSalida) < minimo) {
        error(
          'El kilometraje de salida no puede ser menor al de ingreso ni al registrado en el vehículo.',
        );
      }

      const anterior = mantenimiento.toJSON();

      mantenimiento.set({
        ...datos,

        kilometraje_salida: kilometrajeSalida,
        estado_mantenimiento: 'FINALIZADO',
        id_usuario_finalizacion: actorId,
        fecha_fin_real: ahora,
      });

      await mantenimiento.save({ transaction });

      let nuevoEstado = 'FUERA_DE_SERVICIO';

      if (datos.vehiculo_operativo && vehiculo.estado) {
        const otraOrdenVigente =
          await VehiculoMantenimiento.findOne({
            where: {
              id_vehiculo: vehiculo.id_vehiculo,
              id_mantenimiento: { [Op.ne]: id },

              estado_mantenimiento: 'PROGRAMADO',

              fecha_inicio_programada: {
                [Op.lte]: ahora,
              },

              fecha_fin_programada: {
                [Op.gt]: ahora,
              },
            },

            transaction,
          });

        // No habilita una unidad cuyo siguiente
        // mantenimiento ya está dentro de su intervalo.
        nuevoEstado = otraOrdenVigente
          ? 'EN_MANTENIMIENTO'
          : 'DISPONIBLE';
      }

      await vehiculo.update(
        {
          estado_operativo: nuevoEstado,
          kilometraje: kilometrajeSalida,
        },
        { transaction },
      );

      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'FINALIZACION',
        anterior,
        transaction,
      });

      return obtenerDetalle(id, transaction);
    },
  );
};

module.exports = finalizarMantenimientoService;