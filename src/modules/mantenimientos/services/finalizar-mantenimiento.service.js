const { Op } = require('sequelize');
const db = require('../../../database/models');

// Utils
const {
  CAMPOS_FINALIZACION,
  error,
  validarId,
  validarBody,
  prepararDatos,
} = require('../utils/mantenimientos.utils');

// Validaciones
const {
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
  validarSinOperacionActiva,
} = require('../validations/mantenimientos.validation');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const { sequelize, VehiculoMantenimiento, } = db;

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

  validarBody(
    body,
    CAMPOS_FINALIZACION,
  );

  const datos = prepararDatos(body);

  if (
    typeof datos.vehiculo_operativo !== 'boolean'
  ) {
    error(
      'Debe indicar si el vehículo quedó operativo.',
    );
  }

  if (!datos.trabajos_realizados) {
    error(
      'Debe registrar los trabajos realizados.',
    );
  }

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
        vehiculo,
      } = await bloquearOrden(
        id,
        transaction,
      );

      // ----------------------------------------------------
      // 2. VALIDAR ESTADOS
      // ----------------------------------------------------
      if (
        mantenimiento.estado_mantenimiento !==
        'EN_PROCESO'
      ) {
        error(
          'Solo se puede finalizar una intervención en proceso.',
          409,
        );
      }

      if (
        vehiculo.estado_operativo !==
        'EN_MANTENIMIENTO'
      ) {
        error(
          'El vehículo ya no figura en mantenimiento. Revise su estado antes de finalizar.',
          409,
        );
      }

      const otraIntervencion =
        await VehiculoMantenimiento.findOne({
          where: {
            id_vehiculo: vehiculo.id_vehiculo,

            id_mantenimiento: {
              [Op.ne]: id,
            },

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

      // ----------------------------------------------------
      // 3. VALIDAR KILOMETRAJE
      // ----------------------------------------------------
      const ahora = new Date();

      const kilometrajeSalida =
        datos.kilometraje_salida ??
        mantenimiento.kilometraje_ingreso;

      const minimo = Math.max(
        Number(vehiculo.kilometraje),
        Number(mantenimiento.kilometraje_ingreso),
      );

      if (
        Number(kilometrajeSalida) < minimo
      ) {
        error(
          'El kilometraje de salida no puede ser menor al de ingreso ni al registrado en el vehículo.',
        );
      }

      // ----------------------------------------------------
      // 4. DETERMINAR EL ESTADO FINAL DEL VEHÍCULO
      // ----------------------------------------------------
      let nuevoEstado = 'FUERA_DE_SERVICIO';

      if (
        datos.vehiculo_operativo &&
        vehiculo.estado
      ) {
        const otraOrdenVigente =
          await VehiculoMantenimiento.findOne({
            where: {
              id_vehiculo: vehiculo.id_vehiculo,

              id_mantenimiento: {
                [Op.ne]: id,
              },

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

        nuevoEstado = otraOrdenVigente
          ? 'EN_MANTENIMIENTO'
          : 'DISPONIBLE';
      }

      // ----------------------------------------------------
      // 5. CAPTURAR ESTADOS ANTES DE MODIFICARLOS
      // ----------------------------------------------------
      const anterior = mantenimiento.toJSON();

      const auditarMantenimiento = prepararAuditoria(
        'MANTENIMIENTO',
        'FINALIZAR',
        mantenimiento,
      );

      const auditarVehiculo = prepararAuditoria(
        'VEHICULO',
        'CAMBIAR_ESTADO_POR_MANTENIMIENTO',
        vehiculo,
      );

      // ----------------------------------------------------
      // 6. FINALIZAR MANTENIMIENTO
      // ----------------------------------------------------
      mantenimiento.set({
        ...datos,

        kilometraje_salida: kilometrajeSalida,
        estado_mantenimiento: 'FINALIZADO',
        id_usuario_finalizacion: actorId,
        fecha_fin_real: ahora,
      });

      await mantenimiento.save({
        transaction,
      });

      // ----------------------------------------------------
      // 7. ACTUALIZAR VEHÍCULO
      // ----------------------------------------------------
      await vehiculo.update(
        {
          estado_operativo: nuevoEstado,
          kilometraje: kilometrajeSalida,
        },
        {
          transaction,
        },
      );

      // ----------------------------------------------------
      // 8. REGISTRAR HISTORIAL DE LA ORDEN
      // ----------------------------------------------------
      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'FINALIZACION',
        anterior,
        transaction,
      });

      // ----------------------------------------------------
      // 9. REGISTRAR AUDITORÍA GENERAL
      // ----------------------------------------------------
      await auditarMantenimiento(
        mantenimiento,
        transaction,
        {
          motivo:
            'Finalización de la intervención de mantenimiento.',
        },
      );

      await auditarVehiculo(
        vehiculo,
        transaction,
        {
          motivo:
            `Finalización del mantenimiento #${mantenimiento.id_mantenimiento}.`,
        },
      );

      // ----------------------------------------------------
      // 10. DEVOLVER DETALLE
      // ----------------------------------------------------
      return obtenerDetalle(
        id,
        transaction,
      );
    },
  );
};

module.exports = finalizarMantenimientoService;