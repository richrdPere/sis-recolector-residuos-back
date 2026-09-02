const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

const getVehiculosServicePaginado = async ({
    page = 1,
    limit = 10,
    search = '',
    estado,
    estado_operativo,
    tipo_vehiculo,
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

    const textoBusqueda = String(search || '').trim();

    if (textoBusqueda) {
        where[Op.or] = [
            {
                codigo: {
                    [Op.like]: `%${textoBusqueda}%`,
                },
            },
            {
                placa: {
                    [Op.like]: `%${textoBusqueda}%`,
                },
            },
            {
                marca: {
                    [Op.like]: `%${textoBusqueda}%`,
                },
            },
            {
                modelo: {
                    [Op.like]: `%${textoBusqueda}%`,
                },
            },
        ];
    }

    if (estado !== undefined && estado !== '') {
        where.estado =
            estado === true ||
            estado === 'true' ||
            estado === '1';
    }

    if (estado_operativo) {
        where.estado_operativo = estado_operativo;
    }

    if (tipo_vehiculo) {
        where.tipo_vehiculo = tipo_vehiculo;
    }

    const offset = (pagina - 1) * limite;

    const { count, rows } =
        await Vehiculo.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [
                ['created_at', 'DESC'],
            ],
            distinct: true,
        });

    return {
        vehiculos: rows,
        pagination: {
            total: count,
            page: pagina,
            limit: limite,
            total_pages: Math.ceil(count / limite),
            has_next_page:
                pagina < Math.ceil(count / limite),
            has_previous_page:
                pagina > 1,
        },
    };
};

module.exports = getVehiculosServicePaginado;