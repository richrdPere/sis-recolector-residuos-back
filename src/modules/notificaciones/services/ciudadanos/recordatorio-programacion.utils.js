const { createHash } = require('node:crypto');

const db = require('../../../../database/models');

const resolver = require('../motor/resolve-recipients.service');

const ESTADOS = [
  'PROGRAMADA',
  'ASIGNADA',
  'ACEPTADA',
];

// Las fechas y horas de programación son locales de Perú.
const inicioServicio = (programacion) => new Date(
  `${programacion.fecha_programada}` +
  `T${programacion.hora_inicio_programada}-05:00`,
);

// Cambiar el estado de aceptación o una observación
// no genera otra versión del recordatorio.
const firmaProgramacion = (programacion) =>
  createHash('sha256')
    .update(
      JSON.stringify([
        String(programacion.id_ruta),
        String(programacion.fecha_programada),
        String(programacion.hora_inicio_programada),
        String(programacion.hora_fin_programada),
      ]),
    )
    .digest('hex');

// Se ejecuta antes de reclamar el envío.
const revisarRecordatorio = async (
  notificacion,
  transaction,
) => {
  const datos = notificacion.datos;

  // No interviene en otros tipos de notificación.
  if (
    notificacion.tipo_notificacion !== 'RECORDATORIO' ||
    datos?.recordatorio_automatico !== true
  ) {
    return {
      accion: 'CONTINUAR',
    };
  }

  if (
    !datos.id_ciudadano ||
    !datos.id_usuario
  ) {
    return {
      accion: 'CANCELAR',
      motivo: 'RECORDATORIO_INCOMPLETO',
    };
  }

  const programacion =
    await db.ProgramacionRuta.findByPk(
      notificacion.id_entidad,
      {
        transaction,
      },
    );

  if (
    notificacion.tipo_entidad !== 'PROGRAMACION' ||
    !programacion ||
    !ESTADOS.includes(
      programacion.estado_programacion,
    ) ||
    firmaProgramacion(programacion) !==
    datos.firma_programacion
  ) {
    return {
      accion: 'CANCELAR',
      motivo: 'PROGRAMACION_MODIFICADA',
    };
  }

  const inicio = inicioServicio(
    programacion,
  );

  if (
    !Number.isFinite(inicio.getTime()) ||
    inicio <= new Date()
  ) {
    return {
      accion: 'CANCELAR',
      motivo: 'SERVICIO_INICIADO_O_VENCIDO',
    };
  }

  // Volver a comprobar preferencias y cobertura:
  // pueden haber cambiado después de crear el aviso.
  const resuelto = await resolver({
    tipo_destino: 'CIUDADANOS',
    evento: 'RECORDATORIO',

    id_ruta: programacion.id_ruta,
    id_ciudadano: datos.id_ciudadano,

    fecha_servicio: inicio,
    fecha_expiracion: inicio,

    enviar_interna: true,
    enviar_push: true,

    transaction,
  });

  const grupo = resuelto.grupos.find(
    item => item.destinatarios.some(
      id => String(id) === String(datos.id_usuario),
    ),
  );

  if (!grupo) {
    return {
      accion: 'CANCELAR',
      motivo: 'PREFERENCIAS_O_COBERTURA',
    };
  }

  const envio = grupo.fecha_programada;

  return {
    accion:
      envio &&
        new Date(envio).getTime() > Date.now() + 1000
        ? 'DIFERIR'
        : 'CONTINUAR',

    fecha_programada: envio,

    enviar_interna: grupo.enviar_interna,
    enviar_push: grupo.enviar_push,
  };
};

module.exports = {
  ESTADOS,
  inicioServicio,
  firmaProgramacion,
  revisarRecordatorio,
};