const { createHash } = require('node:crypto');

const AppError = require('../../../utils/app-error');

const { registrarAuditoriaService } = require('../services/registrar-auditoria.service');

const { obtenerContextoAuditoria } = require('./auditoria-contexto.utils');

const { RECURSOS_AUDITORIA } = require('../constants/auditoria-recursos.constants');

// *********************************************************
// SERIALIZACIÓN ESTABLE
// *********************************************************

const normalizar = valor => {
  if (valor === undefined || valor === null) return null;

  if (valor instanceof Date) return valor.toISOString();

  if (typeof valor === 'bigint') return valor.toString();

  if (Array.isArray(valor)) {
    return valor.map(normalizar);
  }

  if (typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map(clave => [
          clave,
          normalizar(valor[clave]),
        ]),
    );
  }

  return valor;
};

const leer = (modelo, campo) => {
  if (!modelo) return null;

  const valor = typeof modelo.get === 'function'
    ? modelo.get(campo)
    : modelo[campo];

  return normalizar(valor);
};

const capturar = (configuracion, modelo) => {
  const foto = {
    existe: modelo !== null,
  };

  for (const campo of configuracion.campos) {
    const valor = leer(modelo, campo);

    // La geometría puede exceder el tamaño del evento.
    // Se registra una huella de su contenido.
    if (
      campo === 'geometria_geojson' ||
      campo === 'poligono_geojson'
    ) {
      foto[`${campo}_sha256`] = valor === null
        ? null
        : createHash('sha256')
          .update(JSON.stringify(valor))
          .digest('hex');

      continue;
    }

    // El registrar original admite valores simples y listas
    // de valores simples. Los objetos se guardan como texto JSON.
    foto[campo] = valor !== null &&
      typeof valor === 'object' &&
      !Array.isArray(valor)
      ? JSON.stringify(valor)
      : valor;
  }

  return foto;
};

// *********************************************************
// PREPARAR Y REGISTRAR CAMBIO
// *********************************************************

const prepararAuditoria = (
  recurso,
  accion,
  modeloAnterior = null,
  opcionesActor = {},
) => {
  const configuracion = RECURSOS_AUDITORIA[recurso];

  if (!configuracion) {
    throw new AppError(
      'El recurso de auditoría no está configurado.',
      500,
      'AUDITORIA_RECURSO_NO_CONFIGURADO',
    );
  }

  const contextoActor = obtenerContextoAuditoria(opcionesActor);

  // Copia independiente de la instancia de Sequelize.
  const anterior = capturar(configuracion, modeloAnterior);
  const idAnterior = leer(modeloAnterior, configuracion.id);

  return async (
    modeloPosterior,
    transaction,
    {
      clave_operacion = null,
      fecha_dispositivo = null,
      motivo = null,
    } = {},
  ) => {
    if (!transaction || transaction.finished) {
      throw new AppError(
        'El cambio y su auditoría requieren una transacción activa.',
        500,
        'AUDITORIA_TRANSACCION_REQUERIDA',
      );
    }

    const posterior = capturar(
      configuracion,
      modeloPosterior,
    );

    // Un cambio sin diferencias no genera otro evento.
    if (JSON.stringify(anterior) === JSON.stringify(posterior)) {
      return null;
    }

    const id = leer(modeloPosterior, configuracion.id) ??
      idAnterior;

    if (id === null) {
      throw new AppError(
        'No se pudo identificar la entidad auditada.',
        500,
        'AUDITORIA_ENTIDAD_REQUERIDA',
      );
    }

    return registrarAuditoriaService({
      ...contextoActor,

      modulo: configuracion.modulo,
      accion,

      tipo_entidad: configuracion.entidad,
      id_entidad: String(id),

      anterior,
      posterior,

      camposPermitidos: Object.keys(anterior),

      motivo,

      contexto: {
        ...contextoActor.contexto,
        clave_operacion,

        fecha_dispositivo:
          fecha_dispositivo instanceof Date
            ? fecha_dispositivo.toISOString()
            : fecha_dispositivo,
      },

      transaction,
    });
  };
};

module.exports = {
  prepararAuditoria,
};