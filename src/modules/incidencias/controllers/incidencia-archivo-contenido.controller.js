const path = require('node:path');
const fs = require('node:fs/promises');

const AppError = require('../../../utils/app-error');

const { privateUploadsRoot, incidenciasRoot } = require('../../../config/uploads');

const getIncidenciaArchivoService = require('../services/get-incidencia-archivo.service');

const { obtenerMetadata } = require('../utils/incidencias-controller.utils');

const TIPOS_VISUALIZABLES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const incidenciaArchivoContenidoController = async (req, res, next) => {
  try {
    // Valida sesión, pertenencia del archivo
    // y permisos sobre la incidencia.
    const archivo = await getIncidenciaArchivoService(
      req.params.id,
      req.params.idArchivo,
      obtenerMetadata(req),
    );

    if (archivo.almacenamiento !== 'LOCAL') {
      throw new AppError(
        'El almacenamiento de esta evidencia no está disponible.',
        409,
        'INCIDENCIA_STORAGE_UNAVAILABLE',
      );
    }

    const rutaGuardada = archivo.ruta_archivo;

    const segmentos =
      typeof rutaGuardada === 'string'
        ? rutaGuardada.split('/')
        : [];

    const rutaInvalida =
      typeof rutaGuardada !== 'string' ||
      !rutaGuardada ||
      path.isAbsolute(rutaGuardada) ||
      /[\\:\x00-\x1f]/.test(rutaGuardada) ||
      segmentos[0] !== 'incidencias' ||
      segmentos.some(
        segmento =>
          !segmento ||
          segmento === '.' ||
          segmento === '..',
      );

    if (rutaInvalida) {
      throw new AppError(
        'La ubicación de la evidencia no es válida.',
        409,
        'INCIDENCIA_FILE_PATH_INVALID',
      );
    }

    let raiz;
    let ruta;

    try {
      // Resolver también enlaces simbólicos.
      raiz = await fs.realpath(incidenciasRoot);

      ruta = await fs.realpath(
        path.resolve(
          privateUploadsRoot,
          rutaGuardada,
        ),
      );
    } catch (error) {
      if (
        ['ENOENT', 'ENOTDIR'].includes(error.code)
      ) {
        throw new AppError(
          'La evidencia no está disponible en el servidor.',
          404,
          'INCIDENCIA_FILE_NOT_FOUND',
        );
      }

      throw error;
    }

    const relativa = path.relative(
      raiz,
      ruta,
    );

    if (
      !relativa ||
      relativa === '..' ||
      relativa.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativa)
    ) {
      throw new AppError(
        'La ubicación de la evidencia no está permitida.',
        403,
        'INCIDENCIA_FILE_PATH_FORBIDDEN',
      );
    }

    const stat = await fs.stat(ruta);

    if (!stat.isFile()) {
      throw new AppError(
        'La evidencia no está disponible.',
        404,
        'INCIDENCIA_FILE_NOT_FOUND',
      );
    }

    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    const descargar =
      req.query.descargar === '1';

    const visualizable =
      TIPOS_VISUALIZABLES.has(
        archivo.mime_type,
      );

    const manejarError = error => {
      if (error) {
        next(error);
      }
    };

    if (descargar || !visualizable) {
      return res.download(
        ruta,
        path.basename(
          archivo.nombre_original || 'evidencia',
        ),
        manejarError,
      );
    }

    // Imágenes y PDF pueden visualizarse.
    res.type(archivo.mime_type);

    res.set(
      'Content-Disposition',
      'inline',
    );

    return res.sendFile(
      ruta,
      {
        dotfiles: 'deny',
        cacheControl: false,
        lastModified: false,
      },
      manejarError,
    );
  } catch (error) {
    next(error);
  }
};

module.exports = incidenciaArchivoContenidoController;