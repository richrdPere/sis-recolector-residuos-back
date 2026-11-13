const {
  createHash,
  randomUUID,
} = require('node:crypto');

const db = require('../../../database/models');

const AppError = require('../../../utils/app-error');

// Este texto se muestra en Angular y se conserva
// como evidencia del consentimiento registrado.
// Si cambia su contenido, actualiza también la versión.
const CONSENTIMIENTO = Object.freeze({
  version: 'AVISOS-WEB-1.0',

  texto:
    'Autorizo a la Municipalidad Provincial de Calca a guardar mi nombre, ' +
    'celular, sector, ruta y preferencias para gestionar mis avisos de ' +
    'recolección. El registro es voluntario. El celular no queda verificado ' +
    'y este registro no habilita mensajes SMS ni WhatsApp.',
});

const sha256 = valor =>
  createHash('sha256')
    .update(valor)
    .digest('hex');

const registrarAlertaPublicaService = async payload => {
  const fail = (
    mensaje,
    status = 400,
  ) => {
    throw new AppError(
      mensaje,
      status,
      'PUBLIC_ALERT_REGISTRATION_ERROR',
    );
  };

  // ------------------------------------------------------
  // 1. VALIDAR DATOS
  // ------------------------------------------------------
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    fail('Los datos de registro no son válidos.');
  }

  const {
    clave_registro,
    nombre,
    celular,
    id_zona,
    id_ruta,
    inicio,
    cambios,
    incidencias,
    acepta,
    version_consentimiento,
  } = payload;

  if (
    typeof clave_registro !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(clave_registro)
  ) {
    fail('La clave de registro no es válida.');
  }

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length < 2 ||
    nombre.trim().length > 100 ||
    /[\x00-\x1f]/.test(nombre)
  ) {
    fail(
      'El nombre debe contener entre 2 y 100 caracteres.',
    );
  }

  if (
    typeof celular !== 'string' ||
    !/^9\d{8}$/.test(celular.trim())
  ) {
    fail(
      'Ingresa un celular de 9 dígitos que comience con 9.',
    );
  }

  if (
    ![id_zona, id_ruta].every(
      id =>
        Number.isSafeInteger(id) &&
        id > 0,
    )
  ) {
    fail('Selecciona un sector y una ruta válidos.');
  }

  if (
    ![inicio, cambios, incidencias].every(
      valor => typeof valor === 'boolean',
    ) ||
    (!inicio && !cambios && !incidencias)
  ) {
    fail('Selecciona al menos un tipo de aviso.');
  }

  if (acepta !== true) {
    fail(
      'Debes aceptar el tratamiento de los datos indicados.',
    );
  }

  if (
    version_consentimiento !==
    CONSENTIMIENTO.version
  ) {
    fail(
      'El aviso de consentimiento cambió. ' +
      'Recarga la página y revísalo.',
      409,
    );
  }

  // Solo se persisten los campos permitidos.
  const datos = {
    nombre: nombre.trim(),
    celular: celular.trim(),

    id_zona,
    id_ruta,

    notificar_inicio_ruta: inicio,
    notificar_cambios: cambios,
    notificar_incidencias: incidencias,

    version_consentimiento:
      CONSENTIMIENTO.version,
  };

  const hashClave = sha256(
    clave_registro.toLowerCase(),
  );

  const huella = sha256(
    JSON.stringify(datos),
  );

  const respuesta = registro => {
    if (registro.huella_registro !== huella) {
      fail(
        'La clave corresponde a otro envío. ' +
        'Vuelve a enviar el formulario.',
        409,
      );
    }

    // No exponer nombre, celular, hashes ni texto interno.
    return {
      id_suscripcion: registro.id_suscripcion,
      estado: registro.estado,
      requiere_dispositivo: true,
    };
  };

  // ------------------------------------------------------
  // 2. REGISTRAR EN UNA TRANSACCIÓN
  // ------------------------------------------------------
  try {
    return await db.sequelize.transaction(
      async transaction => {
        const existente =
          await db.SuscripcionAlertaPublica.findOne({
            where: {
              hash_clave: hashClave,
            },
            transaction,
          });

        if (existente) {
          return respuesta(existente);
        }

        const zona = await db.Zona.findOne({
          where: {
            id_zona,
            estado: true,
          },

          attributes: ['id_zona'],

          transaction,
          lock: transaction.LOCK.SHARE,
        });

        if (!zona) {
          fail(
            'El sector seleccionado ya no está disponible.',
            409,
          );
        }

        const ruta = await db.Ruta.findOne({
          where: {
            id_ruta,
            id_zona,
            estado: true,
            estado_ruta: 'ACTIVA',
          },

          attributes: ['id_ruta'],

          transaction,
          lock: transaction.LOCK.SHARE,
        });

        if (!ruta) {
          fail(
            'La ruta no está activa o no pertenece ' +
            'al sector seleccionado.',
            409,
          );
        }

        const registro =
          await db.SuscripcionAlertaPublica.create(
            {
              ...datos,

              id_suscripcion: randomUUID(),

              hash_clave: hashClave,
              huella_registro: huella,

              acepta_tratamiento_datos: true,

              // Fecha determinada por el servidor.
              fecha_consentimiento: new Date(),

              texto_consentimiento:
                CONSENTIMIENTO.texto,

              estado: 'PENDIENTE_DISPOSITIVO',
            },

            {
              transaction,
            },
          );

        return respuesta(registro);
      },
    );
  } catch (error) {
    // Recuperar un reintento concurrente:
    // la restricción UNIQUE evita crear dos registros.
    if (
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      const existente =
        await db.SuscripcionAlertaPublica.findOne({
          where: {
            hash_clave: hashClave,
          },
        });

      if (existente) {
        return respuesta(existente);
      }
    }

    throw error;
  }
};

module.exports = {
  CONSENTIMIENTO,
  registrarAlertaPublicaService,
};