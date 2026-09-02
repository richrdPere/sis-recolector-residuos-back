const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

const getVehiculoByIdService = async (idVehiculo) => {
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

    return vehiculo;
};

module.exports = getVehiculoByIdService;