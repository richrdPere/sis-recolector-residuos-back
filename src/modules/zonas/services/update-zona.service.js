const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Service
const getZonaByIdService = require('./get-zona-by-id.service');

// Utils
const {
  validateId,
  normalizeCode,
  normalizeText,
} = require('../../rutas/utils/rutas-service.utils');

// Auditoría
const {
  prepararAuditoria,
} = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Zona,
  sequelize,
} = db;

// *********************************************************
// SERVICE: ACTUALIZAR ZONA
// *********************************************************

const updateZonaService = async (
  idZona,
  payload,
) => {
  const id = validateId(
    idZona,
    'identificador de la zona',
  );

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new AppError(
      'Los datos de la zona deben ser un objeto.',
      400,
      'INVALID_ZONE_PAYLOAD',
    );
  }

  await sequelize.transaction(async transaction => {

    // -------------------------------------------------
    // 1. OBTENER Y BLOQUEAR ZONA
    // -------------------------------------------------

    const zona = await Zona.findByPk(
      id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!zona) {
      throw new AppError(
        'La zona no fue encontrada.',
        404,
        'ZONE_NOT_FOUND',
      );
    }

    const data = {};

    // -------------------------------------------------
    // 2. VALIDAR CÓDIGO
    // -------------------------------------------------

    if (payload.codigo !== undefined) {
      const codigo = normalizeCode(
        payload.codigo,
      );

      if (!codigo) {
        throw new AppError(
          'El código no puede estar vacío.',
          400,
          'ZONE_CODE_REQUIRED',
        );
      }

      const duplicada = await Zona.findOne({
        where: {
          codigo,
          id_zona: {
            [Op.ne]: id,
          },
        },
        paranoid: false,
        transaction,
      });

      if (duplicada) {
        throw new AppError(
          'El código de la zona ya está registrado.',
          409,
          'ZONE_CODE_ALREADY_EXISTS',
        );
      }

      data.codigo = codigo;
    }

    // -------------------------------------------------
    // 3. VALIDAR NOMBRE
    // -------------------------------------------------

    if (payload.nombre !== undefined) {
      const nombre = normalizeText(
        payload.nombre,
      );

      if (!nombre) {
        throw new AppError(
          'El nombre no puede estar vacío.',
          400,
          'ZONE_NAME_REQUIRED',
        );
      }

      const duplicada = await Zona.findOne({
        where: {
          nombre,
          id_zona: {
            [Op.ne]: id,
          },
        },
        paranoid: false,
        transaction,
      });

      if (duplicada) {
        throw new AppError(
          'El nombre de la zona ya está registrado.',
          409,
          'ZONE_NAME_ALREADY_EXISTS',
        );
      }

      data.nombre = nombre;
    }

    // -------------------------------------------------
    // 4. CAMPOS OPCIONALES
    // -------------------------------------------------

    const optionalFields = [
      'color',
      'poligono_geojson',
      'centro_latitud',
      'centro_longitud',
    ];

    for (const field of optionalFields) {
      if (payload[field] !== undefined) {
        data[field] = payload[field];
      }
    }

    if (payload.descripcion !== undefined) {
      if (
        payload.descripcion !== null &&
        typeof payload.descripcion !== 'string'
      ) {
        throw new AppError(
          'La descripción debe ser un texto o null.',
          400,
          'INVALID_ZONE_DESCRIPTION',
        );
      }

      data.descripcion =
        payload.descripcion?.trim() || null;
    }

    if (!Object.keys(data).length) {
      throw new AppError(
        'No se proporcionaron campos para actualizar.',
        400,
        'NO_UPDATE_FIELDS',
      );
    }

    // -------------------------------------------------
    // 5. CAPTURAR ESTADO ANTERIOR
    // -------------------------------------------------

    const auditarZona = prepararAuditoria(
      'ZONA',
      'ACTUALIZAR',
      zona,
    );

    // -------------------------------------------------
    // 6. ACTUALIZAR ZONA
    // -------------------------------------------------

    await zona.update(
      data,
      { transaction },
    );

    await zona.reload({
      transaction,
    });

    // -------------------------------------------------
    // 7. REGISTRAR AUDITORÍA
    // -------------------------------------------------

    await auditarZona(
      zona,
      transaction,
    );
  });

  // La transacción ya está confirmada.
  // Conservamos la estructura de respuesta del service actual.
  return getZonaByIdService(id);
};

module.exports = updateZonaService;