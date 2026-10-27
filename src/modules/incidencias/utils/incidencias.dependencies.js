const AppError = require('../../../utils/app-error');

const { crearPoliticaIncidencias } = require('./incidencia.policy');

let politica = null;

// ==========================================================
// CONFIGURAR POLÍTICA DEL MÓDULO
// ==========================================================

const configurarIncidenciasServices = ({
    tieneAccesoRecorrido,
    esResponsableElegible,
} = {}) => {
    politica = crearPoliticaIncidencias({
        tieneAccesoRecorrido,
        esResponsableElegible,
    });
};

// ==========================================================
// OBTENER POLÍTICA
// ==========================================================

const obtenerPoliticaIncidencias = () => {
    if (!politica) {
        throw new AppError(
            'El módulo de incidencias no está configurado.',
            500,
            'INCIDENCIAS_CONFIGURATION_ERROR',
        );
    }

    return politica;
};

module.exports = {
    configurarIncidenciasServices,
    obtenerPoliticaIncidencias,
};