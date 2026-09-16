/*
|--------------------------------------------------------------------------
| Tipos de reporte
|--------------------------------------------------------------------------
*/

const TIPOS_REPORTE = Object.freeze({
    RESUMEN_OPERATIVO: 'RESUMEN_OPERATIVO',
    PROGRAMACIONES: 'PROGRAMACIONES',
    RECORRIDOS: 'RECORRIDOS',
    RECOLECCIONES: 'RECOLECCIONES',
    INCIDENCIAS: 'INCIDENCIAS',
    VEHICULOS: 'VEHICULOS',
    REPORTES_CIUDADANOS: 'REPORTES_CIUDADANOS',
    BITACORA_GPS: 'BITACORA_GPS',
});

const TIPOS_REPORTE_PERMITIDOS = Object.freeze(
    Object.values(TIPOS_REPORTE),
);

/*
|--------------------------------------------------------------------------
| Formatos de exportación
|--------------------------------------------------------------------------
*/

const FORMATOS_EXPORTACION = Object.freeze({
    PDF: 'pdf',
    EXCEL: 'xlsx',
    CSV: 'csv',
});

const FORMATOS_EXPORTACION_PERMITIDOS = Object.freeze(
    Object.values(FORMATOS_EXPORTACION),
);

/*
|--------------------------------------------------------------------------
| Estados de una exportación
|--------------------------------------------------------------------------
*/

const ESTADOS_EXPORTACION = Object.freeze({
    GENERANDO: 'GENERANDO',
    COMPLETADO: 'COMPLETADO',
    ERROR: 'ERROR',
});

const ESTADOS_EXPORTACION_PERMITIDOS = Object.freeze(
    Object.values(ESTADOS_EXPORTACION),
);

/*
|--------------------------------------------------------------------------
| Paginación
|--------------------------------------------------------------------------
*/

const PAGINACION_REPORTE = Object.freeze({
    PAGINA_DEFAULT: 1,
    LIMITE_DEFAULT: 20,
    LIMITE_MAXIMO: 100,
});

/*
|--------------------------------------------------------------------------
| Límites por formato
|--------------------------------------------------------------------------
|
| Estos límites protegen al servidor frente a exportaciones demasiado
| grandes ejecutadas de manera síncrona.
|
*/

const LIMITES_EXPORTACION = Object.freeze({
    [FORMATOS_EXPORTACION.PDF]: 1000,
    [FORMATOS_EXPORTACION.EXCEL]: 10000,
    [FORMATOS_EXPORTACION.CSV]: 50000,
});

/*
|--------------------------------------------------------------------------
| Rangos de fechas
|--------------------------------------------------------------------------
*/

const RANGO_FECHAS_REPORTE = Object.freeze({
    DIAS_MAXIMOS_CONSULTA: 366,
    DIAS_MAXIMOS_PDF: 366,
    DIAS_MAXIMOS_EXCEL: 366,
    DIAS_MAXIMOS_CSV: 366,
});

/*
|--------------------------------------------------------------------------
| Ordenamiento
|--------------------------------------------------------------------------
*/

const DIRECCIONES_ORDEN = Object.freeze({
    ASC: 'ASC',
    DESC: 'DESC',
});

const DIRECCIONES_ORDEN_PERMITIDAS = Object.freeze(
    Object.values(DIRECCIONES_ORDEN),
);

/*
|--------------------------------------------------------------------------
| Campos de ordenamiento permitidos por reporte
|--------------------------------------------------------------------------
|
| Nunca se debe insertar directamente en Sequelize un campo recibido desde
| req.query sin comprobarlo contra esta lista.
|
*/

const CAMPOS_ORDENAMIENTO = Object.freeze({
    [TIPOS_REPORTE.RESUMEN_OPERATIVO]: [
        'fecha',
    ],

    [TIPOS_REPORTE.PROGRAMACIONES]: [
        'id_programacion',
        'fecha_programada',
        'hora_inicio_programada',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.RECORRIDOS]: [
        'id_recorrido',
        'fecha_inicio',
        'fecha_fin',
        'distancia_recorrida',
        'porcentaje_avance',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.RECOLECCIONES]: [
        'id_recoleccion',
        'fecha_recoleccion',
        'cantidad',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.INCIDENCIAS]: [
        'id_incidencia',
        'fecha_reporte',
        'tipo',
        'prioridad',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.VEHICULOS]: [
        'id_vehiculo',
        'placa',
        'capacidad',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.REPORTES_CIUDADANOS]: [
        'id_reporte_ciudadano',
        'fecha_reporte',
        'categoria',
        'estado',
        'created_at',
    ],

    [TIPOS_REPORTE.BITACORA_GPS]: [
        'id_ubicacion',
        'fecha_dispositivo',
        'fecha_servidor',
        'created_at',
    ],
});

/*
|--------------------------------------------------------------------------
| Ordenamiento predeterminado
|--------------------------------------------------------------------------
*/

const ORDENAMIENTO_DEFAULT = Object.freeze({
    [TIPOS_REPORTE.RESUMEN_OPERATIVO]: {
        sort_by: 'fecha',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.PROGRAMACIONES]: {
        sort_by: 'fecha_programada',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.RECORRIDOS]: {
        sort_by: 'fecha_inicio',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.RECOLECCIONES]: {
        sort_by: 'fecha_recoleccion',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.INCIDENCIAS]: {
        sort_by: 'fecha_reporte',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.VEHICULOS]: {
        sort_by: 'placa',
        sort_order: DIRECCIONES_ORDEN.ASC,
    },

    [TIPOS_REPORTE.REPORTES_CIUDADANOS]: {
        sort_by: 'fecha_reporte',
        sort_order: DIRECCIONES_ORDEN.DESC,
    },

    [TIPOS_REPORTE.BITACORA_GPS]: {
        sort_by: 'fecha_servidor',
        sort_order: DIRECCIONES_ORDEN.ASC,
    },
});

/*
|--------------------------------------------------------------------------
| Filtros admitidos por reporte
|--------------------------------------------------------------------------
*/

const FILTROS_COMUNES = Object.freeze([
    'fecha_inicio',
    'fecha_fin',
    'id_zona',
    'id_ruta',
    'id_vehiculo',
    'id_usuario',
    'estado',
    'turno',
    'search',
    'page',
    'limit',
    'sort_by',
    'sort_order',
]);

const FILTROS_POR_REPORTE = Object.freeze({
    [TIPOS_REPORTE.RESUMEN_OPERATIVO]: [
        'fecha_inicio',
        'fecha_fin',
        'id_zona',
        'id_ruta',
        'id_vehiculo',
        'turno',
    ],

    [TIPOS_REPORTE.PROGRAMACIONES]: [
        ...FILTROS_COMUNES,
        'id_programacion',
        'id_conductor',
        'id_personal',
    ],

    [TIPOS_REPORTE.RECORRIDOS]: [
        ...FILTROS_COMUNES,
        'id_programacion',
        'id_recorrido',
        'id_conductor',
        'id_personal',
        'con_gps',
        'cumplimiento_minimo',
        'cumplimiento_maximo',
    ],

    [TIPOS_REPORTE.RECOLECCIONES]: [
        ...FILTROS_COMUNES,
        'id_programacion',
        'id_recorrido',
        'id_recoleccion',
        'id_punto',
        'unidad_medida',
        'cantidad_minima',
        'cantidad_maxima',
    ],

    [TIPOS_REPORTE.INCIDENCIAS]: [
        ...FILTROS_COMUNES,
        'id_programacion',
        'id_recorrido',
        'id_incidencia',
        'id_responsable',
        'tipo',
        'prioridad',
    ],

    [TIPOS_REPORTE.VEHICULOS]: [
        'fecha_inicio',
        'fecha_fin',
        'id_vehiculo',
        'estado',
        'tipo_mantenimiento',
        'porcentaje_capacidad_minimo',
        'porcentaje_capacidad_maximo',
        'search',
        'page',
        'limit',
        'sort_by',
        'sort_order',
    ],

    [TIPOS_REPORTE.REPORTES_CIUDADANOS]: [
        'fecha_inicio',
        'fecha_fin',
        'id_reporte_ciudadano',
        'id_ciudadano',
        'id_zona',
        'id_ruta',
        'id_responsable',
        'id_incidencia',
        'categoria',
        'estado',
        'search',
        'page',
        'limit',
        'sort_by',
        'sort_order',
    ],

    [TIPOS_REPORTE.BITACORA_GPS]: [
        'fecha_inicio',
        'fecha_fin',
        'id_programacion',
        'id_recorrido',
        'id_vehiculo',
        'id_usuario',
        'page',
        'limit',
        'sort_by',
        'sort_order',
    ],
});

/*
|--------------------------------------------------------------------------
| Tipos MIME
|--------------------------------------------------------------------------
*/

const MIME_TYPES_EXPORTACION = Object.freeze({
    [FORMATOS_EXPORTACION.PDF]: 'application/pdf',

    [FORMATOS_EXPORTACION.EXCEL]:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    [FORMATOS_EXPORTACION.CSV]:
        'text/csv; charset=utf-8',
});

/*
|--------------------------------------------------------------------------
| Extensiones
|--------------------------------------------------------------------------
*/

const EXTENSIONES_EXPORTACION = Object.freeze({
    [FORMATOS_EXPORTACION.PDF]: '.pdf',
    [FORMATOS_EXPORTACION.EXCEL]: '.xlsx',
    [FORMATOS_EXPORTACION.CSV]: '.csv',
});

/*
|--------------------------------------------------------------------------
| Nombres de reportes
|--------------------------------------------------------------------------
*/

const NOMBRES_REPORTE = Object.freeze({
    [TIPOS_REPORTE.RESUMEN_OPERATIVO]:
        'Resumen operativo',

    [TIPOS_REPORTE.PROGRAMACIONES]:
        'Reporte de programaciones',

    [TIPOS_REPORTE.RECORRIDOS]:
        'Reporte de recorridos',

    [TIPOS_REPORTE.RECOLECCIONES]:
        'Reporte de recolecciones',

    [TIPOS_REPORTE.INCIDENCIAS]:
        'Reporte de incidencias',

    [TIPOS_REPORTE.VEHICULOS]:
        'Reporte de vehículos',

    [TIPOS_REPORTE.REPORTES_CIUDADANOS]:
        'Reporte de problemas ciudadanos',

    [TIPOS_REPORTE.BITACORA_GPS]:
        'Bitácora GPS',
});

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

const PERMISOS_REPORTES = Object.freeze({
    VER: 'REPORTES_VER',
    EXPORTAR: 'REPORTES_EXPORTAR',

    VER_PROGRAMACIONES:
        'REPORTES_PROGRAMACIONES_VER',

    VER_RECORRIDOS:
        'REPORTES_RECORRIDOS_VER',

    VER_RECOLECCIONES:
        'REPORTES_RECOLECCIONES_VER',

    VER_INCIDENCIAS:
        'REPORTES_INCIDENCIAS_VER',

    VER_VEHICULOS:
        'REPORTES_VEHICULOS_VER',

    VER_REPORTES_CIUDADANOS:
        'REPORTES_CIUDADANOS_VER',

    EXPORTAR_GPS:
        'REPORTES_GPS_EXPORTAR',
});

module.exports = {
    TIPOS_REPORTE,
    TIPOS_REPORTE_PERMITIDOS,

    FORMATOS_EXPORTACION,
    FORMATOS_EXPORTACION_PERMITIDOS,

    ESTADOS_EXPORTACION,
    ESTADOS_EXPORTACION_PERMITIDOS,

    PAGINACION_REPORTE,
    LIMITES_EXPORTACION,
    RANGO_FECHAS_REPORTE,

    DIRECCIONES_ORDEN,
    DIRECCIONES_ORDEN_PERMITIDAS,

    CAMPOS_ORDENAMIENTO,
    ORDENAMIENTO_DEFAULT,

    FILTROS_COMUNES,
    FILTROS_POR_REPORTE,

    MIME_TYPES_EXPORTACION,
    EXTENSIONES_EXPORTACION,
    NOMBRES_REPORTE,

    PERMISOS_REPORTES,
};