const {
  createUsuarioService,
  loginService,
  refreshSessionService,
  logoutService,
  logoutAllService,
  getAuthProfileService,
  changePasswordService,
} = require('../services');

/*
|--------------------------------------------------------------------------
| Utilidades del request
|--------------------------------------------------------------------------
*/

const getRequestMetadata = (req) => {
  const forwardedFor =
    req.headers['x-forwarded-for'];

  const forwardedIp =
    typeof forwardedFor === 'string'
      ? forwardedFor
        .split(',')[0]
        .trim()
      : null;

  return {
    ip:
      forwardedIp ||
      req.ip ||
      req.socket?.remoteAddress ||
      null,

    user_agent:
      req.get('user-agent') || null,

    dispositivo:
      req.get('x-device-name') ||
      req.body?.dispositivo ||
      null,
  };
};

const getAuthenticatedUserId = (req) => {
  return (
    req.usuario?.id_usuario ||
    req.usuario?.id ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| 1. Crear usuario
|--------------------------------------------------------------------------
|
| Esta operación debe ser administrativa porque permite seleccionar roles.
|
*/
const createUsuarioController = async (req, res, next) => {
  try {
    const data =
      await createUsuarioService({
        nombres: req.body.nombres,
        apellidos: req.body.apellidos,

        tipo_documento:
          req.body.tipo_documento,

        numero_documento:
          req.body.numero_documento,

        fecha_nacimiento:
          req.body.fecha_nacimiento,

        celular: req.body.celular,
        direccion: req.body.direccion,
        foto_url: req.body.foto_url,
        genero: req.body.genero,

        email: req.body.email,
        username: req.body.username,
        password: req.body.password,

        id_rol: req.body.id_rol,

        roles_ids:
          req.body.roles_ids || [],
      });

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Iniciar sesión
|--------------------------------------------------------------------------
*/
const loginController = async (req, res, next) => {
  try {
    // const {
    //   ip,
    //   user_agent,
    //   dispositivo,
    // } = getRequestMetadata(req);

    const data = await loginService({
      username: req.body.username,
      password: req.body.password,
      // ip,
      // user_agent,
      // dispositivo,
    });

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión realizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Renovar sesión
|--------------------------------------------------------------------------
|
| No requiere access token porque normalmente se utiliza cuando este expiró.
|
*/
const refreshSessionController = async (req, res, next) => {
  try {
    // const {
    //   ip,
    //   user_agent,
    //   dispositivo,
    // } = getRequestMetadata(req);

    const data =
      await refreshSessionService({
        refresh_token:
          req.body.refresh_token,

        // ip,
        // user_agent,
        // dispositivo,
      });

    return res.status(200).json({
      success: true,
      message:
        'Sesión renovada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Cerrar sesión actual
|--------------------------------------------------------------------------
*/
const logoutController = async (req, res, next) => {
  try {
    const id_usuario =
      getAuthenticatedUserId(req);

    const data = await logoutService({
      id_usuario,

      refresh_token:
        req.body.refresh_token,
    });

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Cerrar todas las sesiones
|--------------------------------------------------------------------------
*/
const logoutAllController = async (req, res, next,) => {
  try {
    const id_usuario = getAuthenticatedUserId(req);

    const data = await logoutAllService({
      id_usuario,
    });

    return res.status(200).json({
      success: true,
      message: 'Todas las sesiones fueron cerradas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Obtener perfil autenticado
|--------------------------------------------------------------------------
*/
const getAuthProfileController = async (
  req,
  res,
  next,
) => {
  try {
    const id_usuario = getAuthenticatedUserId(req);
    const data = await getAuthProfileService({
      id_usuario,
    });

    return res.status(200).json({
      success: true,
      message: 'Perfil autenticado obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Cambiar contraseña
|--------------------------------------------------------------------------
*/
const changePasswordController = async (
  req,
  res,
  next,
) => {
  try {
    const id_usuario = getAuthenticatedUserId(req);

    const data = await changePasswordService({
      id_usuario,
      password_actual: req.body.password_actual,
      password_nueva: req.body.password_nueva,
    });

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente. Debe iniciar sesión nuevamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUsuarioController,
  loginController,
  refreshSessionController,
  logoutController,
  logoutAllController,
  getAuthProfileController,
  changePasswordController,
};