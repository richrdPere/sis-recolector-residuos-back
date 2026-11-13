const { Op } = require('sequelize');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  validateId,
  normalizeCode,
  normalizeText,
} = require('../../utils/rutas-service.utils');

const getEditableVersion = require('../../utils/ruta-horario/ruta-punto.utils');

// Auditoría
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  sequelize,
  RutaPunto,
} = db;

// ===============================================
// SERVICE: CREAR PUNTO DE RUTA
// ===============================================
const createRutaPuntoService = async (
  idVersion,
  {
    codigo,
    nombre,
    descripcion = null,
    tipo_punto = 'RECOLECCION',
    latitud,
    longitud,
    orden,
    radio_atencion_metros = 30,
    tiempo_estimado_min = null,
    obligatorio = true,
  } = {},
) => {
  const versionId = validateId(idVersion, 'identificador de la versión');

  const normalizedCode = normalizeCode(codigo);
  const normalizedName = normalizeText(nombre);

  if (
    !normalizedCode ||
    !normalizedName ||
    latitud == null ||
    longitud == null ||
    orden == null
  ) {
    throw new AppError(
      'Código, nombre, coordenadas y orden son obligatorios.',
      400,
      'ROUTE_POINT_REQUIRED_FIELDS',
    );
  }

  // --------------------------------------------------------
  // VALIDAR Y NORMALIZAR ORDEN
  // --------------------------------------------------------
  const tipoOrdenValido = typeof orden === 'number' || typeof orden === 'string';

  const normalizedOrder = tipoOrdenValido
    ? Number(orden)
    : NaN;

  if (
    !Number.isSafeInteger(normalizedOrder) ||
    normalizedOrder < 1 ||
    normalizedOrder > 4294967295
  ) {
    throw new AppError(
      'El orden debe ser un entero positivo válido.',
      400,
      'INVALID_ROUTE_POINT_ORDER',
    );
  }

  if (
    descripcion !== null &&
    typeof descripcion !== 'string'
  ) {
    throw new AppError(
      'La descripción debe ser una cadena de texto.',
      400,
      'INVALID_ROUTE_POINT_DESCRIPTION',
    );
  }

  // --------------------------------------------------------
  // CREACIÓN Y AUDITORÍA EN LA MISMA TRANSACCIÓN
  // --------------------------------------------------------
  return sequelize.transaction(
    async (transaction) => {
      await getEditableVersion(
        versionId,
        transaction,
      );

      // ----------------------------------------------------
      // COMPROBAR DUPLICADOS NO ELIMINADOS
      // ----------------------------------------------------
      const duplicate = await RutaPunto.findOne({
        where: {
          id_ruta_version: versionId,

          [Op.or]: [
            {
              codigo: normalizedCode,
            },
            {
              orden: normalizedOrder,
            },
          ],
        },

        transaction,
      });

      if (duplicate) {
        const codigoDuplicado =
          duplicate.codigo === normalizedCode;

        throw new AppError(
          codigoDuplicado
            ? 'El código del punto ya existe en esta versión.'
            : 'El orden del punto ya existe en esta versión.',
          409,
          codigoDuplicado
            ? 'ROUTE_POINT_CODE_ALREADY_EXISTS'
            : 'ROUTE_POINT_ORDER_ALREADY_EXISTS',
        );
      }

      // ----------------------------------------------------
      // PREPARAR AUDITORÍA ANTES DE CREAR
      // ----------------------------------------------------
      const auditarPunto = prepararAuditoria(
        'PUNTO',
        'CREAR',
        null,
      );

      // ----------------------------------------------------
      // CREAR PUNTO
      // ----------------------------------------------------
      const punto = await RutaPunto.create(
        {
          id_ruta_version: versionId,
          codigo: normalizedCode,
          nombre: normalizedName,
          descripcion: descripcion?.trim() || null,

          tipo_punto,
          latitud,
          longitud,
          orden: normalizedOrder,

          radio_atencion_metros,
          tiempo_estimado_min,
          obligatorio,
          estado: true,
        },
        {
          transaction,
        },
      );

      // ----------------------------------------------------
      // REGISTRAR AUDITORÍA
      // ----------------------------------------------------
      await auditarPunto(
        punto,
        transaction,
        {
          motivo:
            `Creación de un punto en la versión #${versionId}.`,
        },
      );

      return punto;
    },
  );
};

module.exports = createRutaPuntoService;