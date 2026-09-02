const { Op } = require('sequelize');
const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Modelos
const {
  PersonalOperativo,
} = db;


// Utils
const getPersonalIncludes = require('../../utils/personal/personal_includes.utils');

const {
  parseBoolean,
} = require('../../utils/personal/personal.util');

const {
  TIPOS_CONTRATO,
  ESTADOS_LABORALES,
} = require("../../utils/personal/personal_constantes.utils");


// ==========================================
// SERVICE: Listar personal
// ==========================================

const getPersonalPaginatedService = async ({
  page = 1,
  limit = 10,
  search = '',
  estado,
  estado_laboral,
  tipo_contrato,
  rol,
}) => {
  const pagina = Number(page);
  const limite = Number(limit);

  if (
    !Number.isInteger(pagina) ||
    pagina < 1 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 100
  ) {
    throw new AppError(
      'Los parámetros de paginación no son válidos.',
      400,
      'INVALID_PAGINATION',
    );
  }

  const where = {};
  const searchValue =
    String(search || '').trim();

  if (searchValue) {
    where[Op.or] = [
      {
        codigo_empleado: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$usuario.username$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$usuario.email_acceso$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$usuario.persona.nombres$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$usuario.persona.apellidos$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$usuario.persona.numero_documento$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
    ];
  }

  if (
    estado !== undefined &&
    estado !== ''
  ) {
    where.estado =
      parseBoolean(
        estado,
        'estado',
      );
  }

  if (estado_laboral) {
    if (
      !ESTADOS_LABORALES.includes(
        estado_laboral,
      )
    ) {
      throw new AppError(
        'El estado laboral no es válido.',
        400,
        'INVALID_EMPLOYMENT_STATUS',
      );
    }

    where.estado_laboral =
      estado_laboral;
  }

  if (tipo_contrato) {
    if (
      !TIPOS_CONTRATO.includes(
        tipo_contrato,
      )
    ) {
      throw new AppError(
        'El tipo de contrato no es válido.',
        400,
        'INVALID_CONTRACT_TYPE',
      );
    }

    where.tipo_contrato =
      tipo_contrato;
  }

  const include =
    getPersonalIncludes();

  if (rol) {
    const roleName =
      String(rol)
        .trim()
        .toUpperCase();

    include[0].include[1].where = {
      estado: true,
      nombre: roleName,
    };

    include[0].include[1].required =
      true;
  }

  const offset =
    (pagina - 1) * limite;

  const { count, rows } =
    await PersonalOperativo
      .findAndCountAll({
        where,
        include,
        distinct: true,
        col: 'id_personal',
        subQuery: false,
        limit: limite,
        offset,
        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

  const totalPages =
    Math.ceil(count / limite);

  return {
    items: rows,

    pagination: {
      total: count,
      page: pagina,
      limit: limite,
      total_pages:
        totalPages,

      has_next_page:
        pagina < totalPages,

      has_previous_page:
        pagina > 1,
    },
  };
};


module.exports = getPersonalPaginatedService;