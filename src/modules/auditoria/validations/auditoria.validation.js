const AppError = require('../../../utils/app-error');

const {
  RESULTADOS,
  TIPOS_ACTOR,
  ORIGENES,
} = require('../constants/auditoria.constants');

// *********************************************************
// UTILIDADES DE VALIDACIÓN
// *********************************************************

const fallar = mensaje => {
  throw new AppError(
    mensaje,
    400,
    'AUDITORIA_DATOS_INVALIDOS',
  );
};

const esObjeto = valor =>
  valor !== null &&
  typeof valor === 'object' &&
  (
    Object.getPrototypeOf(valor) === Object.prototype ||
    Object.getPrototypeOf(valor) === null
  );

const validarId = (valor, campo = 'id') => {
  if (
    typeof valor !== 'string' &&
    typeof valor !== 'number'
  ) {
    fallar(`${campo} no es válido.`);
  }

  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    fallar(`${campo} debe enviarse como texto si supera el rango seguro.`);
  }

  const texto = String(valor);

  if (
    !/^[1-9]\d*$/.test(texto) ||
    texto.length > 19 ||
    BigInt(texto) > 9223372036854775807n
  ) {
    fallar(`${campo} no es válido.`);
  }

  return texto;
};

const validarTexto = (
  valor,
  campo,
  maximo,
  obligatorio = false,
) => {
  if (valor === null || valor === undefined) {
    if (obligatorio) fallar(`${campo} es obligatorio.`);
    return null;
  }

  if (typeof valor !== 'string') {
    fallar(`${campo} debe ser un texto.`);
  }

  const texto = valor.trim();

  if (!texto || texto.length > maximo) {
    fallar(`${campo} debe contener entre 1 y ${maximo} caracteres.`);
  }

  return texto;
};

const validarCodigo = (
  valor,
  campo,
  maximo,
  obligatorio = false,
) => {
  const texto = validarTexto(
    valor,
    campo,
    maximo,
    obligatorio,
  );

  if (texto !== null && !/^[A-Z][A-Z0-9_]*$/.test(texto)) {
    fallar(`${campo} debe utilizar mayúsculas, números y guiones bajos.`);
  }

  return texto;
};

const validarOpcion = (
  valor,
  opciones,
  campo,
  obligatorio = false,
) => {
  const texto = validarTexto(
    valor,
    campo,
    60,
    obligatorio,
  );

  if (texto !== null && !opciones.includes(texto)) {
    fallar(`${campo} no es válido.`);
  }

  return texto;
};

const validarIdentificadorTecnico = (valor, campo) => {
  const texto = validarTexto(valor, campo, 128);

  if (texto !== null && !/^[\x21-\x7E]+$/.test(texto)) {
    fallar(`${campo} contiene caracteres no permitidos.`);
  }

  return texto;
};

const validarIdEntidad = valor => {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    fallar('id_entidad debe enviarse como texto.');
  }

  if (
    typeof valor !== 'string' &&
    typeof valor !== 'number'
  ) {
    fallar('id_entidad no es válido.');
  }

  return validarTexto(
    String(valor),
    'id_entidad',
    128,
    true,
  );
};

const validarUuid = valor => {
  const texto = validarTexto(
    valor,
    'clave_evento',
    36,
    true,
  );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(texto)
  ) {
    fallar('clave_evento debe ser un UUID versión 4.');
  }

  return texto.toLowerCase();
};

const validarFechaDispositivo = valor => {
  if (valor === null || valor === undefined) return null;

  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i
      .test(valor)
  ) {
    fallar('fecha_dispositivo debe ser una fecha ISO con zona horaria.');
  }

  const fecha = new Date(valor);

  if (!Number.isFinite(fecha.getTime())) {
    fallar('fecha_dispositivo no es válida.');
  }

  return fecha;
};

// *********************************************************
// FILTROS
// *********************************************************

const validarFiltrosAuditoria = (query = {}) => {
  if (!esObjeto(query)) {
    fallar('Los filtros no son válidos.');
  }

  const permitidos = new Set([
    'fecha_inicio',
    'fecha_fin',
    'id_usuario',
    'tipo_actor',
    'modulo',
    'accion',
    'tipo_entidad',
    'id_entidad',
    'resultado',
    'origen',
    'request_id',
    'clave_operacion',
    'page',
    'limit',
    'sort_order',
  ]);

  for (const campo of Object.keys(query)) {
    if (!permitidos.has(campo)) {
      fallar(`El filtro ${campo} no está permitido.`);
    }
  }

  const fechaCivil = (valor, campo) => {
    if (
      typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
      fallar(`${campo} debe tener formato YYYY-MM-DD.`);
    }

    const fecha = new Date(`${valor}T00:00:00Z`);

    if (
      !Number.isFinite(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== valor
    ) {
      fallar(`${campo} no es válida.`);
    }

    return fecha.getTime();
  };

  const inicio = fechaCivil(query.fecha_inicio, 'fecha_inicio');
  const fin = fechaCivil(query.fecha_fin, 'fecha_fin');

  const dias = (fin - inicio) / 86400000 + 1;

  if (dias < 1 || dias > 366) {
    fallar('El período debe comprender entre 1 y 366 días.');
  }

  const entero = (valor, defecto, maximo, campo) => {
    if (valor === undefined) return defecto;

    if (
      !['string', 'number'].includes(typeof valor) ||
      !/^[1-9]\d*$/.test(String(valor))
    ) {
      fallar(`${campo} no es válido.`);
    }

    const numero = Number(valor);

    if (!Number.isSafeInteger(numero) || numero > maximo) {
      fallar(`${campo} supera el límite permitido.`);
    }

    return numero;
  };

  const page = entero(query.page, 1, 1000000, 'page');
  const limit = entero(query.limit, 20, 100, 'limit');

  const filtros = {
    fecha_inicio: query.fecha_inicio,
    fecha_fin: query.fecha_fin,
  };

  const agregar = (campo, valor) => {
    if (valor !== null && valor !== undefined) {
      filtros[campo] = valor;
    }
  };

  if (query.id_usuario !== undefined) {
    agregar('id_usuario', validarId(query.id_usuario, 'id_usuario'));
  }

  for (const [campo, maximo] of [
    ['modulo', 60],
    ['accion', 80],
    ['tipo_entidad', 80],
  ]) {
    agregar(campo, validarCodigo(query[campo], campo, maximo));
  }

  if (query.id_entidad !== undefined) {
    agregar('id_entidad', validarIdEntidad(query.id_entidad));

    if (!filtros.tipo_entidad) {
      fallar('id_entidad requiere tipo_entidad.');
    }
  }

  agregar('resultado', validarOpcion(
    query.resultado,
    RESULTADOS,
    'resultado',
  ));

  agregar('tipo_actor', validarOpcion(
    query.tipo_actor,
    TIPOS_ACTOR,
    'tipo_actor',
  ));

  agregar('origen', validarOpcion(
    query.origen,
    ORIGENES,
    'origen',
  ));

  agregar('request_id', validarIdentificadorTecnico(
    query.request_id,
    'request_id',
  ));

  agregar('clave_operacion', validarIdentificadorTecnico(
    query.clave_operacion,
    'clave_operacion',
  ));

  const sortOrder = query.sort_order === undefined
    ? 'DESC'
    : validarOpcion(
      query.sort_order,
      ['ASC', 'DESC'],
      'sort_order',
      true,
    );

  return {
    filtros,
    page,
    limit,
    sortOrder,

    // Medianoche de Perú equivale a las 05:00 UTC.
    desde: new Date(inicio + 5 * 3600000),
    hasta: new Date(fin + 86400000 + 5 * 3600000),
  };
};

module.exports = {
  fallar,
  esObjeto,
  validarId,
  validarTexto,
  validarCodigo,
  validarOpcion,
  validarIdentificadorTecnico,
  validarIdEntidad,
  validarUuid,
  validarFechaDispositivo,
  validarFiltrosAuditoria,
};