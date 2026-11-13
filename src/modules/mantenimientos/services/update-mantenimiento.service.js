const db = require('../../../database/models');

// Utils
const {
  CAMPOS_ACTUALIZACION,
  error,
  validarId,
  validarBody,
  validarIntervalo,
  prepararDatos,
} = require('../utils/mantenimientos.utils');

// Validaciones
const {
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
  validarDisponibilidad,
} = require('../validations/mantenimientos.validation');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const { sequelize } = db;

// *********************************************************
// SERVICE: ACTUALIZAR MANTENIMIENTO
// *********************************************************
const updateMantenimientoService = async ({
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
    CAMPOS_ACTUALIZACION,
  );

  if (!Object.keys(body).length) {
    error(
      'Debe proporcionar al menos un campo.',
    );
  }

  const datos = prepararDatos(body);

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
      // 2. VALIDAR ESTADO
      // ----------------------------------------------------
      if (
        !['PROGRAMADO', 'EN_PROCESO'].includes(
          mantenimiento.estado_mantenimiento,
        )
      ) {
        error(
          'Solo se pueden actualizar órdenes programadas o en proceso.',
          409,
        );
      }

      const enProceso =
        mantenimiento.estado_mantenimiento ===
        'EN_PROCESO';

      if (enProceso) {
        const restringidos = [
          'tipo_mantenimiento',
          'fecha_inicio_programada',
          'motivo',
        ];

        const incluyeRestringidos = restringidos.some(
          (campo) =>
            Object.prototype.hasOwnProperty.call(
              datos,
              campo,
            ),
        );

        if (incluyeRestringidos) {
          error(
            'No puede modificar el tipo, motivo o inicio programado de una intervención iniciada.',
            409,
          );
        }
      }

      // ----------------------------------------------------
      // 3. CAPTURAR ESTADO ANTERIOR
      // Siempre antes de set(), update() o save().
      // ----------------------------------------------------
      const anterior = mantenimiento.toJSON();

      const auditarMantenimiento = prepararAuditoria(
        'MANTENIMIENTO',
        'ACTUALIZAR',
        mantenimiento,
      );

      // Aplicar en memoria para validar los valores finales.
      mantenimiento.set(datos);

      // ----------------------------------------------------
      // 4. VALIDAR FECHAS
      // ----------------------------------------------------
      const inicio = new Date(mantenimiento.fecha_inicio_programada);

      const fin = new Date(mantenimiento.fecha_fin_programada);

      if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime())) {
        error(
          'Las fechas programadas del mantenimiento no son válidas.',
        );
      }

      validarIntervalo(
        inicio,
        fin,
      );

      // ----------------------------------------------------
      // 5. VALIDAR DISPONIBILIDAD
      // ----------------------------------------------------
      if (!enProceso) {
        await validarDisponibilidad({
          idVehiculo: vehiculo.id_vehiculo,
          inicio,
          fin,
          excluirId: id,
          transaction,
        });
      } else if (
        Object.prototype.hasOwnProperty.call(
          datos,
          'fecha_fin_programada',
        )
      ) {
        const ahora = new Date();

        if (fin.getTime() <= ahora.getTime()) {
          error(
            'La nueva fecha prevista de salida debe ser futura.',
          );
        }

        const inicioReal = mantenimiento.fecha_inicio_real == null
          ? null
          : new Date(
            mantenimiento.fecha_inicio_real,
          );

        if (
          !inicioReal ||
          !Number.isFinite(inicioReal.getTime())
        ) {
          error(
            'La intervención no tiene una fecha de inicio real válida.',
            409,
          );
        }

        await validarDisponibilidad({
          idVehiculo: vehiculo.id_vehiculo,
          inicio: inicioReal,
          fin,
          excluirId: id,
          transaction,
        });
      }

      // ----------------------------------------------------
      // 6. OMITIR ESCRITURAS SI NO HAY CAMBIOS
      // ----------------------------------------------------
      if (!mantenimiento.changed()) {
        return obtenerDetalle(
          id,
          transaction,
        );
      }

      // ----------------------------------------------------
      // 7. GUARDAR CAMBIOS
      // ----------------------------------------------------
      await mantenimiento.save({
        transaction,
      });

      // ----------------------------------------------------
      // 8. REGISTRAR HISTORIAL
      // ----------------------------------------------------
      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'ACTUALIZACION',
        anterior,
        transaction,
      });

      // ----------------------------------------------------
      // 9. REGISTRAR AUDITORÍA
      // ----------------------------------------------------
      await auditarMantenimiento(
        mantenimiento,
        transaction,
        {
          motivo:
            'Actualización de la información del mantenimiento.',
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

module.exports = updateMantenimientoService;