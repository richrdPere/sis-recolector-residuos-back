const { randomUUID } = require('crypto');
const { UniqueConstraintError } = require('sequelize');
const { isIP } = require('net');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  RESULTADOS,
  TIPOS_ACTOR,
  ORIGENES,
} = require('../constants/auditoria.constants');

const {
  fallar,
  validarTexto,
  validarCodigo,
  validarOpcion,
  validarIdentificadorTecnico,
  validarIdEntidad,
  validarUuid,
  validarFechaDispositivo,
} = require('../validations/auditoria.validation');

const {
  obtenerActor,
  construirCambios,
  serializarEstable,
} = require('../utils/auditoria-service.utils');

const { AuditoriaEvento } = db;

// *********************************************************
// SERVICE: REGISTRAR EVENTO
// *********************************************************

const registrarAuditoriaService = async ({
  usuario = null,
  tipo_actor = 'USUARIO',

  modulo,
  accion,
  tipo_entidad = null,
  id_entidad = null,

  resultado = 'EXITOSO',

  anterior = {},
  posterior = {},
  camposPermitidos = [],

  motivo = null,
  codigo_resultado = null,

  contexto = {},
  clave_evento = randomUUID(),

  transaction = null,
}) => {
  const tipoActor = validarOpcion(
    tipo_actor,
    TIPOS_ACTOR,
    'tipo_actor',
    true,
  );

  const actor = tipoActor === 'USUARIO'
    ? obtenerActor(usuario)
    : { id: null, roles: [] };

  if (tipoActor !== 'USUARIO' && usuario !== null) {
    fallar('Los eventos de sistema o anónimos no deben recibir usuario.');
  }

  const entidad = validarCodigo(
    tipo_entidad,
    'tipo_entidad',
    80,
  );

  const entidadId = id_entidad === null
    ? null
    : validarIdEntidad(id_entidad);

  if (entidadId !== null && entidad === null) {
    fallar('id_entidad requiere tipo_entidad.');
  }

  const ip = validarTexto(contexto.ip, 'ip', 45);

  if (ip !== null && !isIP(ip)) {
    fallar('La dirección IP no es válida.');
  }

  const datos = {
    clave_evento: validarUuid(clave_evento),

    id_usuario: actor.id,
    tipo_actor: tipoActor,
    roles_actor: [...actor.roles].sort(),

    modulo: validarCodigo(modulo, 'modulo', 60, true),
    accion: validarCodigo(accion, 'accion', 80, true),

    tipo_entidad: entidad,
    id_entidad: entidadId,

    resultado: validarOpcion(
      resultado,
      RESULTADOS,
      'resultado',
      true,
    ),

    cambios: construirCambios({
      anterior,
      posterior,
      camposPermitidos,
    }),

    motivo: validarTexto(motivo, 'motivo', 1000),

    codigo_resultado: validarCodigo(
      codigo_resultado,
      'codigo_resultado',
      100,
    ),

    // La fecha del servidor siempre la determina el backend.
    fecha_servidor: new Date(),

    fecha_dispositivo: validarFechaDispositivo(
      contexto.fecha_dispositivo,
    ),

    origen: validarOpcion(
      contexto.origen ?? 'DESCONOCIDO',
      ORIGENES,
      'origen',
      true,
    ),

    request_id: validarIdentificadorTecnico(
      contexto.request_id,
      'request_id',
    ),

    clave_operacion: validarIdentificadorTecnico(
      contexto.clave_operacion,
      'clave_operacion',
    ),

    ip,

    user_agent: validarTexto(
      contexto.user_agent,
      'user_agent',
      1000,
    ),
  };

  // No se comparan la recepción ni el transporte de un reintento.
  const identidadEvento = evento => ({
    id_usuario: evento.id_usuario === null
      ? null
      : String(evento.id_usuario),

    tipo_actor: evento.tipo_actor,
    roles_actor: evento.roles_actor,
    modulo: evento.modulo,
    accion: evento.accion,
    tipo_entidad: evento.tipo_entidad,
    id_entidad: evento.id_entidad,
    resultado: evento.resultado,
    cambios: evento.cambios,
    motivo: evento.motivo,
    codigo_resultado: evento.codigo_resultado,
    fecha_dispositivo: evento.fecha_dispositivo,
    origen: evento.origen,
    clave_operacion: evento.clave_operacion,
  });

  const recuperarExistente = async () => {
    const existente = await AuditoriaEvento.findOne({
      where: {
        clave_evento: datos.clave_evento,
      },
      transaction,

      // Lectura actual en MySQL dentro de una transacción.
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });

    if (!existente) return null;

    const previo = existente.get({ plain: true });

    if (
      serializarEstable(identidadEvento(previo)) !==
      serializarEstable(identidadEvento(datos))
    ) {
      throw new AppError(
        'La clave del evento ya fue utilizada con otros datos.',
        409,
        'AUDITORIA_CLAVE_REUTILIZADA',
      );
    }

    return previo;
  };

  // Sin transaction se puede recuperar antes de intentar insertar.
  // Dentro de una transacción evitamos bloquear previamente una
  // clave inexistente, lo que puede provocar bloqueos entre reintentos.
  if (!transaction) {
    const existente = await recuperarExistente();

    if (existente) {
      return {
        evento: existente,
        duplicado: true,
      };
    }
  }

  try {
    const evento = await AuditoriaEvento.create(
      datos,
      { transaction },
    );

    return {
      evento: evento.get({ plain: true }),
      duplicado: false,
    };
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      throw error;
    }

    const existente = await recuperarExistente();

    if (!existente) throw error;

    return {
      evento: existente,
      duplicado: true,
    };
  }
};

module.exports = {
  registrarAuditoriaService,
};