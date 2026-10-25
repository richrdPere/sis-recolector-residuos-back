const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Modelos
const { Zona } = db;

const getLastCodigoZonaService = async () => {

    const ultimaZona = await Zona.findOne({

        order: [
            ["id_zona", "DESC"]
        ]

    });

    let siguienteNumero = 1;

    if (ultimaZona && ultimaZona.codigo) {

        const numeroActual =
            parseInt(
                ultimaZona.codigo.split("-")[1]
            );

        siguienteNumero =
            numeroActual + 1;

    }

    return `ZONA-${String(
        siguienteNumero
    ).padStart(4, "0")}`;

}

module.exports = getLastCodigoZonaService;