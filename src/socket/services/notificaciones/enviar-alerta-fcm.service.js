const enviarFcmUsuariosService = require('./enviar-fcm-usuarios.service');

/*
|--------------------------------------------------------------------------
| Convertir valor a String con valor predeterminado
|--------------------------------------------------------------------------
*/
const valueOrDefault = (value, defaultValue = '') => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return defaultValue;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Enviar alerta mediante FCM
|--------------------------------------------------------------------------
*/
const enviarAlertaFcmService = async ({
  alerta,
  destinatariosIds = [],
}) => {
  if (!alerta?.id) {
    return {
      success: false,
      enviados: 0,
      fallidos: 0,
      tokensInvalidos: 0,
      message:
        'No se proporcionó una alerta válida.',
    };
  }

  const title = valueOrDefault(
    alerta.titulo,
    'Nueva alerta',
  );

  const body = valueOrDefault(
    alerta.descripcion,
    'Tienes una nueva alerta de serenazgo.',
  );

  return enviarFcmUsuariosService({
    destinatariosIds,
    contexto: `Alerta ${alerta.id}`,

    /*
    |--------------------------------------------------------------------------
    | Notificación visible
    |--------------------------------------------------------------------------
    |
    | Android la muestra automáticamente cuando la
    | aplicación está en segundo plano o cerrada.
    |
    */
    notification: {
      title,
      body,
    },

    /*
    |--------------------------------------------------------------------------
    | Datos procesados por Flutter
    |--------------------------------------------------------------------------
    |
    | El servicio genérico convierte todos los valores a String.
    |
    */
    data: {
      type: 'ALERTA',

      alerta_id: alerta.id,

      tipo_alerta: valueOrDefault(
        alerta.tipo,
        'INFORMATIVA',
      ),

      prioridad: valueOrDefault(
        alerta.prioridad,
        'MEDIA',
      ),

      estado: valueOrDefault(
        alerta.estado,
        'PENDIENTE',
      ),

      requiere_confirmacion: alerta.requiere_confirmacion ?? false,
      emisor_id: alerta.emisor_id,
      patrullaje_id: alerta.patrullaje_id,
      zona_id: alerta.zona_id,
      incidencia_id: alerta.incidencia_id,
      latitud: alerta.latitud,
      longitud: alerta.longitud,
      fecha_expiracion: alerta.fecha_expiracion,
      ruta: '/alertas',

      /*
       * Flutter puede utilizar estos campos
       * cuando la aplicación está abierta.
       */
      title,
      body,
    },

    /*
    |--------------------------------------------------------------------------
    | Configuración Android
    |--------------------------------------------------------------------------
    */
    android: {
      priority: 'high',

      ttl: 60 * 60 * 1000,

      notification: {
        channelId: 'alertas_criticas',
        priority: 'high',
        sound: 'default',
        defaultVibrateTimings: true,
        visibility: 'public',
      },
    },
  });
};

module.exports = enviarAlertaFcmService;