const { Op } = require('sequelize');

const db = require('../../../../database/models');

const { enqueueNotification } = require('../../../../jobs/notification-worker');

const {
  ESTADOS,
  inicioServicio,
  firmaProgramacion,
} = require('./recordatorio-programacion.utils');

// Cursor de trabajo en este proceso.
// No sustituye la clave única de las notificaciones.
let cursor = {
  programacion: '0',
  ciudadano: '0',
};

const diaPeru = (fecha) =>
  new Date(
    fecha.getTime() - 5 * 3600000,
  )
    .toISOString()
    .slice(0, 10);

const generarRecordatorios = async () => {
  const resumen = {
    programaciones: 0,
    ciudadanos: 0,
    creadas: 0,
    duplicadas: 0,
    excluidos: 0,
    errores: 0,
  };

  const ahora = new Date();

  // La anticipación máxima permitida actualmente
  // por tus preferencias es de siete días.
  const hasta = new Date(
    ahora.getTime() + 7 * 86400000,
  );

  while (
    resumen.programaciones < 20 &&
    resumen.ciudadanos < 200
  ) {
    const referencia =
      await db.ProgramacionRuta.findOne({
        where: {
          id_programacion: {
            [
              cursor.ciudadano === '0'
                ? Op.gt
                : Op.gte
            ]: cursor.programacion,
          },

          estado_programacion: {
            [Op.in]: ESTADOS,
          },

          fecha_programada: {
            [Op.between]: [
              diaPeru(ahora),
              diaPeru(hasta),
            ],
          },
        },

        attributes: [
          'id_programacion',
        ],

        order: [
          ['id_programacion', 'ASC'],
        ],
      });

    if (!referencia) {
      // Terminó una vuelta completa.
      // El siguiente ciclo revisará desde el inicio.
      cursor = {
        programacion: '0',
        ciudadano: '0',
      };

      break;
    }

    const id = String(
      referencia.id_programacion,
    );

    const despues =
      cursor.programacion === id
        ? cursor.ciudadano
        : '0';

    const limite = Math.min(
      50,
      200 - resumen.ciudadanos,
    );

    resumen.programaciones++;

    try {
      const resultado =
        await db.sequelize.transaction(
          async (transaction) => {
            // Serializa la generación para esta programación
            // entre distintas instancias del backend.
            const programacion =
              await db.ProgramacionRuta.findByPk(
                id,
                {
                  transaction,
                  lock: transaction.LOCK.UPDATE,
                },
              );

            const vacio = {
              filas: 0,
              ultimo: '0',
              creadas: 0,
              duplicadas: 0,
              excluidos: 0,
            };

            if (
              !programacion ||
              !ESTADOS.includes(
                programacion.estado_programacion,
              )
            ) {
              return vacio;
            }

            const inicio = inicioServicio(
              programacion,
            );

            const minutos = Math.ceil(
              (
                inicio.getTime() -
                Date.now()
              ) / 60000,
            );

            if (
              !Number.isFinite(minutos) ||
              minutos <= 0 ||
              minutos > 10080
            ) {
              return vacio;
            }

            const ciudadanos =
              await db.Ciudadano.findAll({
                where: {
                  id_ciudadano: {
                    [Op.gt]: despues,
                  },

                  estado_ciudadano: 'ACTIVO',
                  acepta_tratamiento_datos: true,
                },

                attributes: [
                  'id_ciudadano',
                  'id_usuario',
                ],

                include: [
                  {
                    association: 'usuario',
                    required: true,
                    attributes: [],

                    where: {
                      estado: true,
                    },
                  },
                  {
                    association: 'domicilios',
                    required: true,
                    attributes: [],

                    where: {
                      id_ruta:
                        programacion.id_ruta,

                      estado_domicilio:
                        'ACTIVO',
                    },
                  },
                  {
                    association:
                      'preferencias_notificacion',

                    required: true,
                    attributes: [],

                    where: {
                      estado_preferencia:
                        'ACTIVA',

                      notificaciones_habilitadas:
                        true,

                      notificar_recordatorio:
                        true,

                      // Solo ciudadanos cuya anticipación
                      // ya alcanzó el horario de envío.
                      minutos_anticipacion: {
                        [Op.gte]: Math.max(
                          15,
                          minutos,
                        ),
                      },
                    },
                  },
                ],

                order: [
                  ['id_ciudadano', 'ASC'],
                ],

                limit: limite,
                transaction,
              });

            const total = {
              ...vacio,
              filas: ciudadanos.length,
            };

            const firma = firmaProgramacion(
              programacion,
            );

            for (const ciudadano of ciudadanos) {
              if (
                inicio.getTime() <= Date.now()
              ) {
                break;
              }

              const resultado =
                await enqueueNotification({
                  notificacion: {
                    tipo_notificacion:
                      'RECORDATORIO',

                    titulo:
                      'Recordatorio de recolección',

                    mensaje:
                      `El servicio de tu ruta está programado ` +
                      `para el ${programacion.fecha_programada}, ` +
                      `a las ${String(
                        programacion.hora_inicio_programada,
                      ).slice(0, 5)
                      } (hora de Perú). ` +
                      'Es el inicio previsto del servicio; ' +
                      'el paso por tu domicilio puede ser posterior.',

                    enviar_interna: true,
                    enviar_push: true,

                    tipo_entidad:
                      'PROGRAMACION',

                    id_entidad:
                      programacion.id_programacion,

                    fecha_expiracion:
                      inicio,

                    // enqueueNotification agrega la identidad
                    // del usuario al construir su clave final.
                    clave_evento:
                      `RECORDATORIO:` +
                      `${programacion.id_programacion}:` +
                      firma,

                    origen: 'SISTEMA',

                    datos: {
                      recordatorio_automatico:
                        true,

                      firma_programacion:
                        firma,

                      id_programacion: String(
                        programacion.id_programacion,
                      ),

                      id_ruta: String(
                        programacion.id_ruta,
                      ),

                      id_ciudadano: String(
                        ciudadano.id_ciudadano,
                      ),

                      id_usuario: String(
                        ciudadano.id_usuario,
                      ),

                      fecha_servicio:
                        inicio.toISOString(),
                    },
                  },

                  destino: {
                    tipo_destino:
                      'CIUDADANOS',

                    evento:
                      'RECORDATORIO',

                    id_ruta:
                      programacion.id_ruta,

                    id_ciudadano:
                      ciudadano.id_ciudadano,

                    fecha_servicio:
                      inicio,
                  },

                  transaction,
                });

              total.creadas +=
                resultado.creadas;

              total.duplicadas +=
                resultado.duplicadas;

              total.excluidos +=
                resultado.excluidos;
            }

            total.ultimo =
              ciudadanos.length > 0
                ? String(
                  ciudadanos[
                    ciudadanos.length - 1
                  ].id_ciudadano,
                )
                : '0';

            return total;
          },
        );

      // Avanzar el cursor únicamente después del commit.
      resumen.ciudadanos +=
        resultado.filas;

      resumen.creadas +=
        resultado.creadas;

      resumen.duplicadas +=
        resultado.duplicadas;

      resumen.excluidos +=
        resultado.excluidos;

      cursor = {
        programacion: id,

        ciudadano:
          resultado.filas === limite
            ? resultado.ultimo
            : '0',
      };
    } catch (error) {
      resumen.errores++;

      // Continuar con otra programación.
      // Esta se reintentará en la siguiente vuelta.
      cursor = {
        programacion: id,
        ciudadano: '0',
      };

      console.error(
        '[recordatorios:programacion]',
        id,
        error.code || error.name,
      );
    }
  }

  return resumen;
};

module.exports = generarRecordatorios;