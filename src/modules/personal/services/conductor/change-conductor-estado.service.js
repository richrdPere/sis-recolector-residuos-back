const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error');

// Services
const getConductorByIdService = require('./get-conductor-by-id.service');

// Modelos
const { ConductorPerfil } = db;

// Utils
const { validateId } = require("../../utils/conductor/conductor.utils");

// ===============================================
// SERVICE: Activar o desactivar conductor
// ===============================================
const changeConductorEstadoService = async ({
    id_personal,
    estado,
}) => {
    const id =
        validateId(id_personal);

    if (
        typeof estado !==
        'boolean'
    ) {
        throw new AppError(
            'El campo estado debe ser verdadero o falso.',
            400,
            'INVALID_DRIVER_STATUS',
        );
    }

    const conductor =
        await ConductorPerfil
            .findOne({
                where: {
                    id_personal: id,
                },
            });

    if (!conductor) {
        throw new AppError(
            'El perfil de conductor no fue encontrado.',
            404,
            'DRIVER_PROFILE_NOT_FOUND',
        );
    }

    if (
        conductor.estado ===
        estado
    ) {
        throw new AppError(
            estado
                ? 'El perfil del conductor ya está activo.'
                : 'El perfil del conductor ya está inactivo.',
            409,
            'DRIVER_STATUS_NOT_CHANGED',
        );
    }

    await conductor.update({
        estado,
    });

    return getConductorByIdService(id);
};

module.exports = changeConductorEstadoService;