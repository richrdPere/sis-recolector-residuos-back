const { Op } = require('sequelize');

const AppError = require('../../../utils/app-error');

const {
  MODULOS_SUPERVISOR,
  ATRIBUTOS_LISTADO,
  ATRIBUTOS_DETALLE,
} = require('../constants/auditoria.constants');

const {
  esObjeto,
  fallar,
  validarId,
} = require('../validations/auditoria.validation');

// *********************************************************
// ACTOR Y AUTORIZACIÓN
// *********************************************************

const obtenerActor = usuario => {
  if (!usuario || typeof usuario !== 'object') {
    throw new AppError(
      'Debe iniciar sesión.',
      401,
      'AUTH_REQUIRED',
    );
  }

  const id = validarId(
    usuario.id_usuario ?? usuario.idUsuario ?? usuario.id,
    'id_usuario',
  );

  const roles = Array.isArray(usuario.roles)
    ? [...new Set(
      usuario.roles
        .map(rol =>
          typeof rol === 'string'
            ? rol
            : rol?.nombre
        )
        .filter(rol =>
          typeof rol === 'string' &&
          rol.trim().length > 0
        ),
    )]
    : [];

  return { id, roles };
};

const autorizarConsultaAuditoria = usuario => {
  const actor = obtenerActor(usuario);

  const accesoCompleto = actor.roles.some(rol =>
    ['SUPER_ADMIN', 'ADMIN'].includes(rol)
  );

  if (
    !accesoCompleto &&
    !actor.roles.includes('SUPERVISOR')
  ) {
    throw new AppError(
      'No tiene permisos para consultar auditoría.',
      403,
      'AUDITORIA_ACCESO_DENEGADO',
    );
  }

  return {
    ...actor,
    accesoCompleto,
  };
};

// *********************************************************
// CAMBIOS AUDITABLES
// *********************************************************

const campoSensible = campo => {
  const normalizado = campo.replace(/[^a-z0-9]/gi, '');

  return /password|contrasena|claveacceso|token|secret|authorization|cookie|credencial|hash/i
    .test(normalizado);
};

const convertirValor = valor => {
  if (valor === undefined || valor === null) return null;

  if (valor instanceof Date) {
    if (!Number.isFinite(valor.getTime())) {
      fallar('Los cambios contienen una fecha inválida.');
    }

    return valor.toISOString();
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      fallar('Los cambios contienen un número inválido.');
    }

    return valor;
  }

  if (typeof valor === 'bigint') {
    return valor.toString();
  }

  if (
    typeof valor === 'boolean' ||
    typeof valor === 'string'
  ) {
    return valor;
  }

  fallar(
    'Los campos auditables deben ser valores simples o listas de valores simples.',
  );
};

const normalizarValor = valor => {
  if (Array.isArray(valor)) {
    if (valor.length > 200) {
      fallar('Una lista auditable supera los 200 elementos.');
    }

    return valor.map(convertirValor);
  }

  return convertirValor(valor);
};

const construirCambios = ({
  anterior = {},
  posterior = {},
  camposPermitidos = [],
}) => {
  if (
    !esObjeto(anterior) ||
    !esObjeto(posterior) ||
    !Array.isArray(camposPermitidos)
  ) {
    fallar('La configuración de cambios no es válida.');
  }

  if (camposPermitidos.length > 100) {
    fallar('No se pueden auditar más de 100 campos por evento.');
  }

  const cambios = {};

  for (const campo of new Set(camposPermitidos)) {
    if (
      typeof campo !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(campo) ||
      campoSensible(campo)
    ) {
      fallar('La lista de campos auditables contiene un campo no permitido.');
    }

    const antes = normalizarValor(anterior[campo]);
    const despues = normalizarValor(posterior[campo]);

    if (JSON.stringify(antes) !== JSON.stringify(despues)) {
      cambios[campo] = {
        anterior: antes,
        posterior: despues,
      };
    }
  }

  if (Buffer.byteLength(JSON.stringify(cambios), 'utf8') > 32768) {
    fallar('Los cambios de auditoría superan los 32 KB.');
  }

  return Object.keys(cambios).length ? cambios : null;
};

// *********************************************************
// CONSULTAS
// *********************************************************

const construirWhere = (validado, acceso) => {
  const {
    fecha_inicio,
    fecha_fin,
    ...filtros
  } = validado.filtros;

  const condiciones = [
    filtros,
    {
      fecha_servidor: {
        [Op.gte]: validado.desde,
        [Op.lt]: validado.hasta,
      },
    },
  ];

  if (!acceso.accesoCompleto) {
    condiciones.push({
      modulo: {
        [Op.in]: MODULOS_SUPERVISOR,
      },
    });
  }

  return {
    [Op.and]: condiciones,
  };
};

const atributosConsulta = (acceso, detalle = false) => {
  if (detalle && acceso.accesoCompleto) {
    return [...ATRIBUTOS_DETALLE];
  }

  return [...ATRIBUTOS_LISTADO];
};

// Comparación estable para comprobar una clave_evento reutilizada.
const serializarEstable = valor => {
  if (valor instanceof Date) {
    return JSON.stringify(valor.toISOString());
  }

  if (Array.isArray(valor)) {
    return `[${valor.map(serializarEstable).join(',')}]`;
  }

  if (valor !== null && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map(clave =>
      `${JSON.stringify(clave)}:${serializarEstable(valor[clave])}`
    ).join(',')}}`;
  }

  return JSON.stringify(valor);
};

module.exports = {
  obtenerActor,
  autorizarConsultaAuditoria,
  construirCambios,
  construirWhere,
  atributosConsulta,
  serializarEstable,
};