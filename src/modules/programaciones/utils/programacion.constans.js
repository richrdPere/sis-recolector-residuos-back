/*
|--------------------------------------------------------------------------
| Estados que generan conflicto de disponibilidad
|--------------------------------------------------------------------------
*/

const ESTADOS_CONFLICTO = Object.freeze([
    'PROGRAMADA',
    'ASIGNADA',
    'ACEPTADA',
    'EN_CURSO',
    'PAUSADA',
]);

/*
|--------------------------------------------------------------------------
| Funciones permitidas para el personal operativo
|--------------------------------------------------------------------------
*/

const FUNCIONES_PERSONAL = Object.freeze([
    'CONDUCTOR',
    'RECOLECTOR',
    'SUPERVISOR',
]);

/*
|--------------------------------------------------------------------------
| Días de la semana
|--------------------------------------------------------------------------
*/

const DIAS_SEMANA = Object.freeze([
    'DOMINGO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
]);

/*
|--------------------------------------------------------------------------
| Estados no operativos del vehículo
|--------------------------------------------------------------------------
*/

const ESTADOS_VEHICULO_NO_OPERATIVO = Object.freeze([
    'EN_MANTENIMIENTO',
    'FUERA_DE_SERVICIO',
]);

/*
|--------------------------------------------------------------------------
| Estados de personal que no generan conflicto
|--------------------------------------------------------------------------
*/

const ESTADOS_ASIGNACION_SIN_CONFLICTO = Object.freeze([
    'RECHAZADO',
    'RETIRADO',
]);

module.exports = {
    ESTADOS_CONFLICTO,
    FUNCIONES_PERSONAL,
    DIAS_SEMANA,
    ESTADOS_VEHICULO_NO_OPERATIVO,
    ESTADOS_ASIGNACION_SIN_CONFLICTO,
};