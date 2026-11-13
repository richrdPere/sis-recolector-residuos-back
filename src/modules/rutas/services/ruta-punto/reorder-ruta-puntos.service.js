const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  validateId,
} = require('../../utils/rutas-service.utils');

const getEditableVersion = require(
  '../../utils/ruta-horario/ruta-punto.utils',
);

// Auditoría
const {
  prepararAuditoria,
} = require('../../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  RutaPunto,
  sequelize,
} = db;

// Límite de INTEGER UNSIGNED.
const MAX_ORDEN = 4294967295;

// Preservar identificadores BIGINT recibidos como string.
const normalizarIdPunto = (valor) => {
  const tipoValido =
    typeof valor === 'string' ||
    (
      typeof valor === 'number' &&
      Number.isSafeInteger(valor)
    );

  const id = tipoValido
    ? String(valor).trim()
    : '';

  if (!/^[1-9]\d*$/.test(id)) {
    throw new AppError(
      'El identificador del punto no es válido.',
      400,
      'INVALID_ROUTE_POINT_ID',
    );
  }

  return id;
};

// ===============================================
// SERVICE: REORDENAR PUNTOS DE RUTA
// ===============================================
const reorderRutaPuntosService = async (
  idVersion,
  puntos,
) => {
  const versionId = validateId(
    idVersion,
    'identificador de la versión',
  );

  if (
    !Array.isArray(puntos) ||
    !puntos.length
  ) {
    throw new AppError(
      'Debe proporcionar los puntos que serán reordenados.',
      400,
      'ROUTE_POINTS_REQUIRED',
    );
  }

  // --------------------------------------------------------
  // 1. VALIDAR SOLICITUD
  // --------------------------------------------------------
  const solicitud = puntos.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new AppError(
        'Cada punto debe ser un objeto válido.',
        400,
        'INVALID_ROUTE_POINT_DATA',
      );
    }

    const id = normalizarIdPunto(
      item.id_ruta_punto,
    );

    const tipoOrdenValido =
      typeof item.orden === 'number' ||
      typeof item.orden === 'string';

    const orden = tipoOrdenValido
      ? Number(item.orden)
      : NaN;

    if (
      !Number.isSafeInteger(orden) ||
      orden < 1 ||
      orden > MAX_ORDEN
    ) {
      throw new AppError(
        'Los órdenes deben ser enteros positivos válidos.',
        400,
        'INVALID_ROUTE_POINT_ORDER',
      );
    }

    return { id, orden };
  });

  const idsSolicitados = new Set(
    solicitud.map((item) => item.id),
  );

  const ordenesSolicitados = new Set(
    solicitud.map((item) => item.orden),
  );

  if (
    idsSolicitados.size !== solicitud.length ||
    ordenesSolicitados.size !== solicitud.length
  ) {
    throw new AppError(
      'Los identificadores y órdenes no pueden repetirse.',
      400,
      'INVALID_ROUTE_POINT_ORDER',
    );
  }

  return sequelize.transaction(
    async (transaction) => {
      // ----------------------------------------------------
      // 2. BLOQUEAR Y VALIDAR LA VERSIÓN
      // ----------------------------------------------------
      await getEditableVersion(
        versionId,
        transaction,
      );

      // Incluir inactivos y eliminados porque también
      // participan del índice único de orden.
      const todosLosPuntos = await RutaPunto.findAll({
        where: {
          id_ruta_version: versionId,
        },

        paranoid: false,
        transaction,
        lock: transaction.LOCK.UPDATE,

        order: [
          ['id_ruta_punto', 'ASC'],
        ],
      });

      const puntosActivos = todosLosPuntos.filter(
        (punto) =>
          punto.estado &&
          punto.deleted_at == null,
      );

      // ----------------------------------------------------
      // 3. VALIDAR CANTIDAD Y PERTENENCIA
      // ----------------------------------------------------
      if (
        puntosActivos.length !== solicitud.length
      ) {
        throw new AppError(
          'Debe enviar todos los puntos activos de la versión.',
          400,
          'ALL_ROUTE_POINTS_REQUIRED',
        );
      }

      const puntosPorId = new Map(
        puntosActivos.map((punto) => [
          String(punto.id_ruta_punto),
          punto,
        ]),
      );

      if (
        solicitud.some(
          (item) => !puntosPorId.has(item.id),
        )
      ) {
        throw new AppError(
          'Uno o más puntos no pertenecen a los puntos activos de la versión.',
          400,
          'ROUTE_POINT_VERSION_MISMATCH',
        );
      }

      // ----------------------------------------------------
      // 4. DETECTAR ÓRDENES RESERVADOS
      // ----------------------------------------------------
      const ordenesReservados = new Set(
        todosLosPuntos
          .filter(
            (punto) =>
              punto.deleted_at == null &&
              !idsSolicitados.has(
                String(punto.id_ruta_punto),
              ),
          )
          .map((punto) => Number(punto.orden)),
      );

      const conflicto = solicitud.find(
        (item) =>
          ordenesReservados.has(item.orden),
      );

      if (conflicto) {
        throw new AppError(
          `El orden ${conflicto.orden} está reservado por un punto inactivo de esta versión.`,
          409,
          'ROUTE_POINT_ORDER_RESERVED',
        );
      }

      // ----------------------------------------------------
      // 5. IDENTIFICAR CAMBIOS Y PREPARAR AUDITORÍA
      // ----------------------------------------------------
      const cambios = solicitud
        .filter(
          (item) =>
            Number(
              puntosPorId.get(item.id).orden,
            ) !== item.orden,
        )
        .map((item) => {
          const punto = puntosPorId.get(item.id);

          return {
            punto,
            ordenFinal: item.orden,

            auditar: prepararAuditoria(
              'PUNTO',
              'REORDENAR',
              punto,
            ),
          };
        });

      // ----------------------------------------------------
      // 6. ASIGNAR ÓRDENES TEMPORALES LIBRES
      // Excluir tanto los actuales como los definitivos.
      // ----------------------------------------------------
      const ordenesNoDisponibles = new Set([
        ...todosLosPuntos.map(
          (punto) => Number(punto.orden),
        ),

        ...ordenesSolicitados,
      ]);

      let candidato = 1;

      const movimientos = cambios.map(
        (cambio) => {
          while (
            candidato <= MAX_ORDEN &&
            ordenesNoDisponibles.has(candidato)
          ) {
            candidato++;
          }

          if (candidato > MAX_ORDEN) {
            throw new AppError(
              'No hay órdenes temporales disponibles para completar el reordenamiento.',
              409,
              'ROUTE_POINT_TEMPORARY_ORDER_UNAVAILABLE',
            );
          }

          const ordenTemporal = candidato;

          ordenesNoDisponibles.add(
            ordenTemporal,
          );

          candidato++;

          return {
            ...cambio,
            ordenTemporal,
          };
        },
      );

      // ----------------------------------------------------
      // 7. PRIMERA FASE: ÓRDENES TEMPORALES
      // ----------------------------------------------------
      for (const movimiento of movimientos) {
        await movimiento.punto.update(
          {
            orden: movimiento.ordenTemporal,
          },
          {
            transaction,
          },
        );
      }

      // ----------------------------------------------------
      // 8. SEGUNDA FASE: ÓRDENES DEFINITIVOS
      // ----------------------------------------------------
      for (const movimiento of movimientos) {
        await movimiento.punto.update(
          {
            orden: movimiento.ordenFinal,
          },
          {
            transaction,
          },
        );
      }

      // ----------------------------------------------------
      // 9. AUDITAR DEL ORDEN ORIGINAL AL DEFINITIVO
      // ----------------------------------------------------
      for (const movimiento of movimientos) {
        await movimiento.punto.reload({
          transaction,
        });

        await movimiento.auditar(
          movimiento.punto,
          transaction,
          {
            motivo:
              `Reordenamiento de puntos de la versión #${versionId}.`,
          },
        );
      }

      // ----------------------------------------------------
      // 10. CONSULTAR RESULTADO ANTES DEL COMMIT
      // ----------------------------------------------------
      return RutaPunto.findAll({
        where: {
          id_ruta_version: versionId,
          estado: true,
        },

        order: [
          ['orden', 'ASC'],
        ],

        transaction,
      });
    },
  );
};

module.exports = reorderRutaPuntosService;