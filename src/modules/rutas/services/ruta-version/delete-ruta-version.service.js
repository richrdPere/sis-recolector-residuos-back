const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const { RutaVersion } = db;

// ===============================================
// SERVICE: Eliminar ruta version
// ===============================================
const deleteRutaVersionService = async (idVersion) => {
    const id = validateId(
        idVersion,
        'identificador de la versión',
    );

    const version =
        await RutaVersion.findByPk(
            id,
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
            'No se puede eliminar la versión vigente.',
            409,
            'CURRENT_VERSION_CANNOT_BE_DELETED',
        );
    }

    await version.destroy();

    return {
        id_ruta_version: id,
        deleted: true,
    };
};

module.exports = deleteRutaVersionService;