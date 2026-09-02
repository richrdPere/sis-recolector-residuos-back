const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

const changeEstadoVehiculoService = async ({
    id_vehiculo,
    estado,
}) => {
    const id = Number(id_vehiculo);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(
            'El identificador del vehículo no es válido.',
            400,
            'INVALID_VEHICLE_ID',
        );
    }

    if (typeof estado !== 'boolean') {
        throw new AppError(
            'El campo estado debe ser verdadero o falso.',
            400,
            'INVALID_VEHICLE_STATUS',
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

    if (vehiculo.estado === estado) {
        throw new AppError(
            estado
                ? 'El vehículo ya se encuentra activo.'
                : 'El vehículo ya se encuentra inactivo.',
            409,
            'VEHICLE_STATUS_NOT_CHANGED',
        );
    }

    await vehiculo.update({ estado });

    return vehiculo;
};

module.exports = changeEstadoVehiculoService;