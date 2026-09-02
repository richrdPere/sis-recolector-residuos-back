const AppError = require('../../../utils/app-error');


const validateLicenseDates = ({
    fecha_emision_licencia,
    fecha_vencimiento_licencia,
    estado_licencia,
}) => {
    if (
        fecha_emision_licencia &&
        fecha_vencimiento_licencia &&
        new Date(
            fecha_vencimiento_licencia,
        ) <=
        new Date(
            fecha_emision_licencia,
        )
    ) {
        throw new AppError(
            'La fecha de vencimiento debe ser posterior a la fecha de emisión.',
            400,
            'INVALID_LICENSE_DATES',
        );
    }

    if (
        estado_licencia ===
        'VIGENTE' &&
        fecha_vencimiento_licencia
    ) {
        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0,
        );

        const expiration =
            new Date(
                `${fecha_vencimiento_licencia}T00:00:00`,
            );

        if (expiration < today) {
            throw new AppError(
                'Una licencia vencida no puede registrarse como vigente.',
                400,
                'EXPIRED_LICENSE_CANNOT_BE_ACTIVE',
            );
        }
    }
};


module.exports = {
    validateLicenseDates,
};