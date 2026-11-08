const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Utils
const {
  normalizeCode,
  normalizeText,
} = require('../../rutas/utils/rutas-service.utils');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Zona,
  sequelize,
} = db;

// *********************************************************
// SERVICE: CREAR ZONA
// *********************************************************

const createZonaService = async ({
  codigo,
  nombre,
  descripcion = null,
  color = '#1976D2',
  poligono_geojson = null,
  centro_latitud = null,
  centro_longitud = null,
}) => {
  const normalizedCode = normalizeCode(codigo);
  const normalizedName = normalizeText(nombre);

  if (!normalizedCode || !normalizedName) {
    throw new AppError(
      'El código y nombre de la zona son obligatorios.',
      400,
      'ZONE_REQUIRED_FIELDS',
    );
  }

  return sequelize.transaction(async transaction => {

    // 1. Comprobar duplicados, incluyendo zonas eliminadas.
    const duplicada = await Zona.findOne({
      where: {
        [Op.or]: [
          { codigo: normalizedCode },
          { nombre: normalizedName },
        ],
      },
      paranoid: false,
      transaction,
    });

    if (duplicada) {
      const code = duplicada.codigo === normalizedCode
        ? 'ZONE_CODE_ALREADY_EXISTS'
        : 'ZONE_NAME_ALREADY_EXISTS';

      throw new AppError(
        code === 'ZONE_CODE_ALREADY_EXISTS'
          ? 'El código de la zona ya está registrado.'
          : 'El nombre de la zona ya está registrado.',
        409,
        code,
      );
    }

    // 2. Preparar auditoría de creación.
    const auditarZona = prepararAuditoria(
      'ZONA',
      'CREAR',
    );

    // 3. Crear zona.
    const zona = await Zona.create(
      {
        codigo: normalizedCode,
        nombre: normalizedName,
        descripcion: descripcion?.trim() || null,
        color,
        poligono_geojson,
        centro_latitud,
        centro_longitud,
        estado: true,
      },
      {
        transaction,
      },
    );

    // Recuperar los valores realmente persistidos.
    await zona.reload({
      transaction,
    });

    // 4. Registrar auditoría en la misma transacción.
    await auditarZona(
      zona,
      transaction,
    );

    return zona;
  });
};

module.exports = createZonaService;