const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { validateId } = require('../validations/recorrido.validation');

const UNIDADES = {
    KG: ['MASA', 1],
    TONELADA: ['MASA', 1000],
    LITRO: ['VOLUMEN', 1],
    M3: ['VOLUMEN', 1000],
};

const ALIAS = {
    KILOGRAMO: 'KG',
    METRO_CUBICO: 'M3',
};

// Comprueba la pertenencia al equipo, además del rol.
const autorizarEquipo = async (
    recorrido,
    usuario,
    transaction,
) => {
    const personal = await db.PersonalOperativo.findOne({
        where: {
            id_usuario: usuario,
        },
        transaction,
    });

    const asignacion =
        personal &&
        await db.ProgramacionPersonal.findOne({
            where: {
                id_programacion: recorrido.id_programacion,
                id_personal: personal.id_personal,

                funcion: {
                    [Op.in]: ['CONDUCTOR', 'RECOLECTOR'],
                },

                estado_asignacion: {
                    [Op.in]: ['ACEPTADO', 'EN_SERVICIO'],
                },
            },
            transaction,
        });

    if (!asignacion) {
        throw new AppError(
            'No perteneces al equipo autorizado del recorrido.',
            403,
            'RESULT_TEAM_REQUIRED',
        );
    }
};

// Devuelve null cuando no se pueden comparar las unidades.
// Nunca convierte peso a volumen.
const calcularCapacidad = (
    cantidad,
    unidad,
    vehiculo,
) => {
    const destino =
        ALIAS[vehiculo?.unidad_capacidad] ||
        vehiculo?.unidad_capacidad;

    const maxima = Number(vehiculo?.capacidad_maxima);

    if (
        !(maxima > 0) ||
        !UNIDADES[destino] ||
        UNIDADES[destino][0] !== UNIDADES[unidad][0]
    ) {
        return null;
    }

    const equivalente =
        cantidad *
        UNIDADES[unidad][1] /
        UNIDADES[destino][1];

    const porcentaje = equivalente / maxima * 100;

    return {
        cantidad_acumulada: Number(equivalente.toFixed(3)),

        capacidad_restante: Number(
            Math.max(0, maxima - equivalente).toFixed(3),
        ),

        cantidad_excedida: Number(
            Math.max(0, equivalente - maxima).toFixed(3),
        ),

        porcentaje: Number(porcentaje.toFixed(2)),

        estado:
            porcentaje > 100
                ? 'SOBRECARGA'
                : porcentaje >= 100
                    ? 'COMPLETO'
                    : porcentaje >= 80
                        ? 'ADVERTENCIA'
                        : 'NORMAL',

        umbral_advertencia: 80,
        capacidad_completa: porcentaje >= 100,
        existe_sobrecarga: porcentaje > 100,

        evaluacion: 'FINAL',
        unidad_capacidad: destino,
        capacidad_maxima: maxima,
    };
};

const resultadoFinalService = async ({
    id_recorrido,
    id_usuario,
    payload = null,
}) => {
    const id = validateId(id_recorrido, 'recorrido');
    const usuario = validateId(id_usuario, 'usuario');

    return db.sequelize.transaction(async transaction => {
        const recorrido = await db.Recorrido.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!recorrido) {
            throw new AppError(
                'Recorrido no encontrado.',
                404,
                'RESULT_NOT_FOUND',
            );
        }

        await autorizarEquipo(
            recorrido,
            usuario,
            transaction,
        );

        // Consulta del resultado.
        if (payload === null) {
            return {
                id_recorrido: id,
                estado_recorrido: recorrido.estado_recorrido,
                resultado_final: recorrido.resultado_final,
            };
        }

        const cantidad = payload.cantidad_total;
        const unidad = payload.unidad_medida;
        const clave = payload.clave_idempotencia;
        const fecha = new Date(payload.fecha_dispositivo);

        const observacion =
            payload.observacion == null
                ? ''
                : payload.observacion;

        if (
            typeof cantidad !== 'number' ||
            !Number.isFinite(cantidad) ||
            cantidad < 0 ||
            cantidad > 99999999999.999 ||
            !Object.hasOwn(UNIDADES, unidad) ||
            typeof clave !== 'string' ||
            clave.length < 8 ||
            clave.length > 100 ||
            typeof payload.fecha_dispositivo !== 'string' ||
            !/T.*(Z|[+-]\d{2}:\d{2})$/.test(
                payload.fecha_dispositivo,
            ) ||
            !Number.isFinite(fecha.getTime()) ||
            fecha.getTime() > Date.now() + 300000 ||
            fecha.getTime() <
            new Date(recorrido.fecha_hora_inicio).getTime() ||
            typeof observacion !== 'string' ||
            observacion.length > 1000
        ) {
            throw new AppError(
                'Revisa cantidad, unidad, fecha y observación.',
                400,
                'INVALID_FINAL_RESULT',
            );
        }

        const datos = {
            cantidad_total: Number(cantidad.toFixed(3)),
            unidad_medida: unidad,
            fecha_dispositivo: fecha.toISOString(),
            observacion: observacion.trim(),
            clave_idempotencia: clave,
            id_usuario: usuario,
        };

        const anterior = recorrido.resultado_final;

        // Reintentar exactamente la misma operación es seguro.
        if (anterior) {
            const mismaOperacion = Object.keys(datos).every(
                key => anterior[key] === datos[key],
            );

            if (mismaOperacion) {
                return {
                    id_recorrido: id,
                    resultado_final: anterior,
                    duplicada: true,
                };
            }

            throw new AppError(
                'El recorrido ya tiene un resultado final. No se sobrescribió.',
                409,
                'FINAL_RESULT_ALREADY_EXISTS',
            );
        }

        // Puede llegar primero desde el celular del recolector.
        if (
            ['EN_CURSO', 'PAUSADO'].includes(
                recorrido.estado_recorrido,
            )
        ) {
            throw new AppError(
                'El resultado espera la sincronización del cierre del conductor.',
                425,
                'RESULT_WAITING_FOR_FINISH',
            );
        }

        if (recorrido.estado_recorrido !== 'FINALIZADO') {
            throw new AppError(
                'Solo se registra resultado en recorridos finalizados.',
                409,
                'RESULT_INVALID_ROUTE_STATE',
            );
        }

        const programacion =
            await db.ProgramacionRuta.findByPk(
                recorrido.id_programacion,
                { transaction },
            );

        const vehiculo =
            programacion &&
            await db.Vehiculo.findByPk(
                programacion.id_vehiculo,
                { transaction },
            );

        // Se conserva la capacidad utilizada en este cálculo.
        const resultado = {
            ...datos,

            fecha_recepcion: new Date().toISOString(),

            capacidad: calcularCapacidad(
                datos.cantidad_total,
                unidad,
                vehiculo,
            ),

            vehiculo: vehiculo
                ? {
                    id_vehiculo: vehiculo.id_vehiculo,
                    placa: vehiculo.placa,
                    capacidad_maxima: vehiculo.capacidad_maxima,
                    unidad_capacidad: vehiculo.unidad_capacidad,
                }
                : null,
        };

        await recorrido.update(
            { resultado_final: resultado },
            { transaction },
        );

        return {
            id_recorrido: id,
            resultado_final: resultado,
            duplicada: false,
        };
    });
};

// Restringe las consultas operativas al equipo correspondiente.
const autorizarConsultaRecorrido = async (
    req,
    res,
    next,
) => {
    try {
        const rolesAdministrativos = [
            'SUPER_ADMIN',
            'ADMIN',
            'SUPERVISOR',
            'OPERADOR',
        ];

        if (
            (req.usuario.roles || []).some(
                rol => rolesAdministrativos.includes(rol),
            )
        ) {
            return next();
        }

        const id = validateId(
            req.params.idRecorrido,
            'recorrido',
        );

        const recorrido = await db.Recorrido.findByPk(id);

        if (!recorrido) {
            throw new AppError(
                'Recorrido no encontrado.',
                404,
                'RESULT_NOT_FOUND',
            );
        }

        await autorizarEquipo(
            recorrido,
            req.usuario.id_usuario,
        );

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    resultadoFinalService,
    autorizarEquipo,
    calcularCapacidad,
    autorizarConsultaRecorrido,
};