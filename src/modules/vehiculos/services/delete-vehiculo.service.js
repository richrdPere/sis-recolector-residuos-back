const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { Vehiculo } = db;

const deleteVehiculoService = async (idVehiculo) => {
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

    if (
        ['ASIGNADO', 'EN_RUTA'].includes(
            vehiculo.estado_operativo,
        )
    ) {
        throw new AppError(
            'No se puede eliminar un vehículo asignado o en ruta.',
            409,
            'VEHICLE_IN_OPERATION',
        );
    }

    await vehiculo.destroy();

    return {
        id_vehiculo: id,
        deleted: true,
    };
};

module.exports = deleteVehiculoService;