const crearHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const tieneValor = (value) =>
  value !== undefined && value !== null && value !== "";

const validarObjeto = (value, nombre) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw crearHttpError(`${nombre} debe ser un objeto.`);
  }

  return value;
};

// BIGINT firmado, como los modelos proporcionados.
const validarId = (value, campo) => {
  if (
    typeof value === "number" &&
    !Number.isSafeInteger(value)
  ) {
    throw crearHttpError(
      `${campo} debe enviarse como cadena si supera el rango seguro de JavaScript.`
    );
  }

  if (
    !["string", "number", "bigint"].includes(typeof value)
  ) {
    throw crearHttpError(`${campo} debe ser un entero positivo.`);
  }

  const text = String(value).trim();

  if (!/^[1-9]\d{0,18}$/.test(text)) {
    throw crearHttpError(`${campo} debe ser un entero positivo.`);
  }

  if (BigInt(text) > 9223372036854775807n) {
    throw crearHttpError(`${campo} supera el rango BIGINT permitido.`);
  }

  return text;
};

const validarEntero = (
  value,
  campo,
  { defaultValue, min = 1, max }
) => {
  if (!tieneValor(value)) return defaultValue;

  if (
    !["string", "number"].includes(typeof value) ||
    !/^\d+$/.test(String(value))
  ) {
    throw crearHttpError(`${campo} debe ser un número entero.`);
  }

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  ) {
    throw crearHttpError(
      `${campo} debe estar entre ${min} y ${max}.`
    );
  }

  return number;
};

const validarBooleano = (value, campo, defaultValue) => {
  if (!tieneValor(value)) return defaultValue;

  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1"].includes(normalized)) return true;
    if (["false", "0"].includes(normalized)) return false;
  }

  throw crearHttpError(
    `${campo} debe ser true, false, 1 o 0.`
  );
};

const validarSearch = (value) => {
  if (!tieneValor(value)) return "";

  if (typeof value !== "string") {
    throw crearHttpError("search debe ser una cadena.");
  }

  const search = value.trim();

  if (search.length > 150) {
    throw crearHttpError(
      "search no puede superar los 150 caracteres."
    );
  }

  return search;
};

const validarFiltrosUsuarios = (params) => ({
  search: validarSearch(params.search),

  estado: validarBooleano(
    params.estado,
    "estado",
    undefined
  ),

  id_rol: tieneValor(params.id_rol)
    ? validarId(params.id_rol, "id_rol")
    : undefined,
});

const validarUsuariosPaginados = (params = {}) => {
  validarObjeto(params, "Los parámetros");

  const page = validarEntero(params.page, "page", {
    defaultValue: 1,
    max: Number.MAX_SAFE_INTEGER,
  });

  const limit = validarEntero(params.limit, "limit", {
    defaultValue: 10,
    max: 100,
  });

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw crearHttpError("La página solicitada es demasiado grande.");
  }

  const camposOrden = [
    "id_usuario",
    "username",
    "email_acceso",
    "estado",
    "ultimo_acceso",
    "created_at",
    "updated_at",
  ];

  const sortBy = params.sort_by ?? "created_at";

  if (
    typeof sortBy !== "string" ||
    !camposOrden.includes(sortBy)
  ) {
    throw crearHttpError(
      `sort_by debe ser: ${camposOrden.join(", ")}.`
    );
  }

  const sortOrder = String(
    params.sort_order ?? "DESC"
  ).toUpperCase();

  if (!["ASC", "DESC"].includes(sortOrder)) {
    throw crearHttpError("sort_order debe ser ASC o DESC.");
  }

  return {
    ...validarFiltrosUsuarios(params),
    page,
    limit,
    offset,
    sort_by: sortBy,
    sort_order: sortOrder,
  };
};

const validarUsuarioSelector = (params = {}) => {
  validarObjeto(params, "Los parámetros");

  return {
    search: validarSearch(params.search),

    id_rol: tieneValor(params.id_rol)
      ? validarId(params.id_rol, "id_rol")
      : undefined,

    limit: validarEntero(params.limit, "limit", {
      defaultValue: 20,
      max: 100,
    }),
  };
};

const validarOperacionRol = (params) => {
  validarObjeto(params, "Los parámetros");

  return {
    id_usuario: validarId(params.id_usuario, "id_usuario"),
    id_rol: validarId(params.id_rol, "id_rol"),
  };
};

const validarUsuarioRoles = (params = {}) => {
  validarObjeto(params, "Los parámetros");

  return {
    id_usuario: validarId(params.id_usuario, "id_usuario"),

    // Omitir estado devuelve activas e inactivas.
    estado: validarBooleano(
      params.estado,
      "estado",
      undefined
    ),
  };
};

module.exports = {
  crearHttpError,
  validarId,
  validarBooleano,
  validarUsuariosPaginados,
  validarUsuarioSelector,
  validarOperacionRol,
  validarUsuarioRoles,
};