const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const createUsuarioService = require('./create-usuario.service');

const { Roles } = db;

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const TIPOS_DOCUMENTO = [
  'DNI',
  'RUC',
  'CE',
  'PASAPORTE',
];

/*
|--------------------------------------------------------------------------
| Validar textos
|--------------------------------------------------------------------------
*/

const validarTexto = ({
  value,
  campo,
  max,
  obligatorio = true,
}) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    if (obligatorio) {
      throw new AppError(
        `El campo ${campo} es obligatorio.`,
        400,
        'REGISTER_INVALID_FIELD',
      );
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(
      `El campo ${campo} debe ser texto.`,
      400,
      'REGISTER_INVALID_FIELD',
    );
  }

  const texto = value.trim();

  if (!texto) {
    if (obligatorio) {
      throw new AppError(
        `El campo ${campo} es obligatorio.`,
        400,
        'REGISTER_INVALID_FIELD',
      );
    }

    return null;
  }

  if (texto.length > max) {
    throw new AppError(
      `El campo ${campo} admite hasta ${max} caracteres.`,
      400,
      'REGISTER_INVALID_FIELD',
    );
  }

  return texto;
};

/*
|--------------------------------------------------------------------------
| Registro público de ciudadano
|--------------------------------------------------------------------------
|
| Solo admite datos personales y credenciales.
| El rol se determina exclusivamente desde el servidor.
|
*/

const registerCiudadanoService = async ({
  nombres,
  apellidos,
  tipo_documento = 'DNI',
  numero_documento,
  celular = null,
  email,
  username,
  password,
}) => {
  const nombresNormalizados = validarTexto({
    value: nombres,
    campo: 'nombres',
    max: 100,
  });

  const apellidosNormalizados = validarTexto({
    value: apellidos,
    campo: 'apellidos',
    max: 100,
  });

  const tipoDocumento = validarTexto({
    value: tipo_documento,
    campo: 'tipo_documento',
    max: 20,
  }).toUpperCase();

  if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) {
    throw new AppError(
      'El tipo de documento no es válido.',
      400,
      'INVALID_DOCUMENT_TYPE',
    );
  }

  const documento = validarTexto({
    value: numero_documento,
    campo: 'numero_documento',
    max: 20,
  }).toUpperCase();

  if (
    tipoDocumento === 'DNI' &&
    !/^\d{8}$/.test(documento)
  ) {
    throw new AppError(
      'El DNI debe contener 8 dígitos.',
      400,
      'INVALID_DNI',
    );
  }

  if (
    tipoDocumento === 'RUC' &&
    !/^\d{11}$/.test(documento)
  ) {
    throw new AppError(
      'El RUC debe contener 11 dígitos.',
      400,
      'INVALID_RUC',
    );
  }

  if (
    ['CE', 'PASAPORTE'].includes(tipoDocumento) &&
    !/^[A-Z0-9]+$/.test(documento)
  ) {
    throw new AppError(
      'El documento debe contener únicamente letras y números.',
      400,
      'INVALID_DOCUMENT',
    );
  }

  const correo = validarTexto({
    value: email,
    campo: 'email',
    max: 150,
  }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new AppError(
      'El correo electrónico no es válido.',
      400,
      'INVALID_EMAIL',
    );
  }

  const nombreUsuario = validarTexto({
    value: username,
    campo: 'username',
    max: 50,
  }).toLowerCase();

  if (!/^[a-z0-9._-]{3,50}$/.test(nombreUsuario)) {
    throw new AppError(
      'El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.',
      400,
      'INVALID_USERNAME',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Contraseña
  |--------------------------------------------------------------------------
  |
  | No aplicar trim: los espacios forman parte de la contraseña.
  | El límite de bytes evita truncamiento silencioso al usar bcrypt.
  |
  */

  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new AppError(
      'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.',
      400,
      'INVALID_PASSWORD_LENGTH',
    );
  }

  const celularNormalizado = validarTexto({
    value: celular,
    campo: 'celular',
    max: 20,
    obligatorio: false,
  });

  if (
    celularNormalizado &&
    !/^\+?[0-9 ()-]{7,20}$/.test(celularNormalizado)
  ) {
    throw new AppError(
      'El número de celular no es válido.',
      400,
      'INVALID_PHONE',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Rol fijo
  |--------------------------------------------------------------------------
  */

  const rolCiudadano = await Roles.findOne({
    where: {
      nombre: 'CIUDADANO',
      estado: true,
    },
    attributes: [
      'id_rol',
    ],
  });

  if (!rolCiudadano) {
    throw new AppError(
      'El registro ciudadano no está disponible en este momento.',
      503,
      'CITIZEN_ROLE_UNAVAILABLE',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Crear persona + usuario + rol
  |--------------------------------------------------------------------------
  |
  | createUsuarioService conserva su transacción y manejo de duplicados.
  |
  */

  return createUsuarioService({
    nombres: nombresNormalizados,
    apellidos: apellidosNormalizados,
    tipo_documento: tipoDocumento,
    numero_documento: documento,
    celular: celularNormalizado,

    email: correo,
    username: nombreUsuario,
    password,

    roles_ids: [
      rolCiudadano.id_rol,
    ],
  });
};

module.exports = registerCiudadanoService;