// Constants
const {
    TIPOS_REPORTE_PERMITIDOS,
    FORMATOS_EXPORTACION,
    FORMATOS_EXPORTACION_PERMITIDOS,
    LIMITES_EXPORTACION,
    RANGO_FECHAS_REPORTE,
    DIRECCIONES_ORDEN_PERMITIDAS,
    CAMPOS_ORDENAMIENTO,
    FILTROS_POR_REPORTE,
} = require(
    '../constants/reporte.constants',
);

// Utils
const {
    esFechaISO,
    calcularDiferenciaDias,
} = require('../utils/reporte-fechas.util');

const { tieneValor } = require('../utils/reporte-filtros.util');

/*
|--------------------------------------------------------------------------
| Error de validación del módulo
|--------------------------------------------------------------------------
|
| Si tu proyecto ya tiene AppError, HttpError o BadRequestError, reemplaza
| esta clase por la clase global utilizada en tu backend.
|
*/

class ReporteValidationError extends Error {
    constructor(
        message,
        detalles = [],
    ) {
        super(message);

        this.name = 'ReporteValidationError';
        this.statusCode = 400;
        this.codigo = 'VALIDACION_REPORTE';
        this.detalles = detalles;

        Error.captureStackTrace?.(
            this,
            ReporteValidationError,
        );
    }
}

/*
|--------------------------------------------------------------------------
| Validar tipo de reporte
|--------------------------------------------------------------------------
*/

const validarTipoReporte = (tipoReporte) => {
    if (
        !TIPOS_REPORTE_PERMITIDOS.includes(
            tipoReporte,
        )
    ) {
        throw new ReporteValidationError(
            'El tipo de reporte no es válido.',
            [
                {
                    campo: 'tipo_reporte',
                    mensaje:
                        'Seleccione un tipo de reporte permitido.',
                },
            ],
        );
    }

    return tipoReporte;
};

/*
|--------------------------------------------------------------------------
| Validar formato
|--------------------------------------------------------------------------
*/

const validarFormatoExportacion = (formato) => {
    const formatoNormalizado = String(
        formato || '',
    ).toLowerCase();

    if (
        !FORMATOS_EXPORTACION_PERMITIDOS.includes(
            formatoNormalizado,
        )
    ) {
        throw new ReporteValidationError(
            'El formato de exportación no es válido.',
            [
                {
                    campo: 'formato',
                    mensaje:
                        `Los formatos permitidos son: ${FORMATOS_EXPORTACION_PERMITIDOS.join(', ')
                        }.`,
                },
            ],
        );
    }

    return formatoNormalizado;
};

/*
|--------------------------------------------------------------------------
| Validar fechas
|--------------------------------------------------------------------------
*/

const validarRangoFechasReporte = ({
    fecha_inicio,
    fecha_fin,
    requerido = true,
    diasMaximos =
    RANGO_FECHAS_REPORTE.DIAS_MAXIMOS_CONSULTA,
}) => {
    const errores = [];

    if (
        requerido
        && (!fecha_inicio || !fecha_fin)
    ) {
        errores.push({
            campo: 'fecha_inicio',
            mensaje:
                'La fecha de inicio y la fecha de fin son obligatorias.',
        });
    }

    if (
        fecha_inicio
        && !esFechaISO(fecha_inicio)
    ) {
        errores.push({
            campo: 'fecha_inicio',
            mensaje:
                'La fecha de inicio debe utilizar el formato YYYY-MM-DD.',
        });
    }

    if (
        fecha_fin
        && !esFechaISO(fecha_fin)
    ) {
        errores.push({
            campo: 'fecha_fin',
            mensaje:
                'La fecha de fin debe utilizar el formato YYYY-MM-DD.',
        });
    }

    if (
        errores.length === 0
        && fecha_inicio
        && fecha_fin
    ) {
        const diferenciaDias =
            calcularDiferenciaDias(
                fecha_inicio,
                fecha_fin,
            );

        if (diferenciaDias < 0) {
            errores.push({
                campo: 'fecha_fin',
                mensaje:
                    'La fecha de fin no puede ser anterior a la fecha de inicio.',
            });
        }

        if (diferenciaDias > diasMaximos) {
            errores.push({
                campo: 'fecha_fin',
                mensaje:
                    `El rango consultado no puede superar ${diasMaximos} días.`,
            });
        }
    }

    if (errores.length) {
        throw new ReporteValidationError(
            'El rango de fechas no es válido.',
            errores,
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar identificador
|--------------------------------------------------------------------------
*/

const validarIdOpcional = (
    valor,
    campo,
) => {
    if (!tieneValor(valor)) {
        return true;
    }

    const numero = Number(valor);

    if (
        !Number.isInteger(numero)
        || numero <= 0
    ) {
        throw new ReporteValidationError(
            `El campo ${campo} no es válido.`,
            [
                {
                    campo,
                    mensaje:
                        'Debe ser un número entero mayor que cero.',
                },
            ],
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar porcentaje
|--------------------------------------------------------------------------
*/

const validarPorcentajeOpcional = (
    valor,
    campo,
) => {
    if (!tieneValor(valor)) {
        return true;
    }

    const numero = Number(valor);

    if (
        !Number.isFinite(numero)
        || numero < 0
        || numero > 100
    ) {
        throw new ReporteValidationError(
            `El campo ${campo} no es válido.`,
            [
                {
                    campo,
                    mensaje:
                        'Debe ser un número entre 0 y 100.',
                },
            ],
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar cantidad
|--------------------------------------------------------------------------
*/

const validarCantidadOpcional = (
    valor,
    campo,
) => {
    if (!tieneValor(valor)) {
        return true;
    }

    const numero = Number(valor);

    if (
        !Number.isFinite(numero)
        || numero < 0
    ) {
        throw new ReporteValidationError(
            `El campo ${campo} no es válido.`,
            [
                {
                    campo,
                    mensaje:
                        'Debe ser un número mayor o igual que cero.',
                },
            ],
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar límites mínimos y máximos
|--------------------------------------------------------------------------
*/

const validarRangoNumerico = ({
    minimo,
    maximo,
    campoMinimo,
    campoMaximo,
}) => {
    if (
        tieneValor(minimo)
        && tieneValor(maximo)
        && Number(minimo) > Number(maximo)
    ) {
        throw new ReporteValidationError(
            'El rango numérico no es válido.',
            [
                {
                    campo: campoMaximo,
                    mensaje:
                        `${campoMaximo} no puede ser menor que ${campoMinimo}.`,
                },
            ],
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar paginación
|--------------------------------------------------------------------------
*/

const validarPaginacionReporte = ({
    page,
    limit,
    limiteMaximo = 100,
}) => {
    const errores = [];

    if (
        tieneValor(page)
        && (
            !Number.isInteger(Number(page))
            || Number(page) <= 0
        )
    ) {
        errores.push({
            campo: 'page',
            mensaje:
                'La página debe ser un número entero mayor que cero.',
        });
    }

    if (
        tieneValor(limit)
        && (
            !Number.isInteger(Number(limit))
            || Number(limit) <= 0
            || Number(limit) > limiteMaximo
        )
    ) {
        errores.push({
            campo: 'limit',
            mensaje:
                `El límite debe estar entre 1 y ${limiteMaximo}.`,
        });
    }

    if (errores.length) {
        throw new ReporteValidationError(
            'La paginación no es válida.',
            errores,
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar ordenamiento
|--------------------------------------------------------------------------
*/

const validarOrdenamientoReporte = ({
    tipoReporte,
    sort_by,
    sort_order,
}) => {
    const errores = [];

    const camposPermitidos =
        CAMPOS_ORDENAMIENTO[tipoReporte] || [];

    if (
        sort_by
        && !camposPermitidos.includes(sort_by)
    ) {
        errores.push({
            campo: 'sort_by',
            mensaje:
                `El campo de ordenamiento no está permitido. Valores: ${camposPermitidos.join(', ')
                }.`,
        });
    }

    if (
        sort_order
        && !DIRECCIONES_ORDEN_PERMITIDAS.includes(
            String(sort_order).toUpperCase(),
        )
    ) {
        errores.push({
            campo: 'sort_order',
            mensaje:
                'La dirección debe ser ASC o DESC.',
        });
    }

    if (errores.length) {
        throw new ReporteValidationError(
            'El ordenamiento no es válido.',
            errores,
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar filtros desconocidos
|--------------------------------------------------------------------------
*/

const validarFiltrosPermitidos = ({
    tipoReporte,
    query = {},
    filtrosAdicionales = [],
}) => {
    const filtrosPermitidos = new Set([
        ...(FILTROS_POR_REPORTE[tipoReporte] || []),
        ...filtrosAdicionales,
    ]);

    /*
    | El formato solo aparece en solicitudes de exportación.
    */

    filtrosPermitidos.add('formato');
    filtrosPermitidos.add('columnas');

    const desconocidos = Object.keys(query).filter(
        (campo) => !filtrosPermitidos.has(campo),
    );

    if (desconocidos.length) {
        throw new ReporteValidationError(
            'Se enviaron filtros no admitidos.',
            desconocidos.map((campo) => ({
                campo,
                mensaje:
                    'Este filtro no está permitido para el reporte solicitado.',
            })),
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validar texto de búsqueda
|--------------------------------------------------------------------------
*/

const validarSearch = (search) => {
    if (!tieneValor(search)) {
        return true;
    }

    const texto = String(search).trim();

    if (texto.length < 2) {
        throw new ReporteValidationError(
            'El criterio de búsqueda es demasiado corto.',
            [
                {
                    campo: 'search',
                    mensaje:
                        'Ingrese al menos dos caracteres.',
                },
            ],
        );
    }

    if (texto.length > 150) {
        throw new ReporteValidationError(
            'El criterio de búsqueda es demasiado largo.',
            [
                {
                    campo: 'search',
                    mensaje:
                        'No puede superar los 150 caracteres.',
                },
            ],
        );
    }

    return true;
};

/*
|--------------------------------------------------------------------------
| Validación general de consulta
|--------------------------------------------------------------------------
*/

const validarConsultaReporte = ({
    tipoReporte,
    query = {},
    fechasRequeridas = true,
}) => {
    validarTipoReporte(tipoReporte);

    validarFiltrosPermitidos({
        tipoReporte,
        query,
    });

    validarRangoFechasReporte({
        fecha_inicio: query.fecha_inicio,
        fecha_fin: query.fecha_fin,
        requerido: fechasRequeridas,
    });

    validarPaginacionReporte({
        page: query.page,
        limit: query.limit,
    });

    validarOrdenamientoReporte({
        tipoReporte,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
    });

    validarSearch(query.search);

    const identificadores = [
        'id_zona',
        'id_ruta',
        'id_vehiculo',
        'id_usuario',
        'id_programacion',
        'id_recorrido',
        'id_recoleccion',
        'id_incidencia',
        'id_reporte_ciudadano',
        'id_conductor',
        'id_personal',
        'id_punto',
        'id_responsable',
        'id_ciudadano',
    ];

    identificadores.forEach((campo) => {
        validarIdOpcional(query[campo], campo);
    });

    validarPorcentajeOpcional(
        query.cumplimiento_minimo,
        'cumplimiento_minimo',
    );

    validarPorcentajeOpcional(
        query.cumplimiento_maximo,
        'cumplimiento_maximo',
    );

    validarPorcentajeOpcional(
        query.porcentaje_capacidad_minimo,
        'porcentaje_capacidad_minimo',
    );

    validarPorcentajeOpcional(
        query.porcentaje_capacidad_maximo,
        'porcentaje_capacidad_maximo',
    );

    validarCantidadOpcional(
        query.cantidad_minima,
        'cantidad_minima',
    );

    validarCantidadOpcional(
        query.cantidad_maxima,
        'cantidad_maxima',
    );

    validarRangoNumerico({
        minimo: query.cumplimiento_minimo,
        maximo: query.cumplimiento_maximo,
        campoMinimo: 'cumplimiento_minimo',
        campoMaximo: 'cumplimiento_maximo',
    });

    validarRangoNumerico({
        minimo:
            query.porcentaje_capacidad_minimo,

        maximo:
            query.porcentaje_capacidad_maximo,

        campoMinimo:
            'porcentaje_capacidad_minimo',

        campoMaximo:
            'porcentaje_capacidad_maximo',
    });

    validarRangoNumerico({
        minimo: query.cantidad_minima,
        maximo: query.cantidad_maxima,
        campoMinimo: 'cantidad_minima',
        campoMaximo: 'cantidad_maxima',
    });

    return true;
};

/*
|--------------------------------------------------------------------------
| Validación de exportación
|--------------------------------------------------------------------------
*/

const validarExportacionReporte = ({
    tipoReporte,
    query = {},
    totalRegistros = null,
}) => {
    validarConsultaReporte({
        tipoReporte,
        query,
        fechasRequeridas: true,
    });

    const formato =
        validarFormatoExportacion(query.formato);

    if (
        totalRegistros !== null
        && totalRegistros !== undefined
    ) {
        const total = Number(totalRegistros);
        const limite = LIMITES_EXPORTACION[formato];

        if (
            Number.isFinite(total)
            && total > limite
        ) {
            throw new ReporteValidationError(
                'La exportación supera el límite permitido.',
                [
                    {
                        campo: 'total_registros',
                        mensaje:
                            `El formato ${formato} admite hasta ${limite} registros. Aplique filtros más específicos.`,
                    },
                ],
            );
        }
    }

    return {
        formato,
        limite:
            LIMITES_EXPORTACION[formato],
    };
};

module.exports = {
    ReporteValidationError,

    validarTipoReporte,
    validarFormatoExportacion,
    validarRangoFechasReporte,
    validarIdOpcional,
    validarPorcentajeOpcional,
    validarCantidadOpcional,
    validarRangoNumerico,
    validarPaginacionReporte,
    validarOrdenamientoReporte,
    validarFiltrosPermitidos,
    validarSearch,

    validarConsultaReporte,
    validarExportacionReporte,
};