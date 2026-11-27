const { createHash } = require('node:crypto');
const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { getFirebaseMessaging } = require('../../../config/firebase-admin');

const { CONSENTIMIENTO } = require('./registrar-alerta-publica.service');

const PREFERENCIAS = {
  INICIO_RUTA: 'notificar_inicio_ruta',

  CAMBIO_HORARIO: 'notificar_cambios',
  CAMBIO_RUTA: 'notificar_cambios',
  CANCELACION: 'notificar_cambios',

  INCIDENCIA: 'notificar_incidencias',
};

const hash = texto =>
  createHash('sha256')
    .update(texto)
    .digest('hex');

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ==========================================================
// VINCULAR O DESACTIVAR NAVEGADOR
// ==========================================================

async function dispositivo(payload = {}, baja = false) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new AppError(
      'Los datos no son válidos.',
      400,
    );
  }

  const {
    id_suscripcion,
    clave_registro,
    token_push,
  } = payload;

  if (
    !UUID.test(String(id_suscripcion)) ||
    !UUID.test(String(clave_registro))
  ) {
    throw new AppError(
      'Referencia de registro no válida.',
      400,
    );
  }

  if (
    !baja &&
    (
      payload.permiso_notificaciones !== 'AUTORIZADO' ||
      typeof token_push !== 'string' ||
      !/^[\x21-\x7e]{20,512}$/.test(token_push)
    )
  ) {
    throw new AppError(
      'Autoriza las notificaciones para vincular el navegador.',
      400,
    );
  }

  return db.sequelize.transaction(async transaction => {
    const suscripcion =
      await db.SuscripcionAlertaPublica.findOne({
        where: {
          id_suscripcion,

          hash_clave: hash(
            clave_registro.toLowerCase(),
          ),
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (!suscripcion) {
      throw new AppError(
        'Registro no encontrado.',
        404,
      );
    }

    if (
      !baja &&
      (
        !suscripcion.acepta_tratamiento_datos ||
        suscripcion.version_consentimiento !==
        CONSENTIMIENTO.version
      )
    ) {
      throw new AppError(
        'Completa un nuevo registro con el consentimiento vigente.',
        409,
      );
    }

    if (!baja) {
      // Un navegador mantiene una sola asociación activa.
      await db.SuscripcionAlertaPublica.update(
        {
          estado: 'BAJA',
          token_push: null,
        },
        {
          where: {
            token_push,

            id_suscripcion: {
              [Op.ne]: id_suscripcion,
            },
          },

          transaction,
        },
      );
    }

    await suscripcion.update(
      {
        estado: baja ? 'BAJA' : 'ACTIVA',

        token_push: baja ? null : token_push,

        fecha_vinculacion:
          baja ? null : new Date(),
      },
      {
        transaction,
      },
    );

    if (baja) {
      await db.AvisoWebPublico.update(
        {
          estado: 'OMITIDA',
          detalle: 'BAJA',
        },
        {
          where: {
            id_suscripcion,
            estado: 'PENDIENTE',
          },

          transaction,
        },
      );
    }

    return {
      estado: suscripcion.estado,
    };
  });
}

// ==========================================================
// CREAR AVISOS EN LA TRANSACCIÓN DEL EVENTO
// ==========================================================

async function encolar({
  evento,
  idRuta,
  idZona,
  idDomicilio,
  claveEvento,
  titulo,
  mensaje,
  fechaExpiracion,
  transaction,
}) {
  const preferencia = PREFERENCIAS[evento];

  // No enviar proximidad ni eventos de un domicilio particular.
  if (
    !preferencia ||
    idDomicilio != null ||
    (idRuta == null && idZona == null)
  ) {
    return 0;
  }

  if (!transaction || transaction.finished) {
    throw new AppError(
      'Se requiere una transacción activa.',
      500,
    );
  }

  let cursor = null;
  let total = 0;

  for (; ;) {
    const suscripciones =
      await db.SuscripcionAlertaPublica.findAll({
        where: {
          estado: 'ACTIVA',

          acepta_tratamiento_datos: true,

          version_consentimiento:
            CONSENTIMIENTO.version,

          token_push: {
            [Op.ne]: null,
          },

          [preferencia]: true,

          ...(idRuta != null
            ? { id_ruta: idRuta }
            : {}),

          ...(idZona != null
            ? { id_zona: idZona }
            : {}),

          ...(cursor
            ? {
              id_suscripcion: {
                [Op.gt]: cursor,
              },
            }
            : {}),
        },

        attributes: ['id_suscripcion'],

        order: [['id_suscripcion', 'ASC']],
        limit: 200,

        transaction,
      });

    if (!suscripciones.length) {
      break;
    }

    await db.AvisoWebPublico.bulkCreate(
      suscripciones.map(suscripcion => ({
        id_aviso: hash(
          JSON.stringify([
            claveEvento,
            suscripcion.id_suscripcion,
          ]),
        ),

        id_suscripcion:
          suscripcion.id_suscripcion,

        evento,
        titulo,
        mensaje,

        fecha_expiracion:
          fechaExpiracion,

        estado: 'PENDIENTE',
      })),
      {
        transaction,

        // La clave primaria impide duplicar el mismo aviso.
        ignoreDuplicates: true,
      },
    );

    total += suscripciones.length;

    cursor =
      suscripciones[suscripciones.length - 1]
        .id_suscripcion;
  }

  return total;
}

// ==========================================================
// PROCESAR LA COLA
// ==========================================================

async function procesar() {
  const resumen = {
    aceptadas_fcm: 0,
    omitidas: 0,
    errores: 0,
  };

  const origen = new URL(
    process.env.PUBLIC_WEB_URL,
  );

  if (origen.protocol !== 'https:') {
    throw new Error(
      'PUBLIC_WEB_URL debe utilizar HTTPS.',
    );
  }

  const enlace = new URL(
    '/rutas',
    origen,
  ).href;

  // No reenviar automáticamente operaciones cuyo resultado
  // quedó desconocido después de una interrupción.
  await db.AvisoWebPublico.update(
    {
      estado: 'INCIERTA',
      detalle: 'PROCESO_INTERRUMPIDO',
    },
    {
      where: {
        estado: 'PROCESANDO',

        fecha_proceso: {
          [Op.lt]: new Date(
            Date.now() - 5 * 60_000,
          ),
        },
      },
    },
  );

  const pendientes =
    await db.AvisoWebPublico.findAll({
      where: {
        estado: 'PENDIENTE',
      },

      order: [
        ['created_at', 'ASC'],
        ['id_aviso', 'ASC'],
      ],

      limit: 50,
    });

  for (const aviso of pendientes) {
    // Solo un proceso puede tomar este aviso.
    const [tomado] =
      await db.AvisoWebPublico.update(
        {
          estado: 'PROCESANDO',
          fecha_proceso: new Date(),
        },
        {
          where: {
            id_aviso: aviso.id_aviso,
            estado: 'PENDIENTE',
          },
        },
      );

    if (tomado !== 1) {
      continue;
    }

    let suscripcion;

    try {
      suscripcion =
        await db.SuscripcionAlertaPublica.findByPk(
          aviso.id_suscripcion,
        );

      const preferencia =
        PREFERENCIAS[aviso.evento];

      if (
        new Date(aviso.fecha_expiracion).getTime() <=
        Date.now() ||

        !suscripcion ||

        suscripcion.estado !== 'ACTIVA' ||

        !suscripcion.token_push ||

        !suscripcion.acepta_tratamiento_datos ||

        suscripcion.version_consentimiento !==
        CONSENTIMIENTO.version ||

        !preferencia ||

        !suscripcion[preferencia]
      ) {
        await aviso.update({
          estado: 'OMITIDA',
          detalle: 'NO_VIGENTE',
        });

        resumen.omitidas++;
        continue;
      }

      const segundos = Math.max(
        1,
        Math.min(
          2419200,

          Math.floor(
            (
              new Date(aviso.fecha_expiracion).getTime() -
              Date.now()
            ) / 1000,
          ),
        ),
      );

      await getFirebaseMessaging().send({
        token: suscripcion.token_push,

        notification: {
          title: aviso.titulo,
          body: aviso.mensaje,
        },

        data: {
          canal: 'PUBLICO_WEB',
          id_aviso: aviso.id_aviso,
          url: enlace,
        },

        webpush: {
          headers: {
            TTL: String(segundos),
            Urgency: 'normal',
          },

          notification: {
            tag:
              'aviso-web-' + aviso.id_aviso,
          },

          fcmOptions: {
            link: enlace,
          },
        },
      });

      await aviso.update({
        estado: 'ACEPTADA_FCM',
        detalle: null,
      });

      resumen.aceptadas_fcm++;
    } catch (error) {
      const invalido = [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
      ].includes(error.code);

      await aviso.update({
        estado:
          invalido ? 'FALLIDA' : 'INCIERTA',

        detalle: String(
          error.code || 'ERROR_ENVIO',
        ).slice(0, 100),
      });

      if (invalido && suscripcion) {
        await db.SuscripcionAlertaPublica.update(
          {
            token_push: null,

            estado:
              'PENDIENTE_DISPOSITIVO',
          },
          {
            where: {
              id_suscripcion:
                suscripcion.id_suscripcion,

              // No invalidar un token nuevo que haya sido
              // registrado mientras se enviaba el anterior.
              token_push:
                suscripcion.token_push,
            },
          },
        );
      }

      resumen.errores++;
    }
  }

  return resumen;
}

module.exports = {
  dispositivo,
  encolar,
  procesar,
};