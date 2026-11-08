const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Auditoría
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  Vehiculo,
  sequelize,
} = db;

// *********************************************************
// CONSTANTES
// *********************************************************

const ESTADOS_OPERATIVOS = [
  'DISPONIBLE',
  'ASIGNADO',
  'EN_RUTA',
  'EN_MANTENIMIENTO',
  'FUERA_DE_SERVICIO',
];

const TIPOS_VEHICULO = [
  'CAMION_COMPACTADOR',
  'CAMION_BARANDA',
  'CAMION_VOLQUETE',
  'MOTOFURGON',
  'OTRO',
];

const UNIDADES_CAPACIDAD = [
  'KILOGRAMO',
  'TONELADA',
  'METRO_CUBICO',
];

// *********************************************************
// SERVICE: CREAR VEHÍCULO
// *********************************************************

const createVehiculoService = async ({
  codigo,
  placa,
  marca,
  modelo,
  anio = null,
  color = null,
  tipo_vehiculo,
  capacidad_maxima,
  unidad_capacidad,
  kilometraje = 0,
  estado_operativo = 'DISPONIBLE',
  observacion = null,
  foto_url = null,
  estado = true,
}) => {

  // -----------------------------------------------------
  // 1. NORMALIZACIÓN
  // -----------------------------------------------------

  const codigoNormalizado = String(codigo || '')
    .trim()
    .toUpperCase();

  const placaNormalizada = String(placa || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  const marcaNormalizada = String(marca || '').trim();
  const modeloNormalizado = String(modelo || '').trim();

  // -----------------------------------------------------
  // 2. VALIDACIONES
  // -----------------------------------------------------

  if (
    !codigoNormalizado ||
    !placaNormalizada ||
    !marcaNormalizada ||
    !modeloNormalizado ||
    !tipo_vehiculo ||
    capacidad_maxima === undefined ||
    capacidad_maxima === null ||
    !unidad_capacidad
  ) {
    throw new AppError(
      'Código, placa, marca, modelo, tipo, capacidad y unidad son obligatorios.',
      400,
      'VEHICLE_REQUIRED_FIELDS',
    );
  }

  if (!TIPOS_VEHICULO.includes(tipo_vehiculo)) {
    throw new AppError(
      'El tipo de vehículo no es válido.',
      400,
      'INVALID_VEHICLE_TYPE',
    );
  }

  if (!UNIDADES_CAPACIDAD.includes(unidad_capacidad)) {
    throw new AppError(
      'La unidad de capacidad no es válida.',
      400,
      'INVALID_CAPACITY_UNIT',
    );
  }

  if (!ESTADOS_OPERATIVOS.includes(estado_operativo)) {
    throw new AppError(
      'El estado operativo no es válido.',
      400,
      'INVALID_OPERATIONAL_STATUS',
    );
  }

  const capacidad = Number(capacidad_maxima);
  const kilometrajeActual = Number(kilometraje);

  if (!Number.isFinite(capacidad) || capacidad <= 0) {
    throw new AppError(
      'La capacidad máxima debe ser mayor que cero.',
      400,
      'INVALID_MAX_CAPACITY',
    );
  }

  if (
    !Number.isFinite(kilometrajeActual) ||
    kilometrajeActual < 0
  ) {
    throw new AppError(
      'El kilometraje no puede ser negativo.',
      400,
      'INVALID_MILEAGE',
    );
  }

  if (anio !== null && anio !== undefined) {
    const anioNumero = Number(anio);
    const anioMaximo = new Date().getFullYear() + 1;

    if (
      !Number.isInteger(anioNumero) ||
      anioNumero < 1950 ||
      anioNumero > anioMaximo
    ) {
      throw new AppError(
        `El año debe estar entre 1950 y ${anioMaximo}.`,
        400,
        'INVALID_VEHICLE_YEAR',
      );
    }
  }

  // -----------------------------------------------------
  // 3. TRANSACCIÓN: VEHÍCULO + AUDITORÍA
  // -----------------------------------------------------

  return sequelize.transaction(async transaction => {

    const vehiculoExistente = await Vehiculo.findOne({
      where: {
        [Op.or]: [
          { codigo: codigoNormalizado },
          { placa: placaNormalizada },
        ],
      },

      paranoid: false,
      transaction,
    });

    if (vehiculoExistente) {
      if (vehiculoExistente.codigo === codigoNormalizado) {
        throw new AppError(
          'Ya existe un vehículo con el código proporcionado.',
          409,
          'VEHICLE_CODE_ALREADY_EXISTS',
        );
      }

      throw new AppError(
        'Ya existe un vehículo con la placa proporcionada.',
        409,
        'VEHICLE_PLATE_ALREADY_EXISTS',
      );
    }

    // En creación no existe una instancia anterior.
    // El actor se obtiene del contexto autenticado.
    const auditarVehiculo = prepararAuditoria(
      'VEHICULO',
      'CREAR',
    );

    // -------------------------------------------------
    // 4. CREAR VEHÍCULO
    // -------------------------------------------------

    const vehiculo = await Vehiculo.create(
      {
        codigo: codigoNormalizado,
        placa: placaNormalizada,
        marca: marcaNormalizada,
        modelo: modeloNormalizado,
        anio: anio || null,
        color: color?.trim() || null,
        tipo_vehiculo,
        capacidad_maxima: capacidad,
        unidad_capacidad,
        kilometraje: kilometrajeActual,
        estado_operativo,
        observacion: observacion?.trim() || null,
        foto_url: foto_url?.trim() || null,
        estado: Boolean(estado),
      },
      {
        transaction,
      },
    );

    // Recupera los valores persistidos, incluyendo
    // la representación final de los campos DECIMAL.
    await vehiculo.reload({
      transaction,
    });

    // -------------------------------------------------
    // 5. REGISTRAR AUDITORÍA
    // -------------------------------------------------

    await auditarVehiculo(
      vehiculo,
      transaction,
    );

    // Sequelize confirma la transacción al completar
    // este callback; ante un error, revierte ambos registros.
    return vehiculo;
  });
};

module.exports = createVehiculoService;