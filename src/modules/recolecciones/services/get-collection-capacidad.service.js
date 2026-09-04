const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validaciones
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  Recorrido,
  ProgramacionRuta,
  Vehiculo,
  RecoleccionPunto,
} = db;

// =======================================================
// Constantes
// =======================================================
const UNIT_ALIASES = {
  KG: 'KG',
  KILOGRAMO: 'KG',
  KILOGRAMOS: 'KG',
  TON: 'TONELADA',
  TONELADA: 'TONELADA',
  TONELADAS: 'TONELADA',
  L: 'LITRO',
  LT: 'LITRO',
  LITRO: 'LITRO',
  LITROS: 'LITRO',
  M3: 'M3',
  METRO_CUBICO: 'M3',
  METROS_CUBICOS: 'M3',
};

// =======================================================
// Normalizar unidad
// =======================================================

const normalizeUnit = (
  value,
) => {
  if (!value) {
    return null;
  }

  const normalizedValue =
    String(value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

  return (
    UNIT_ALIASES[
    normalizedValue
    ] ||
    null
  );
};

// =======================================================
// Convertir cantidad
// =======================================================

const convertAmount = ({
  amount,
  sourceUnit,
  targetUnit,
}) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount,
    ) ||
    numericAmount < 0
  ) {
    return null;
  }

  if (
    sourceUnit ===
    targetUnit
  ) {
    return numericAmount;
  }

  /*
  |--------------------------------------------------------------------------
  | Conversiones de masa
  |--------------------------------------------------------------------------
  */

  if (
    sourceUnit ===
    'TONELADA' &&
    targetUnit ===
    'KG'
  ) {
    return (
      numericAmount *
      1000
    );
  }

  if (
    sourceUnit ===
    'KG' &&
    targetUnit ===
    'TONELADA'
  ) {
    return (
      numericAmount /
      1000
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Conversiones de volumen
  |--------------------------------------------------------------------------
  */

  if (
    sourceUnit ===
    'M3' &&
    targetUnit ===
    'LITRO'
  ) {
    return (
      numericAmount *
      1000
    );
  }

  if (
    sourceUnit ===
    'LITRO' &&
    targetUnit ===
    'M3'
  ) {
    return (
      numericAmount /
      1000
    );
  }

  /*
  | No es posible convertir masa a volumen
  | sin conocer la densidad del residuo.
  */

  return null;
};

// =======================================================
// Determinar estado de capacidad
// =======================================================

const getCapacityStatus = (
  percentage,
) => {
  if (percentage > 100) {
    return 'SOBRECARGA';
  }

  if (percentage >= 100) {
    return 'COMPLETO';
  }

  if (percentage >= 80) {
    return 'ADVERTENCIA';
  }

  return 'NORMAL';
};

// =======================================================
// Service: Obtener capacidad del vehículo del recorrido
// =======================================================
const getRecorridoCapacidadService = async (idRecorrido) => {
  const recorridoId =
    validateId(
      idRecorrido,
      'identificador del recorrido',
    );

  // ---------------------------------------------------
  // 1. Obtener recorrido
  // ---------------------------------------------------

  const recorrido =
    await Recorrido.findByPk(
      recorridoId,
      {
        attributes: [
          'id_recorrido',
          'id_programacion',
          'estado_recorrido',
          'fecha_hora_inicio',
          'fecha_hora_finalizacion',
        ],
      },
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  // ---------------------------------------------------
  // 2. Obtener programación
  // ---------------------------------------------------

  const programacion =
    await ProgramacionRuta
      .findByPk(
        recorrido
          .id_programacion,
        {
          attributes: [
            'id_programacion',
            'id_vehiculo',
            'id_ruta',
            'id_ruta_version',
            'estado_programacion',
          ],
        },
      );

  if (!programacion) {
    throw new AppError(
      'La programación asociada no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  // ---------------------------------------------------
  // 3. Obtener vehículo
  // ---------------------------------------------------

  const vehiculo =
    await Vehiculo.findByPk(
      programacion
        .id_vehiculo,
      {
        attributes: [
          'id_vehiculo',
          'placa',
          'capacidad_maxima',
          'unidad_capacidad',
        ],
      },
    );

  if (!vehiculo) {
    throw new AppError(
      'El vehículo asignado no fue encontrado.',
      404,
      'VEHICLE_NOT_FOUND',
    );
  }

  const maximumCapacity =
    Number(
      vehiculo
        .capacidad_maxima,
    );

  const capacityUnit =
    normalizeUnit(
      vehiculo
        .unidad_capacidad,
    );

  if (
    !Number.isFinite(
      maximumCapacity,
    ) ||
    maximumCapacity <= 0 ||
    !capacityUnit
  ) {
    throw new AppError(
      'El vehículo no tiene una capacidad válida configurada.',
      409,
      'VEHICLE_CAPACITY_NOT_CONFIGURED',
    );
  }

  // ---------------------------------------------------
  // 4. Obtener recolecciones activas
  // ---------------------------------------------------

  const collections =
    await RecoleccionPunto
      .findAll({
        where: {
          id_recorrido:
            recorridoId,

          estado_recoleccion:
            'REGISTRADA',
        },

        attributes: [
          'id_recoleccion',
          'cantidad_recolectada',
          'unidad_medida',
        ],

        raw:
          true,
      });

  // ---------------------------------------------------
  // 5. Acumular cantidades compatibles
  // ---------------------------------------------------

  let collectedAmount = 0;
  let collectionsWithAmount = 0;
  let collectionsWithoutAmount = 0;

  const incompatibleCollections =
    [];

  for (
    const collection
    of collections
  ) {
    if (
      collection
        .cantidad_recolectada ===
      null ||
      collection
        .cantidad_recolectada ===
      undefined ||
      !collection
        .unidad_medida
    ) {
      collectionsWithoutAmount +=
        1;

      continue;
    }

    const collectionUnit =
      normalizeUnit(
        collection
          .unidad_medida,
      );

    const convertedAmount =
      convertAmount({
        amount:
          collection
            .cantidad_recolectada,

        sourceUnit:
          collectionUnit,

        targetUnit:
          capacityUnit,
      });

    if (
      convertedAmount ===
      null
    ) {
      incompatibleCollections
        .push({
          id_recoleccion:
            collection
              .id_recoleccion,

          cantidad:
            Number(
              collection
                .cantidad_recolectada,
            ),

          unidad:
            collection
              .unidad_medida,
        });

      continue;
    }

    collectedAmount +=
      convertedAmount;

    collectionsWithAmount +=
      1;
  }

  // ---------------------------------------------------
  // 6. Evitar resultados engañosos
  // ---------------------------------------------------

  if (
    incompatibleCollections
      .length > 0
  ) {
    throw new AppError(
      `Existen ${incompatibleCollections.length} recolecciones con unidades incompatibles con la capacidad del vehículo.`,
      409,
      'INCOMPATIBLE_COLLECTION_UNITS',
      {
        unidad_capacidad:
          capacityUnit,

        recolecciones:
          incompatibleCollections,
      },
    );
  }

  // ---------------------------------------------------
  // 7. Calcular porcentaje
  // ---------------------------------------------------

  const percentage =
    Number(
      (
        collectedAmount /
        maximumCapacity *
        100
      ).toFixed(2),
    );

  const remainingCapacity =
    Math.max(
      maximumCapacity -
      collectedAmount,
      0,
    );

  const excessAmount =
    Math.max(
      collectedAmount -
      maximumCapacity,
      0,
    );

  const status =
    getCapacityStatus(
      percentage,
    );

  // ---------------------------------------------------
  // 8. Construir respuesta
  // ---------------------------------------------------

  return {
    id_recorrido:
      recorridoId,

    estado_recorrido:
      recorrido
        .estado_recorrido,

    vehiculo: {
      id_vehiculo:
        vehiculo
          .id_vehiculo,

      placa:
        vehiculo.placa,

      capacidad_maxima:
        maximumCapacity,

      unidad_capacidad:
        capacityUnit,
    },

    capacidad: {
      cantidad_acumulada:
        Number(
          collectedAmount
            .toFixed(3),
        ),

      capacidad_restante:
        Number(
          remainingCapacity
            .toFixed(3),
        ),

      cantidad_excedida:
        Number(
          excessAmount
            .toFixed(3),
        ),

      porcentaje:
        percentage,

      estado:
        status,

      umbral_advertencia:
        80,

      capacidad_completa:
        percentage >= 100,

      existe_sobrecarga:
        percentage > 100,
    },

    recolecciones: {
      total:
        collections.length,

      con_cantidad:
        collectionsWithAmount,

      sin_cantidad:
        collectionsWithoutAmount,
    },
  };
};

module.exports = getRecorridoCapacidadService;