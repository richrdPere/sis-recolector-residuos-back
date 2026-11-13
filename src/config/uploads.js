const path = require('node:path');

// Conserva la configuración usada por las fotos de vehículos.
const uploadsRoot = path.resolve(
  process.env.UPLOADS_DIR ||
  path.join(__dirname, '../../uploads'),
);

// Evidencias privadas, fuera del directorio público.
const privateUploadsRoot = path.resolve(
  process.env.PRIVATE_UPLOADS_DIR ||
  path.join(__dirname, '../../storage/private'),
);

const incidenciasRoot = path.join(
  privateUploadsRoot,
  'incidencias',
);

const tempRoot = path.resolve(
  process.env.UPLOADS_TEMP_DIR ||
  path.join(__dirname, '../../storage/tmp'),
);

// Evitar publicar accidentalmente el almacenamiento privado.
const relativa = path.relative(
  uploadsRoot,
  privateUploadsRoot,
);

const privadoDentroDelPublico =
  relativa === '' ||
  (
    relativa !== '..' &&
    !relativa.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativa)
  );

if (privadoDentroDelPublico) {
  throw new Error(
    'PRIVATE_UPLOADS_DIR debe estar fuera de UPLOADS_DIR.',
  );
}

module.exports = {
  uploadsRoot,
  privateUploadsRoot,
  incidenciasRoot,
  tempRoot,
};