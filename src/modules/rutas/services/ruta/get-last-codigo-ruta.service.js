const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const { Ruta } = db;

const getLastCodigoRutaService = async () => {

  const ultimaRuta = await Ruta.findOne({

    order: [
      ["id_ruta", "DESC"]
    ]

  });

  let siguienteNumero = 1;

  if (
    ultimaRuta &&
    ultimaRuta.codigo
  ) {

    const numeroActual =
      parseInt(
        ultimaRuta.codigo.split("-")[1]
      );

    siguienteNumero =
      numeroActual + 1;

  }

  return `RUTA-${String(
    siguienteNumero
  ).padStart(4, "0")}`;

}

module.exports = getLastCodigoRutaService;