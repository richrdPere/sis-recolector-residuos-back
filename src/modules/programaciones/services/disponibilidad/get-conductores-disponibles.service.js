
const {
    getPersonalDisponible,
} = require("../../utils/disponibilidad.utils");

// ===============================================
// SERVICE: Obtener conductores disponibles
// ===============================================
const getConductoresDisponiblesService = async (params) => {
    return getPersonalDisponible(
        params,
        'CONDUCTOR',
    );
};


module.exports = getConductoresDisponiblesService 