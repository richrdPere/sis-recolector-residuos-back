const db = require('../database/models');
const AppError = require('../utils/app-error');

const { autorizarEquipo } = require("../modules/recorridos/services/resultado-final.service")

const ADMINISTRATIVOS = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
];

module.exports = async function autorizarAccesoRecoleccion(
  req,
  res,
  next,
) {
  try {
    let idRecorrido = req.params.idRecorrido;
    let idRecoleccion = req.params.idRecoleccion;

    const idEvidencia = req.params.idEvidencia;

    for (const id of [
      idRecorrido,
      idRecoleccion,
      idEvidencia,
    ]) {
      if (
        id != null &&
        !/^[1-9]\d*$/.test(String(id))
      ) {
        throw new AppError(
          'Identificador no válido.',
          400,
        );
      }
    }

    if (idEvidencia != null) {
      const evidencia =
        await db.RecoleccionEvidencia.findByPk(idEvidencia);

      if (
        !evidencia ||
        (
          idRecoleccion != null &&
          String(evidencia.id_recoleccion) !==
          String(idRecoleccion)
        )
      ) {
        throw new AppError(
          'Evidencia no encontrada.',
          404,
        );
      }

      res.locals.evidencia = evidencia;
      idRecoleccion = evidencia.id_recoleccion;
    }

    if (idRecoleccion != null) {
      const recoleccion =
        await db.RecoleccionPunto.findByPk(idRecoleccion);

      if (!recoleccion) {
        throw new AppError(
          'Recolección no encontrada.',
          404,
        );
      }

      res.locals.recoleccion = recoleccion;
      idRecorrido = recoleccion.id_recorrido;
    }

    if (idRecorrido == null) {
      throw new AppError(
        'No se pudo identificar el recorrido.',
        400,
      );
    }

    const recorrido =
      await db.Recorrido.findByPk(idRecorrido);

    if (!recorrido) {
      throw new AppError(
        'Recorrido no encontrado.',
        404,
      );
    }

    if (!req.usuario) {
      throw new AppError(
        'Debes iniciar sesión.',
        401,
      );
    }

    const esAdministrativo = (
      req.usuario.roles || []
    ).some((rol) => ADMINISTRATIVOS.includes(rol));

    if (!esAdministrativo) {
      await autorizarEquipo(
        recorrido,
        req.usuario.id_usuario,
      );
    }

    res.locals.recorrido = recorrido;

    return next();
  } catch (error) {
    return next(error);
  }
};