const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

const db = require('../database/models');
const AppError = require('../utils/app-error');

const { tempRoot } = require('../config/uploads');

const { MAX_BYTES } = require('../utils/vehiculo-foto-storage');

const { validarId } = require('../modules/vehiculos/services/vehiculo-foto.service');

const limpiarTemporal = async req => {
  if (!req.fotoTempDir) {
    return;
  }

  try {
    await fs.rm(
      req.fotoTempDir,
      {
        recursive: true,
        force: true,
      },
    );
  } catch (error) {
    console.error(
      '[vehiculo-foto:temporal]',
      error.code,
    );
  }
};

// Se ejecuta después de verificar token y rol,
// pero antes de aceptar el archivo.
const validarVehiculoParaFoto = async (req, res, next) => {
  try {
    const id = validarId(req.params.id);

    const vehiculo = await db.Vehiculo.findByPk(
      id,
      {
        attributes: [
          'id_vehiculo',
        ],
      },
    );

    if (!vehiculo) {
      throw new AppError(
        'Vehículo no encontrado.',
        404,
        'VEHICLE_NOT_FOUND',
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, req.fotoTempDir);
    },

    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),

  limits: {
    fileSize: MAX_BYTES,
    files: 1,
    fields: 0,
  },

  fileFilter(req, file, callback) {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const valido =
      (
        ['.jpg', '.jpeg'].includes(extension) &&
        file.mimetype === 'image/jpeg'
      ) ||
      (
        extension === '.png' &&
        file.mimetype === 'image/png'
      );

    if (!valido) {
      callback(
        new AppError(
          'Solo se permiten archivos JPG, JPEG y PNG.',
          400,
          'INVALID_PHOTO_TYPE',
        ),
      );

      return;
    }

    callback(null, true);
  },
}).single('foto');

const uploadVehiculoFoto = async (
  req,
  res,
  next,
) => {
  try {
    await fs.mkdir(
      tempRoot,
      {
        recursive: true,
        mode: 0o700,
      },
    );

    req.fotoTempDir = await fs.mkdtemp(
      path.join(tempRoot, 'vehiculo-'),
    );

    res.once('close', () => {
      void limpiarTemporal(req);
    });

    upload(req, res, async error => {
      if (!error) {
        next();
        return;
      }

      await limpiarTemporal(req);

      if (error instanceof multer.MulterError) {
        const demasiadoGrande = error.code === 'LIMIT_FILE_SIZE';

        next(
          new AppError(
            demasiadoGrande
              ? 'La fotografía no puede superar 5 MB.'
              : 'Envía una sola imagen en el campo foto.',
            demasiadoGrande ? 413 : 400,
            error.code,
          ),
        );

        return;
      }

      next(error);
    });
  } catch (error) {
    await limpiarTemporal(req);
    next(error);
  }
};

module.exports = {
  limpiarTemporal,
  validarVehiculoParaFoto,
  uploadVehiculoFoto,
};