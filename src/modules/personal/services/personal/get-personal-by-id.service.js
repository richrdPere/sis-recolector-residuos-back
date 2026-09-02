const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Modelos
const { PersonalOperativo } = db;


// Utils
const { validateId } = require('../../utils/personal/personal.util');

const getPersonalIncludes = require('../../utils/personal/personal_includes.utils');

// ==========================================
// SERVICE: Obtener personal por ID
// ==========================================
const getPersonalByIdService = async (
    idPersonal,
) => {
    const id = validateId(
        idPersonal,
        'identificador del personal',
    );

    const personal =
        await PersonalOperativo.findByPk(
            id,
            {
                include:
                    getPersonalIncludes(),
            },
        );

    if (!personal) {
        throw new AppError(
            'El personal operativo no fue encontrado.',
            404,
            'PERSONAL_NOT_FOUND',
        );
    }

    return personal;
}

module.exports = getPersonalByIdService;