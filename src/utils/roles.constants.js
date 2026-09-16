// ==========================================================
// 1. NOMBRES DE ROLES
// ==========================================================
const ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    SUPERVISOR: 'SUPERVISOR',
    OPERADOR: 'OPERADOR',
    CONDUCTOR: 'CONDUCTOR',
    RECOLECTOR: 'RECOLECTOR',
    CIUDADANO: 'CIUDADANO',
});

// ==========================================================
// 2. GRUPOS GENERALES
// ==========================================================

// Configuración técnica.
const ROLES_ADMINISTRACION_TECNICA = Object.freeze([
    ROLES.SUPER_ADMIN,
]);

// Administración institucional.
const ROLES_ADMINISTRACION = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
]);

// Gestión de las operaciones.
const ROLES_GESTION_OPERATIVA = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SUPERVISOR,
]);

// Consulta interna y monitoreo.
const ROLES_CONSULTA_INTERNA = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SUPERVISOR,
    ROLES.OPERADOR,
]);

// Personal que utiliza la app operativa.
const ROLES_PERSONAL_CAMPO = Object.freeze([
    ROLES.CONDUCTOR,
    ROLES.RECOLECTOR,
]);

// Servicios ciudadanos asociados al usuario autenticado.
const ROLES_CIUDADANO = Object.freeze([
    ROLES.CIUDADANO,
]);

// ==========================================================
// 3. PROGRAMACIÓN
// ==========================================================
const ROLES_PROGRAMACION_CONSULTA = ROLES_CONSULTA_INTERNA;

const ROLES_PROGRAMACION_GESTION = ROLES_GESTION_OPERATIVA;

// El personal de campo solo puede consultar el detalle
// cuando tiene una asignación que le permite acceder.
const ROLES_PROGRAMACION_DETALLE = Object.freeze([
    ...ROLES_CONSULTA_INTERNA,
    ...ROLES_PERSONAL_CAMPO,
]);

// Mantiene los roles de tus rutas actuales.
// Listado y respuesta de asignaciones propias.
const ROLES_ASIGNACIONES_PROPIAS = Object.freeze([
    ...ROLES_PERSONAL_CAMPO,
    ROLES.SUPERVISOR,
]);

const ROLES_PROGRAMACION_PERSONAL_CONSULTA =
    ROLES_CONSULTA_INTERNA;

const ROLES_PROGRAMACION_PERSONAL_GESTION =
    ROLES_GESTION_OPERATIVA;

// ==========================================================
// 4. DISPONIBILIDAD
// ==========================================================
const ROLES_DISPONIBILIDAD_CONSULTA = ROLES_CONSULTA_INTERNA;

// ==========================================================
// 5. CÓDIGOS QR ADMINISTRATIVOS
// ==========================================================
const ROLES_QR_CONSULTA = ROLES_CONSULTA_INTERNA;

const ROLES_QR_GESTION = ROLES_GESTION_OPERATIVA;

// ==========================================================
// EXPORTS
// ==========================================================
module.exports = {
    ROLES,

    ROLES_ADMINISTRACION_TECNICA,
    ROLES_ADMINISTRACION,
    ROLES_GESTION_OPERATIVA,
    ROLES_CONSULTA_INTERNA,
    ROLES_PERSONAL_CAMPO,
    ROLES_CIUDADANO,

    ROLES_PROGRAMACION_CONSULTA,
    ROLES_PROGRAMACION_GESTION,
    ROLES_PROGRAMACION_DETALLE,
    ROLES_ASIGNACIONES_PROPIAS,
    ROLES_PROGRAMACION_PERSONAL_CONSULTA,
    ROLES_PROGRAMACION_PERSONAL_GESTION,

    ROLES_DISPONIBILIDAD_CONSULTA,

    ROLES_QR_CONSULTA,
    ROLES_QR_GESTION,
};