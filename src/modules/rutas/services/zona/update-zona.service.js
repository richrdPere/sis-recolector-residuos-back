const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const getZonaByIdService = require("./get-zona-by-id.service");

// Utils
const {
    validateId,
    normalizeCode,
    normalizeText,
} = require('../../utils/rutas-service.utils');

// Modelos
const { Zona } = db;

// ===============================================
// SERVICE: Actualizar zona 
// ===============================================
const updateZonaService = async (
    idZona,
    payload,
) => {
    const id = validateId(
        idZona,
        'identificador de la zona',
    );

    const zona =
        await Zona.findByPk(id);

    if (!zona) {
        throw new AppError(
            'La zona no fue encontrada.',
            404,
            'ZONE_NOT_FOUND',
        );
    }

    const data = {};

    if (
        payload.codigo !==
        undefined
    ) {
        const codigo =
            normalizeCode(
                payload.codigo,
            );

        if (!codigo) {
            throw new AppError(
                'El código no puede estar vacío.',
                400,
                'ZONE_CODE_REQUIRED',
            );
        }

        const duplicada =
            await Zona.findOne({
                where: {
                    codigo,

                    id_zona: {
                        [Op.ne]: id,
                    },
                },

                paranoid: false,
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

    if (
        payload.nombre !==
        undefined
    ) {
        const nombre =
            normalizeText(
                payload.nombre,
            );

        if (!nombre) {
            throw new AppError(
                'El nombre no puede estar vacío.',
                400,
                'ZONE_NAME_REQUIRED',
            );
        }

        const duplicada =
            await Zona.findOne({
                where: {
                    nombre,

                    id_zona: {
                        [Op.ne]: id,
                    },
                },

                paranoid: false,
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

    const optionalFields = [
        'color',
        'poligono_geojson',
        'centro_latitud',
        'centro_longitud',
    ];

    optionalFields.forEach(
        (field) => {
            if (
                payload[field] !==
                undefined
            ) {
                data[field] =
                    payload[field];
            }
        },
    );

    if (
        payload.descripcion !==
        undefined
    ) {
        data.descripcion =
            payload.descripcion
                ?.trim() || null;
    }

    if (!Object.keys(data).length) {
        throw new AppError(
            'No se proporcionaron campos para actualizar.',
            400,
            'NO_UPDATE_FIELDS',
        );
    }

    await zona.update(data);

    return getZonaByIdService(
        id,
    );
};

module.exports = updateZonaService;