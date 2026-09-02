const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

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

const updateVehiculoService = async (
    idVehiculo,
    payload,
) => {
    const id = Number(idVehiculo);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(
            'El identificador del vehículo no es válido.',
            400,
            'INVALID_VEHICLE_ID',
        );
    }

    const vehiculo = await Vehiculo.findByPk(id);

    if (!vehiculo) {
        throw new AppError(
            'El vehículo no fue encontrado.',
            404,
            'VEHICLE_NOT_FOUND',
        );
    }

    const data = {};

    if (payload.codigo !== undefined) {
        const codigo = String(payload.codigo)
            .trim()
            .toUpperCase();

        if (!codigo) {
            throw new AppError(
                'El código no puede estar vacío.',
                400,
                'VEHICLE_CODE_REQUIRED',
            );
        }

        data.codigo = codigo;
    }

    if (payload.placa !== undefined) {
        const placa = String(payload.placa)
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '');

        if (!placa) {
            throw new AppError(
                'La placa no puede estar vacía.',
                400,
                'VEHICLE_PLATE_REQUIRED',
            );
        }

        data.placa = placa;
    }

    if (data.codigo || data.placa) {
        const condiciones = [];

        if (data.codigo) {
            condiciones.push({
                codigo: data.codigo,
            });
        }

        if (data.placa) {
            condiciones.push({
                placa: data.placa,
            });
        }

        const duplicado = await Vehiculo.findOne({
            where: {
                id_vehiculo: {
                    [Op.ne]: id,
                },
                [Op.or]: condiciones,
            },
            paranoid: false,
        });

        if (duplicado) {
            if (
                data.codigo &&
                duplicado.codigo === data.codigo
            ) {
                throw new AppError(
                    'Ya existe otro vehículo con ese código.',
                    409,
                    'VEHICLE_CODE_ALREADY_EXISTS',
                );
            }

            throw new AppError(
                'Ya existe otro vehículo con esa placa.',
                409,
                'VEHICLE_PLATE_ALREADY_EXISTS',
            );
        }
    }

    if (payload.marca !== undefined) {
        data.marca = String(payload.marca).trim();

        if (!data.marca) {
            throw new AppError(
                'La marca no puede estar vacía.',
                400,
                'VEHICLE_BRAND_REQUIRED',
            );
        }
    }

    if (payload.modelo !== undefined) {
        data.modelo = String(payload.modelo).trim();

        if (!data.modelo) {
            throw new AppError(
                'El modelo no puede estar vacío.',
                400,
                'VEHICLE_MODEL_REQUIRED',
            );
        }
    }

    if (payload.anio !== undefined) {
        if (payload.anio === null || payload.anio === '') {
            data.anio = null;
        } else {
            const anio = Number(payload.anio);
            const anioMaximo =
                new Date().getFullYear() + 1;

            if (
                !Number.isInteger(anio) ||
                anio < 1950 ||
                anio > anioMaximo
            ) {
                throw new AppError(
                    `El año debe estar entre 1950 y ${anioMaximo}.`,
                    400,
                    'INVALID_VEHICLE_YEAR',
                );
            }

            data.anio = anio;
        }
    }

    if (payload.tipo_vehiculo !== undefined) {
        if (
            !TIPOS_VEHICULO.includes(
                payload.tipo_vehiculo,
            )
        ) {
            throw new AppError(
                'El tipo de vehículo no es válido.',
                400,
                'INVALID_VEHICLE_TYPE',
            );
        }

        data.tipo_vehiculo =
            payload.tipo_vehiculo;
    }

    if (payload.capacidad_maxima !== undefined) {
        const capacidad =
            Number(payload.capacidad_maxima);

        if (
            !Number.isFinite(capacidad) ||
            capacidad <= 0
        ) {
            throw new AppError(
                'La capacidad máxima debe ser mayor que cero.',
                400,
                'INVALID_MAX_CAPACITY',
            );
        }

        data.capacidad_maxima = capacidad;
    }

    if (payload.unidad_capacidad !== undefined) {
        if (
            !UNIDADES_CAPACIDAD.includes(
                payload.unidad_capacidad,
            )
        ) {
            throw new AppError(
                'La unidad de capacidad no es válida.',
                400,
                'INVALID_CAPACITY_UNIT',
            );
        }

        data.unidad_capacidad =
            payload.unidad_capacidad;
    }

    if (payload.kilometraje !== undefined) {
        const kilometraje =
            Number(payload.kilometraje);

        if (
            !Number.isFinite(kilometraje) ||
            kilometraje < 0
        ) {
            throw new AppError(
                'El kilometraje no puede ser negativo.',
                400,
                'INVALID_MILEAGE',
            );
        }

        if (
            kilometraje <
            Number(vehiculo.kilometraje || 0)
        ) {
            throw new AppError(
                'El nuevo kilometraje no puede ser menor al actual.',
                400,
                'MILEAGE_CANNOT_DECREASE',
            );
        }

        data.kilometraje = kilometraje;
    }

    if (payload.estado_operativo !== undefined) {
        if (
            !ESTADOS_OPERATIVOS.includes(
                payload.estado_operativo,
            )
        ) {
            throw new AppError(
                'El estado operativo no es válido.',
                400,
                'INVALID_OPERATIONAL_STATUS',
            );
        }

        data.estado_operativo =
            payload.estado_operativo;
    }

    if (payload.color !== undefined) {
        data.color =
            payload.color?.trim() || null;
    }

    if (payload.observacion !== undefined) {
        data.observacion =
            payload.observacion?.trim() || null;
    }

    if (payload.foto_url !== undefined) {
        data.foto_url =
            payload.foto_url?.trim() || null;
    }

    if (!Object.keys(data).length) {
        throw new AppError(
            'No se proporcionaron campos para actualizar.',
            400,
            'NO_UPDATE_FIELDS',
        );
    }

    await vehiculo.update(data);

    return vehiculo;
};

module.exports = updateVehiculoService;