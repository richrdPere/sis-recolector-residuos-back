const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');


// Modelos
const { RutaVersion } = db;

const getEditableVersion = async (
    idVersion,
    transaction = null,
) => {
    const version =
        await RutaVersion.findByPk(
            idVersion,
            {
                transaction,
            },
        );

    if (!version) {
        throw new AppError(
            'La versión de la ruta no fue encontrada.',
            404,
            'ROUTE_VERSION_NOT_FOUND',
        );
    }

    if (version.vigente) {
        throw new AppError(
            'Los puntos de una versión vigente no pueden modificarse.',
            409,
            'CURRENT_VERSION_POINTS_CANNOT_BE_UPDATED',
        );
    }

    return version;
};

module.exports = getEditableVersion;