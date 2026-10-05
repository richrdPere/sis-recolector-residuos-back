const db = require('../../../database/models');

// Utils
const {
  CAMPOS_ACTUALIZACION,
  error,
  validarId,
  validarBody,
  validarIntervalo,
  prepararDatos,
} = require("../utils/mantenimientos.utils");

// Validation
const {
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
  validarDisponibilidad,
} = require("../validations/mantenimientos.validation");

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

  validarBody(body, CAMPOS_ACTUALIZACION);

  if (!Object.keys(body).length) {
    error('Debe proporcionar al menos un campo.');
  }

  const datos = prepararDatos(body);

  return sequelize.transaction(
    async (transaction) => {
      const actorId = await validarActor(
        usuarioId,
        transaction,
      );

      const { mantenimiento, vehiculo } =
        await bloquearOrden(id, transaction);

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

      if (mantenimiento.estado_mantenimiento === 'EN_PROCESO') {
        const restringidos = [
          'tipo_mantenimiento',
          'fecha_inicio_programada',
          'motivo',
        ];

        if (
          restringidos.some(
            (campo) =>
              Object.prototype.hasOwnProperty.call(
                datos,
                campo,
              ),
          )
        ) {
          error(
            'No puede modificar el tipo, motivo o inicio programado de una intervención iniciada.',
            409,
          );
        }
      }

      const anterior = mantenimiento.toJSON();

      mantenimiento.set(datos);

      const inicio = new Date(
        mantenimiento.fecha_inicio_programada,
      );

      const fin = new Date(
        mantenimiento.fecha_fin_programada,
      );

      validarIntervalo(inicio, fin);

      if (mantenimiento.estado_mantenimiento === 'PROGRAMADO') {
        await validarDisponibilidad({
          idVehiculo: vehiculo.id_vehiculo,
          inicio,
          fin,
          excluirId: id,
          transaction,
        });
      } else if (datos.fecha_fin_programada) {
        if (fin <= new Date()) {
          error(
            'La nueva fecha prevista de salida debe ser futura.',
          );
        }

        await validarDisponibilidad({
          idVehiculo: vehiculo.id_vehiculo,
          inicio: new Date(
            mantenimiento.fecha_inicio_real,
          ),
          fin,
          excluirId: id,
          transaction,
        });
      }

      await mantenimiento.save({ transaction });

      await registrarHistorial({
        mantenimiento,
        usuarioId: actorId,
        tipoEvento: 'ACTUALIZACION',
        anterior,
        transaction,
      });

      return obtenerDetalle(id, transaction);
    },
  );
};


module.exports = updateMantenimientoService;