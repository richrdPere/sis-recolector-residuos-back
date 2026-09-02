const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

const getEditableVersion = require("../../utils/ruta-horario/ruta-punto.utils");

// Modelos
const { RutaPunto } = db;

// ===============================================
// SERVICE: Eliminar un punto de la ruta
// ===============================================
const deleteRutaPuntoService = async (
    idVersion,
    idPunto,
) => {
    const versionId =
        validateId(
            idVersion,
            'identificador de la versión',
        );

    const pointId =
        validateId(
            idPunto,
            'identificador del punto',
        );

    await getEditableVersion(
        versionId,
    );

    const punto =
        await RutaPunto.findOne({
            where: {
                id_ruta_punto:
                    pointId,

                id_ruta_version:
                    versionId,
            },
        });

    if (!punto) {
        throw new AppError(
            'El punto no fue encontrado.',
            404,
            'ROUTE_POINT_NOT_FOUND',
        );
    }

    await punto.destroy();

    return {
        id_ruta_punto:
            pointId,

        deleted: true,
    };
};

module.exports = deleteRutaPuntoService;