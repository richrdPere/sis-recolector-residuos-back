// Utils
const { validarId } = require("../utils/mantenimientos.utils");

// Validation
const { obtenerDetalle } = require("../validations/mantenimientos.validation");

// *********************************************************
// SERVICE: OBTENER DETALLE E HISTORIAL
// *********************************************************
const getMantenimientoByIdService = async (
  idMantenimiento,
) => {
  const id = validarId(
    idMantenimiento,
    'ID del mantenimiento',
  );

  return obtenerDetalle(id);
};

module.exports = getMantenimientoByIdService;