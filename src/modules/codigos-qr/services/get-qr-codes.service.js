// services/get-qr-codes.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');

// Validations
const {
  validateId,
  validateResourceType,
  validateQrState,
} = require(
  '../validations/codigo-qr.validation',
);

// Utils
const {
  buildPublicQrUrl,
} = require(
  '../utils/codigo-qr-service.utils',
);

// Modelos
const {
  CodigoQr,
} = db;

// ===============================================
// SERVICE: Obtener codigos QR
// ===============================================
const getQrCodesService = async ({
  page = 1,
  limit = 20,
  search = null,
  tipo_recurso = null,
  id_zona = null,
  id_ruta = null,
  estado_qr = null,
}) => {
  const normalizedPage =
    Math.max(
      Number(page) || 1,
      1,
    );

  const normalizedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1,
      ),
      100,
    );

  const where = {};

  if (search?.trim()) {
    const searchValue =
      search.trim();

    where[Op.or] = [
      {
        codigo: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        titulo: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        descripcion: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
    ];
  }

  if (tipo_recurso) {
    where.tipo_recurso =
      validateResourceType(
        tipo_recurso,
      );
  }

  if (id_zona) {
    where.id_zona =
      validateId(
        id_zona,
        'identificador de la zona',
      );
  }

  if (id_ruta) {
    where.id_ruta =
      validateId(
        id_ruta,
        'identificador de la ruta',
      );
  }

  if (estado_qr) {
    where.estado_qr =
      validateQrState(
        estado_qr,
      );
  }

  const {
    rows,
    count,
  } =
    await CodigoQr
      .findAndCountAll({
        where,

        include: [
          {
            association:
              'zona',

            required:
              false,
          },
          {
            association:
              'ruta',

            required:
              false,
          },
          {
            association:
              'usuario_creacion',

            attributes: [
              'id_usuario',
              'username',
            ],

            required:
              false,
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit:
          normalizedLimit,

        offset:
          (
            normalizedPage -
            1
          ) *
          normalizedLimit,

        distinct: true,
      });

  const items =
    rows.map(
      (codigoQr) => {
        const item =
          codigoQr.toJSON();

        return {
          ...item,

          url_publica:
            buildPublicQrUrl(
              item
                .token_publico,
            ),
        };
      },
    );

  return {
    items,

    pagination: {
      page:
        normalizedPage,

      limit:
        normalizedLimit,

      total:
        count,

      total_pages:
        Math.ceil(
          count /
          normalizedLimit,
        ),
    },
  };
};

module.exports = getQrCodesService;