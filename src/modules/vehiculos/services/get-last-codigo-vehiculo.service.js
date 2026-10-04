const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Modelos
const { Vehiculo } = db;

const getLastCodigoVehiculoService = async () => {

  const ultimaUnidad = await Vehiculo.findOne({

    order: [
      ["id_vehiculo", "DESC"]
    ]

  });

  let siguienteNumero = 1;

  if (
    ultimaUnidad &&
    ultimaUnidad.codigo
  ) {

    const numeroActual =
      parseInt(
        ultimaUnidad.codigo.split("-")[1]
      );

    siguienteNumero =
      numeroActual + 1;

  }

  return `VEH-${String(
    siguienteNumero
  ).padStart(4, "0")}`;

}

module.exports = getLastCodigoVehiculoService;