const AppError = require('../../../utils/app-error');
const db = require('../../../database/models');

// Modelos
const {
  Incidencia,
  Recorrido,
  ProgramacionRuta,
  Ruta,
  Zona,
} = db;

// Validations
const { validarId } = require('../validations/incidencia.validations');

// Utils
const {
  esTerminal,
  construirIncludesIncidencia,
} = require('./incidencia.utils');

// Dependencias de autorización
const { obtenerPoliticaIncidencias } = require('./incidencias.dependencies');

// ==========================================================
// VALIDAR METADATA DEL USUARIO AUTENTICADO
// ==========================================================

const validateActor = (metadata) => {
  if (!metadata || metadata.id_usuario == null) {
    throw new AppError(
      'Se requiere una sesión autenticada.',
      401,
      'UNAUTHENTICATED',
    );
  }

  return {
    ...metadata,

    id_usuario: validarId(
      metadata.id_usuario,
      'id_usuario',
    ),
  };
};

// ==========================================================
// AUTORIZAR OPERACIÓN
// ==========================================================

const authorizeIncidencia = async (
  accion,
  actor,
  contexto = {},
) => {
  const { autorizar } =
    obtenerPoliticaIncidencias();

  const permitido = await autorizar({
    accion,
    actor,
    ...contexto,
  });

  if (permitido !== true) {
    throw new AppError(
      'No tiene permiso para esta operación.',
      403,
      'FORBIDDEN',
    );
  }
};

// ==========================================================
// ALCANCE DEL LISTADO
// ==========================================================

const getIncidenciasScope = async (actor) => {
  const { obtenerAlcance } =
    obtenerPoliticaIncidencias();

  const alcance = await obtenerAlcance({
    actor,
  });

  if (
    !alcance ||
    typeof alcance !== 'object' ||
    Array.isArray(alcance)
  ) {
    throw new AppError(
      'La política debe devolver un objeto where de alcance.',
      500,
      'INVALID_AUTHORIZATION_SCOPE',
    );
  }

  return alcance;
};

// ==========================================================
// BUSCAR INCIDENCIA
// ==========================================================

const findIncidenciaOrFail = async (
  id,
  transaction,
  bloquear = false,
) => {
  const incidencia = await Incidencia.findByPk(id, {
    transaction,

    ...(bloquear
      ? { lock: transaction.LOCK.UPDATE }
      : {}),
  });

  if (!incidencia) {
    throw new AppError(
      'La incidencia no existe.',
      404,
      'INCIDENCIA_NOT_FOUND',
    );
  }

  return incidencia;
};

// ==========================================================
// VALIDAR HABILITACIÓN
// ==========================================================

const ensureIncidenciaEnabled = (incidencia) => {
  if (!incidencia.estado) {
    throw new AppError(
      'La incidencia está deshabilitada.',
      409,
      'INCIDENCIA_DISABLED',
    );
  }
};

// ==========================================================
// VALIDAR QUE CONTINÚE ABIERTA
// ==========================================================

const ensureIncidenciaOpen = (incidencia) => {
  ensureIncidenciaEnabled(incidencia);

  if (esTerminal(incidencia.estado_incidencia)) {
    throw new AppError(
      'La incidencia ya está cerrada.',
      409,
      'INCIDENCIA_CLOSED',
    );
  }
};

// ==========================================================
// BUSCAR REFERENCIA HABILITADA
// ==========================================================

const findEnabledReference = async (
  Modelo,
  id,
  nombre,
  transaction,
) => {
  const registro = await Modelo.findByPk(id, {
    transaction,
  });

  if (!registro || registro.estado === false) {
    throw new AppError(
      `${nombre} no existe o está deshabilitado.`,
      400,
      'INVALID_REFERENCE',
    );
  }

  return registro;
};

// ==========================================================
// VALIDAR COHERENCIA DE REFERENCIAS
// ==========================================================

const assertContextReference = (
  enviado,
  derivado,
  campo,
) => {
  if (
    enviado != null &&
    String(enviado) !== String(derivado)
  ) {
    throw new AppError(
      `El campo ${campo} no corresponde al contexto seleccionado.`,
      409,
      'INCIDENCIA_CONTEXT_MISMATCH',
    );
  }
};

// ==========================================================
// RESOLVER RECORRIDO, RUTA Y ZONA
// ==========================================================

const resolveIncidenciaContext = async (
  data,
  transaction,
) => {
  let recorrido = null;
  let programacion = null;
  let ruta = null;
  let zona = null;

  let idRuta = data.id_ruta;
  let idZona = data.id_zona;

  if (data.id_recorrido) {
    recorrido = await findEnabledReference(
      Recorrido,
      data.id_recorrido,
      'El recorrido',
      transaction,
    );

    programacion = await findEnabledReference(
      ProgramacionRuta,
      recorrido.id_programacion,
      'La programación',
      transaction,
    );

    assertContextReference(
      idRuta,
      programacion.id_ruta,
      'id_ruta',
    );

    idRuta = String(programacion.id_ruta);
  }

  if (idRuta) {
    ruta = await findEnabledReference(
      Ruta,
      idRuta,
      'La ruta',
      transaction,
    );

    assertContextReference(
      idZona,
      ruta.id_zona,
      'id_zona',
    );

    idZona = String(ruta.id_zona);
  }

  if (idZona) {
    zona = await findEnabledReference(
      Zona,
      idZona,
      'La zona',
      transaction,
    );
  }

  return {
    ids: {
      id_recorrido: data.id_recorrido,
      id_ruta: idRuta,
      id_zona: idZona,
    },

    recorrido,
    programacion,
    ruta,
    zona,
  };
};

// ==========================================================
// CONSULTAR DETALLE INTERNO
// Usar después de autorizar la operación.
// ==========================================================

const getIncidenciaDetail = async (
  id,
  transaction,
) => {
  const incidencia = await Incidencia.findByPk(id, {
    transaction,
    include: construirIncludesIncidencia(true),
  });

  if (!incidencia) {
    throw new AppError(
      'La incidencia no existe.',
      404,
      'INCIDENCIA_NOT_FOUND',
    );
  }

  return incidencia.get({ plain: true });
};

module.exports = {
  validateActor,
  authorizeIncidencia,
  getIncidenciasScope,
  findIncidenciaOrFail,
  ensureIncidenciaEnabled,
  ensureIncidenciaOpen,
  findEnabledReference,
  resolveIncidenciaContext,
  getIncidenciaDetail,
};