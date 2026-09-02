const validateId = (
    value,
) => {
    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new AppError(
            'El identificador del personal no es válido.',
            400,
            'INVALID_PERSONAL_ID',
        );
    }

    return id;
};

const normalizeLicense = (value) =>
    String(value || '')
        .trim()
        .toUpperCase();


module.exports = {
    validateId,
    normalizeLicense,
};