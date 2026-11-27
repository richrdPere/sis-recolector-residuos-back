const fs = require('node:fs/promises');
const path = require('node:path');

const AppError = require('../../../utils/app-error');

const { uploadsRoot, recoleccionesRoot } = require('../../../config/uploads');

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

module.exports = async function evidenciaContenidoController(req, res, next) {
  try {
    // La autorización se ejecuta antes de este controlador.
    const evidencia = res.locals.evidencia;

    if (
      !evidencia ||
      evidencia.estado_evidencia !== 'ACTIVA'
    ) {
      throw new AppError(
        'Evidencia no disponible.',
        404,
      );
    }

    const nombre = evidencia.nombre_almacenado;

    if (
      typeof nombre !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(nombre)
    ) {
      throw new AppError(
        'El archivo no está disponible.',
        404,
      );
    }

    if (!TIPOS_PERMITIDOS.has(evidencia.mime_type)) {
      throw new AppError(
        'Tipo de archivo no permitido.',
        415,
      );
    }

    // Primer directorio: nuevas evidencias privadas.
    // Otros directorios: compatibilidad con archivos anteriores.
    const directorios = [
      ...new Set([
        recoleccionesRoot,

        path.join(
          uploadsRoot,
          'recolecciones',
        ),

        path.resolve(
          process.cwd(),
          'uploads',
          'recolecciones',
        ),
      ]),
    ];

    let archivo = null;

    for (const directorio of directorios) {
      try {
        const raizReal = await fs.realpath(directorio);

        const archivoReal = await fs.realpath(
          path.join(raizReal, nombre),
        );

        // No permitir archivos fuera del directorio autorizado.
        if (path.dirname(archivoReal) !== raizReal) {
          continue;
        }

        const datos = await fs.stat(archivoReal);

        if (!datos.isFile()) {
          continue;
        }

        archivo = archivoReal;
        break;
      } catch (error) {
        if (
          error.code !== 'ENOENT' &&
          error.code !== 'ENOTDIR'
        ) {
          throw error;
        }
      }
    }

    if (!archivo) {
      throw new AppError(
        'El archivo no se encontró en el almacenamiento.',
        404,
      );
    }

    res.attachment(
      evidencia.nombre_original || nombre,
    );

    res.type(evidencia.mime_type);

    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    return res.sendFile(
      archivo,
      (error) => {
        if (error) {
          next(error);
        }
      },
    );
  } catch (error) {
    return next(error);
  }
};