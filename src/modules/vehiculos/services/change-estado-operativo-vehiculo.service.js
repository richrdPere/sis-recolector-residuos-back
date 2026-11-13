const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Auditoria
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

const {
  ESTADOS_MANUALES,
  validarCambioOperativo,
} = require('../utils/estado-operativo.utils');

const changeEstadoOperativoVehiculoService = async (
  idVehiculo,
  payload,
) => {
  // ------------------------------------------------------
  // 1. VALIDAR IDENTIFICADOR
  // ------------------------------------------------------
  const textoId = String(idVehiculo ?? '');
  const id = Number(textoId);

  if (
    !/^[1-9]\d*$/.test(textoId) ||
    !Number.isSafeInteger(id)
  ) {
    throw new AppError(
      'El identificador del vehículo no es válido.',
      400,
      'INVALID_VEHICLE_ID',
    );
  }

  // ------------------------------------------------------
  // 2. VALIDAR PAYLOAD
  // ------------------------------------------------------
  const camposPermitidos = [
    'estado_operativo',
    'observacion',
  ];

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    Object.keys(payload).some(
      campo => !camposPermitidos.includes(campo),
    )
  ) {
    throw new AppError(
      'Envía estado_operativo y, opcionalmente, observacion.',
      400,
      'INVALID_OPERATIONAL_PAYLOAD',
    );
  }

  const destino = payload.estado_operativo;

  if (!ESTADOS_MANUALES.includes(destino)) {
    throw new AppError(
      'Selecciona DISPONIBLE o FUERA_DE_SERVICIO. ' +
      'Los otros estados se gestionan desde sus módulos.',
      400,
      'INVALID_MANUAL_OPERATIONAL_STATUS',
    );
  }

  const observacion = payload.observacion;

  if (
    observacion != null &&
    (
      typeof observacion !== 'string' ||
      observacion.trim().length > 1000
    )
  ) {
    throw new AppError(
      'La observación debe ser texto de hasta 1000 caracteres.',
      400,
      'INVALID_OPERATIONAL_OBSERVATION',
    );
  }

  const motivo = observacion?.trim() || null;

  // ------------------------------------------------------
  // 3. CAMBIO Y AUDITORÍA TRANSACCIONALES
  // ------------------------------------------------------
  return db.sequelize.transaction(
    async transaction => {
      const vehiculo = await db.Vehiculo.findByPk(
        id,
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        },
      );

      if (!vehiculo) {
        throw new AppError(
          'El vehículo no fue encontrado.',
          404,
          'VEHICLE_NOT_FOUND',
        );
      }

      // Un reintento con el mismo estado no vuelve a escribir
      // ni genera otro evento de auditoría.
      if (vehiculo.estado_operativo === destino) {
        return vehiculo;
      }

      await validarCambioOperativo(
        vehiculo,
        destino,
        transaction,
      );

      const auditarVehiculo = prepararAuditoria(
        'VEHICULO',
        'CAMBIAR_ESTADO_OPERATIVO',
        vehiculo,
      );

      await vehiculo.update(
        {
          estado_operativo: destino,

          ...(observacion !== undefined
            ? { observacion: motivo }
            : {}),
        },
        {
          transaction,
        },
      );

      await vehiculo.reload({
        transaction,
      });

      await auditarVehiculo(
        vehiculo,
        transaction,
        {
          motivo,
        },
      );

      return vehiculo;
    },
  );
};

module.exports =
  changeEstadoOperativoVehiculoService;