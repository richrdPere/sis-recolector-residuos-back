const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/app-error');

const uploadDirectory =
  path.join(
    process.cwd(),
    'uploads',
    'recolecciones',
  );

if (
  !fs.existsSync(
    uploadDirectory,
  )
) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive:
        true,
    },
  );
}

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        uploadDirectory,
      );
    },

    filename: (
      req,
      file,
      callback,
    ) => {
      const extension =
        path
          .extname(
            file.originalname,
          )
          .toLowerCase();

      const filename =
        `${Date.now()}-${crypto.randomUUID()}${extension}`;

      callback(
        null,
        filename,
      );
    },
  });

const allowedMimeTypes =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);

const fileFilter = (
  req,
  file,
  callback,
) => {
  if (
    !allowedMimeTypes.has(
      file.mimetype,
    )
  ) {
    return callback(
      new AppError(
        'El tipo de archivo no está permitido.',
        400,
        'INVALID_EVIDENCE_FILE_TYPE',
      ),
    );
  }

  return callback(
    null,
    true,
  );
};

const uploadCollectionEvidence =
  multer({
    storage,

    fileFilter,

    limits: {
      files:
        1,

      fileSize:
        5 * 1024 * 1024,
    },
  });

module.exports = {
  uploadCollectionEvidence,
};