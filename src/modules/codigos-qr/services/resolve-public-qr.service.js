// services/resolve-public-qr.service.js

const db = require('../../../database/models');

// Validations
const { validateToken } = require('../validations/codigo-qr.validation');

// Utils
const {
  hashSensitiveValue,
  isQrExpired,
} = require(
  '../utils/codigo-qr-service.utils',
);

// Modelos
const {
  CodigoQr,
  CodigoQrAcceso,
} = db;

// ===============================================
// SERVICE: Resolver codigo QR para el publico
// ===============================================
const detectPlatform = (userAgent,) => {
  const value =
    String(
      userAgent || '',
    ).toLowerCase();

  if (
    /ipad|tablet/.test(
      value,
    )
  ) {
    return 'TABLET';
  }

  if (
    /android|iphone|mobile/.test(
      value,
    )
  ) {
    return 'MOVIL';
  }

  if (
    /windows|macintosh|linux/.test(
      value,
    )
  ) {
    return 'ESCRITORIO';
  }

  return 'DESCONOCIDA';
};

const registerAccess =
  async ({
    codigoQr = null,
    token,
    resultado,
    ip = null,
    user_agent = null,
    referer = null,
    idioma = null,
    startedAt,
    datos = null,
  }) => {
    try {
      await CodigoQrAcceso
        .create({
          id_codigo_qr:
            codigoQr
              ?.id_codigo_qr ||
            null,

          token_consultado_hash:
            hashSensitiveValue(
              token,
            ),

          resultado,

          fecha_acceso:
            new Date(),

          ip_hash:
            hashSensitiveValue(
              ip,
            ),

          user_agent:
            user_agent
              ?.slice(0, 500) ||
            null,

          referer:
            referer
              ?.slice(0, 500) ||
            null,

          plataforma:
            detectPlatform(
              user_agent,
            ),

          idioma:
            idioma
              ?.slice(0, 20) ||
            null,

          duracion_ms:
            Date.now() -
            startedAt,

          datos,
        });
    } catch (error) {
      /*
       * Un error de auditoría no debe impedir
       * la consulta pública.
       */

      console.error(
        'No se pudo registrar el acceso QR:',
        error.message,
      );
    }
  };

const resolvePublicQrService =
  async ({
    token_publico,
    ip = null,
    user_agent = null,
    referer = null,
    idioma = null,
  }) => {
    const startedAt =
      Date.now();

    const token =
      validateToken(
        token_publico,
      );

    const codigoQr =
      await CodigoQr.findOne({
        where: {
          token_publico:
            token,
        },

        include: [
          {
            association:
              'zona',

            required:
              false,
          },
          {
            association:
              'ruta',

            required:
              false,
          },
          {
            association:
              'codigo_reemplazo',

            attributes: [
              'token_publico',
              'estado_qr',
            ],

            required:
              false,
          },
        ],
      });

    if (!codigoQr) {
      await registerAccess({
        token,
        resultado:
          'NO_ENCONTRADO',
        ip,
        user_agent,
        referer,
        idioma,
        startedAt,
      });

      return {
        encontrado: false,

        estado:
          'NO_ENCONTRADO',

        mensaje:
          'El código QR no existe.',
      };
    }

    if (
      codigoQr.estado_qr ===
      'INACTIVO'
    ) {
      await registerAccess({
        codigoQr,
        token,
        resultado:
          'INACTIVO',
        ip,
        user_agent,
        referer,
        idioma,
        startedAt,
      });

      return {
        encontrado: true,

        disponible: false,

        estado:
          'INACTIVO',

        mensaje:
          'El código QR se encuentra temporalmente inactivo.',
      };
    }

    if (
      codigoQr.estado_qr ===
      'REVOCADO'
    ) {
      await registerAccess({
        codigoQr,
        token,
        resultado:
          'REVOCADO',
        ip,
        user_agent,
        referer,
        idioma,
        startedAt,
      });

      return {
        encontrado: true,

        disponible: false,

        estado:
          'REVOCADO',

        reemplazado:
          Boolean(
            codigoQr
              .codigo_reemplazo,
          ),

        mensaje:
          'El código QR fue reemplazado o revocado.',
      };
    }

    if (
      isQrExpired(
        codigoQr,
      )
    ) {
      await registerAccess({
        codigoQr,
        token,
        resultado:
          'EXPIRADO',
        ip,
        user_agent,
        referer,
        idioma,
        startedAt,
      });

      return {
        encontrado: true,

        disponible: false,

        estado:
          'EXPIRADO',

        mensaje:
          'El código QR ha expirado.',
      };
    }

    const plainQr =
      codigoQr.toJSON();

    const resource =
      codigoQr
        .tipo_recurso ===
        'ZONA'
        ? {
          tipo:
            'ZONA',

          id:
            plainQr.zona
              ?.id_zona,

          nombre:
            plainQr.zona
              ?.nombre_zona ??
            plainQr.zona
              ?.nombre ??
            null,
        }
        : {
          tipo:
            'RUTA',

          id:
            plainQr.ruta
              ?.id_ruta,

          nombre:
            plainQr.ruta
              ?.nombre_ruta ??
            plainQr.ruta
              ?.nombre ??
            null,
        };

    await registerAccess({
      codigoQr,
      token,
      resultado:
        'RESUELTO',
      ip,
      user_agent,
      referer,
      idioma,
      startedAt,
      datos: {
        tipo_recurso:
          codigoQr
            .tipo_recurso,
      },
    });

    return {
      encontrado: true,
      disponible: true,

      estado:
        'ACTIVO',

      codigo: {
        titulo:
          codigoQr.titulo,

        descripcion:
          codigoQr
            .descripcion,

        tipo_recurso:
          codigoQr
            .tipo_recurso,
      },

      recurso:
        resource,
    };
  };

module.exports = resolvePublicQrService;