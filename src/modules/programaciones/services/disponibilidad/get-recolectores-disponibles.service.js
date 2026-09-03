

const { getPersonalDisponible } = require("../../utils/disponibilidad.utils");
// ===============================================
// SERVICE: Obtener recolectores disponibles
// ===============================================

const getRecolectoresDisponiblesService = async (params) => {
  return getPersonalDisponible(
    params,
    'RECOLECTOR',
  );
};

module.exports = getRecolectoresDisponiblesService