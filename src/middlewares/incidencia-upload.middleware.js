const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const AppError = require('../utils/app-error');

// Config
const { privateUploadsRoot, incidenciasRoot } = require('../config/uploads');

// Validations
const { validarId } = require('../modules/incidencias/validations/incidencia.validations',);

// Utils
const { obtenerMetadata } = require('../modules/incidencias/utils/incidencias-controller.utils');

const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  ensureIncidenciaOpen,
} = require('../modules/incidencias/utils/incidencia-service.utils');

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

const MAX_ARCHIVOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;

// const uploadsRoot = path.join(
//   process.cwd(),
//   'uploads',
// );

// const incidenciasRoot = path.join(
//   uploadsRoot,
//   'incidencias',
// );

const tiposPermitidos = {
  'image/jpeg': {
    extension: '.jpg',
    tipoArchivo: 'IMAGEN',
  },

  'image/png': {
    extension: '.png',
    tipoArchivo: 'IMAGEN',
  },

  'image/webp': {
    extension: '.webp',
    tipoArchivo: 'IMAGEN',
  },

  'application/pdf': {
    extension: '.pdf',
    tipoArchivo: 'DOCUMENTO',
  },
};

// ==========================================================
// LIMPIEZA DE ARCHIVOS DE ESTA SOLICITUD
// ==========================================================

const limpiarArchivos = async (rutas) => {
  const resultados = await Promise.allSettled(
    rutas.map(async (ruta) => {
      try {
        await fs.unlink(ruta);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }),
  );

  resultados.forEach((resultado, index) => {
    if (resultado.status === 'rejected') {
      console.error(
        '[incidencia-upload] No se pudo limpiar el archivo:',
        rutas[index],
        resultado.reason,
      );
    }
  });
};

// ==========================================================
// COMPROBAR FIRMA INICIAL DEL ARCHIVO
// No dependemos solamente del MIME enviado por el cliente.
// ==========================================================

const validarFirmaArchivo = async (file) => {
  const handle = await fs.open(file.path, 'r');

  try {
    const buffer = Buffer.alloc(16);

    const { bytesRead } = await handle.read(
      buffer,
      0,
      buffer.length,
      0,
    );

    let valido = false;

    switch (file.mimetype) {
      case 'image/jpeg':
        valido =
          bytesRead >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff;
        break;

      case 'image/png':
        valido =
          bytesRead >= 8 &&
          buffer.subarray(0, 8).equals(
            Buffer.from([
              0x89, 0x50, 0x4e, 0x47,
              0x0d, 0x0a, 0x1a, 0x0a,
            ]),
          );
        break;

      case 'image/webp':
        valido =
          bytesRead >= 12 &&
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP';
        break;

      case 'application/pdf':
        valido =
          bytesRead >= 5 &&
          buffer.toString('ascii', 0, 5) === '%PDF-';
        break;

      default:
        valido = false;
    }

    if (!valido) {
      throw new AppError(
        'El contenido de un archivo no corresponde al tipo declarado.',
        400,
        'INVALID_INCIDENCIA_FILE_CONTENT',
      );
    }
  } finally {
    await handle.close();
  }
};

// ==========================================================
// ALMACENAMIENTO LOCAL
// ==========================================================

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const {
      usuarioId,
      incidenciaId,
    } = req.incidenciaUploadContext;

    const directory = path.join(
      incidenciasRoot,
      usuarioId,
      incidenciaId,
    );

    fs.mkdir(directory, { recursive: true })
      .then(() => callback(null, directory))
      .catch((error) => callback(error));
  },

  filename: (req, file, callback) => {
    const configuracion =
      tiposPermitidos[file.mimetype];

    if (!configuracion) {
      return callback(
        new AppError(
          'El tipo de archivo no está permitido.',
          400,
          'INVALID_INCIDENCIA_FILE_TYPE',
        ),
      );
    }

    // La extensión depende del MIME permitido,
    // no del nombre proporcionado por el cliente.
    const filename =
      `${crypto.randomUUID()}${configuracion.extension}`;

    const {
      usuarioId,
      incidenciaId,
    } = req.incidenciaUploadContext;

    // Registramos las rutas para poder limpiar esta solicitud.
    req.incidenciaUploadPaths.push(
      path.join(
        incidenciasRoot,
        usuarioId,
        incidenciaId,
        filename,
      ),
    );

    return callback(null, filename);
  },
});

// ==========================================================
// FILTRO
// ==========================================================

const fileFilter = (req, file, callback) => {
  file.mimetype = file.mimetype.toLowerCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      tiposPermitidos,
      file.mimetype,
    )
  ) {
    return callback(
      new AppError(
        'Solo se permiten archivos JPEG, PNG, WebP y PDF.',
        400,
        'INVALID_INCIDENCIA_FILE_TYPE',
      ),
    );
  }

  // Conservamos solo el nombre original, sin directorios.
  const nombreOriginal = path.posix.basename(
    file.originalname.replace(/\\/g, '/'),
  ).trim();

  if (
    !nombreOriginal ||
    nombreOriginal.length > 255 ||
    /[\x00-\x1f]/.test(nombreOriginal)
  ) {
    return callback(
      new AppError(
        'El nombre original del archivo no es válido.',
        400,
        'INVALID_INCIDENCIA_FILE_NAME',
      ),
    );
  }

  file.originalname = nombreOriginal;

  return callback(null, true);
};

// ==========================================================
// MULTER
// ==========================================================

const procesarArchivos = multer({
  storage,
  fileFilter,

  limits: {
    files: MAX_ARCHIVOS,
    fileSize: MAX_BYTES,

    // Un campo de texto opcional: descripcion.
    fields: 1,
    fieldSize: 2048,

    parts: MAX_ARCHIVOS + 1,
  },
}).array('archivos', MAX_ARCHIVOS);

// ==========================================================
// NORMALIZAR ERRORES DE MULTER
// ==========================================================

const normalizarErrorUpload = (error) => {
  if (!(error instanceof multer.MulterError)) {
    return error;
  }

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(
        'Cada archivo debe pesar como máximo 5 MB.',
        413,
        'INCIDENCIA_FILE_SIZE_EXCEEDED',
      );

    case 'LIMIT_FILE_COUNT':
      return new AppError(
        'Puede adjuntar como máximo 10 archivos por solicitud.',
        400,
        'INCIDENCIA_FILE_LIMIT_EXCEEDED',
      );

    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError(
        'Use el campo "archivos" y adjunte como máximo 10 archivos.',
        400,
        'INCIDENCIA_UNEXPECTED_FILE',
      );

    case 'LIMIT_FIELD_VALUE':
      return new AppError(
        'El campo de texto enviado es demasiado extenso.',
        400,
        'INCIDENCIA_FIELD_TOO_LARGE',
      );

    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_PART_COUNT':
      return new AppError(
        'Se excedió la cantidad de campos permitidos.',
        400,
        'INCIDENCIA_UPLOAD_FIELDS_EXCEEDED',
      );

    default:
      return new AppError(
        'No se pudieron procesar los archivos adjuntos.',
        400,
        'INCIDENCIA_UPLOAD_ERROR',
      );
  }
};

// ==========================================================
// MIDDLEWARE: CARGAR EVIDENCIAS
// ==========================================================

const uploadIncidenciaEvidence = async (req, res, next) => {
  // Estos datos se construyen exclusivamente en el servidor.
  req.incidenciaUploadPaths = [];
  req.incidenciaArchivos = [];

  req.limpiarIncidenciaArchivos = () =>
    limpiarArchivos(req.incidenciaUploadPaths);

  try {
    const actor = validateActor(
      obtenerMetadata(req),
    );

    const incidenciaId = validarId(
      req.params.id,
      'id_incidencia',
    );

    // Comprobar acceso antes de guardar archivos en disco.
    const incidencia = await findIncidenciaOrFail(
      incidenciaId,
    );

    await authorizeIncidencia(
      'agregar_archivos',
      actor,
      { incidencia },
    );

    ensureIncidenciaOpen(incidencia);

    if (!req.is('multipart/form-data')) {
      throw new AppError(
        'Debe enviar los archivos como multipart/form-data.',
        415,
        'INCIDENCIA_MULTIPART_REQUIRED',
      );
    }

    req.incidenciaUploadContext = {
      usuarioId: actor.id_usuario,
      incidenciaId,
    };

    await new Promise((resolve, reject) => {
      procesarArchivos(req, res, (error) => {
        if (error) {
          return reject(error);
        }

        return resolve();
      });
    });

    const archivos = req.files;

    if (
      !Array.isArray(archivos) ||
      !archivos.length
    ) {
      throw new AppError(
        'Debe adjuntar al menos un archivo.',
        400,
        'INCIDENCIA_FILES_REQUIRED',
      );
    }

    // Solo admitimos este campo de texto.
    const campos = Object.keys(req.body ?? {});

    if (campos.some((campo) => campo !== 'descripcion')) {
      throw new AppError(
        'Solo se admite el campo de texto "descripcion".',
        400,
        'INVALID_INCIDENCIA_UPLOAD_FIELD',
      );
    }

    const descripcionEnviada =
      req.body?.descripcion;

    if (
      descripcionEnviada !== undefined &&
      typeof descripcionEnviada !== 'string'
    ) {
      throw new AppError(
        'La descripción debe ser texto.',
        400,
        'INVALID_INCIDENCIA_FILE_DESCRIPTION',
      );
    }

    const descripcion =
      descripcionEnviada?.trim() || null;

    if (descripcion && descripcion.length > 500) {
      throw new AppError(
        'La descripción admite como máximo 500 caracteres.',
        400,
        'INVALID_INCIDENCIA_FILE_DESCRIPTION',
      );
    }

    // Comprobar las firmas antes de registrar metadatos.
    for (const archivo of archivos) {
      await validarFirmaArchivo(archivo);
    }

    req.incidenciaArchivos = archivos.map((archivo) => {
      const configuracion = tiposPermitidos[archivo.mimetype];

      // Ruta relativa a uploads, compatible con las
      // validaciones actuales del service.
      const rutaRelativa = path
        .relative(privateUploadsRoot, archivo.path)
        .split(path.sep)
        .join('/');

      return {
        tipo_archivo: configuracion.tipoArchivo,

        nombre_original: archivo.originalname,
        nombre_archivo: archivo.filename,

        almacenamiento: 'LOCAL',
        ruta_archivo: rutaRelativa,

        mime_type: archivo.mimetype,
        tamanio_bytes: archivo.size,

        descripcion,
      };
    });

    return next();
  } catch (error) {
    await req.limpiarIncidenciaArchivos();

    return next(
      normalizarErrorUpload(error),
    );
  }
};

module.exports = {
  uploadIncidenciaEvidence,
};