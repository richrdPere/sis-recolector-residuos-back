const AppError = require('../../../utils/app-error');

const {
    crearPoliticaIncidencias,
} = require('./incidencia.policy');

// ==========================================================
// ROLES PERMITIDOS PARA SER RESPONSABLE
// ==========================================================

const ROLES_RESPONSABLE = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

// ==========================================================
// VERIFICAR ELEGIBILIDAD DEL RESPONSABLE
//
// Se consulta la relación Usuario -> roles.
// El usuario recibido desde el service es una instancia
// Sequelize obtenida mediante findByPk.
// ==========================================================

const verificarResponsableElegible = async ({
    responsable,
    transaction,
}) => {
    if (!responsable || responsable.estado === false) {
        return false;
    }

    const asociacionRoles =
        responsable.constructor.associations?.roles;

    if (
        !asociacionRoles ||
        typeof responsable.getRoles !== 'function'
    ) {
        throw new AppError(
            'El modelo Usuario debe tener configurada la asociación "roles".',
            500,
            'INCIDENCIA_ROLES_CONFIGURATION_ERROR',
        );
    }

    const atributosRol =
        asociacionRoles.target.rawAttributes;

    if (!atributosRol.nombre) {
        throw new AppError(
            'El modelo de roles debe disponer del atributo "nombre".',
            500,
            'INCIDENCIA_ROLES_CONFIGURATION_ERROR',
        );
    }

    const opciones = {
        transaction,
    };

    // Filtrar roles habilitados si existe un estado booleano.
    if (
        atributosRol.estado?.type?.key === 'BOOLEAN'
    ) {
        opciones.where = {
            estado: true,
        };
    }

    // Filtrar asignaciones habilitadas si la tabla intermedia
    // UsuarioRol tiene un campo estado booleano.
    const modeloIntermedio =
        asociacionRoles.through?.model;

    if (
        modeloIntermedio?.rawAttributes
            ?.estado?.type?.key === 'BOOLEAN'
    ) {
        opciones.through = {
            where: {
                estado: true,
            },
        };
    }

    const roles = await responsable.getRoles(opciones);

    return roles.some((rol) =>
        ROLES_RESPONSABLE.includes(rol.nombre),
    );
};

// ==========================================================
// INICIALIZACIÓN AUTOMÁTICA
// Incluye la verificación del responsable desde el inicio.
// ==========================================================

let politica = crearPoliticaIncidencias({
    esResponsableElegible:
        verificarResponsableElegible,
});

// ==========================================================
// CONFIGURACIÓN OPCIONAL
// Conserva la verificación predeterminada cuando no se envía
// una implementación personalizada.
// ==========================================================

const configurarIncidenciasServices = ({
    tieneAccesoRecorrido,
    esResponsableElegible,
} = {}) => {
    if (
        tieneAccesoRecorrido != null &&
        typeof tieneAccesoRecorrido !== 'function'
    ) {
        throw new AppError(
            'tieneAccesoRecorrido debe ser una función.',
            500,
            'INCIDENCIAS_CONFIGURATION_ERROR',
        );
    }

    if (
        esResponsableElegible != null &&
        typeof esResponsableElegible !== 'function'
    ) {
        throw new AppError(
            'esResponsableElegible debe ser una función.',
            500,
            'INCIDENCIAS_CONFIGURATION_ERROR',
        );
    }

    politica = crearPoliticaIncidencias({
        tieneAccesoRecorrido,

        esResponsableElegible:
            esResponsableElegible ??
            verificarResponsableElegible,
    });
};

// ==========================================================
// OBTENER POLÍTICA
// ==========================================================

const obtenerPoliticaIncidencias = () => {
    return politica;
};

module.exports = {
    configurarIncidenciasServices,
    obtenerPoliticaIncidencias,
};


// const AppError = require('../../../utils/app-error');

// const { crearPoliticaIncidencias } = require('./incidencia.policy');

// let politica = null;

// // ==========================================================
// // CONFIGURAR POLÍTICA DEL MÓDULO
// // ==========================================================

// const configurarIncidenciasServices = ({
//     tieneAccesoRecorrido,
//     esResponsableElegible,
// } = {}) => {
//     politica = crearPoliticaIncidencias({
//         tieneAccesoRecorrido,
//         esResponsableElegible,
//     });
// };

// // ==========================================================
// // OBTENER POLÍTICA
// // ==========================================================

// const obtenerPoliticaIncidencias = () => {
//     if (!politica) {
//         throw new AppError(
//             'El módulo de incidencias no está configurado.',
//             500,
//             'INCIDENCIAS_CONFIGURATION_ERROR',
//         );
//     }

//     return politica;
// };

// module.exports = {
//     configurarIncidenciasServices,
//     obtenerPoliticaIncidencias,
// };