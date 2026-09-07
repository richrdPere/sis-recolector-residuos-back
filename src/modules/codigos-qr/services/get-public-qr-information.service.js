// services/get-public-qr-information.service.js

const resolvePublicQrService = require("./resolve-public-qr.service");

const getPublicScheduleService = require('./get-public-schedule.service');
const getPublicRouteStatusService = require('./get-public-route-status.service');
const getPublicRouteLocationService = require('./get-public-route-location.service');

// ===============================================
// SERVICE: Información pública completa
// ===============================================
const getPublicQrInformationService = async ({
  token_publico,
  fecha_referencia = null,
  ip = null,
  user_agent = null,
  referer = null,
  idioma = null,
}) => {
  const qrResult =
    await resolvePublicQrService({
      token_publico,
      ip,
      user_agent,
      referer,
      idioma,
    });

  if (
    !qrResult.encontrado ||
    !qrResult.disponible
  ) {
    return {
      codigo_qr:
        qrResult,

      cronograma:
        null,

      rutas:
        [],
    };
  }

  const resource =
    qrResult.recurso;

  /*
   * QR asociado directamente con una ruta.
   */

  if (
    resource.tipo ===
    'RUTA'
  ) {
    const [
      cronograma,
      estado,
      ubicacion,
    ] =
      await Promise.all([
        getPublicScheduleService({
          id_ruta:
            resource.id,

          fecha_referencia,
        }),

        getPublicRouteStatusService({
          id_ruta:
            resource.id,

          fecha_referencia,
        }),

        getPublicRouteLocationService({
          id_ruta:
            resource.id,
        }),
      ]);

    return {
      codigo_qr:
        qrResult.codigo,

      tipo_recurso:
        'RUTA',

      recurso:
        resource,

      fecha_consulta:
        cronograma
          .fecha_consulta,

      cronograma,

      estado,

      ubicacion,
    };
  }

  /*
   * QR asociado con una zona.
   */

  const cronograma =
    await getPublicScheduleService({
      id_zona:
        resource.id,

      fecha_referencia,
    });

  const rutas =
    await Promise.all(
      cronograma.rutas.map(
        async (
          routeSchedule,
        ) => {
          const [
            estado,
            ubicacion,
          ] =
            await Promise.all([
              getPublicRouteStatusService({
                id_ruta:
                  routeSchedule
                    .ruta
                    .id_ruta,

                fecha_referencia,
              }),

              getPublicRouteLocationService({
                id_ruta:
                  routeSchedule
                    .ruta
                    .id_ruta,
              }),
            ]);

          return {
            ...routeSchedule,
            estado,
            ubicacion,
          };
        },
      ),
    );

  return {
    codigo_qr:
      qrResult.codigo,

    tipo_recurso:
      'ZONA',

    recurso:
      resource,

    fecha_consulta:
      cronograma
        .fecha_consulta,

    zona:
      cronograma.zona,

    rutas,
  };
};

module.exports =
  getPublicQrInformationService;