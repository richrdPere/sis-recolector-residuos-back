// utils/ciudadano-service.utils.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  Ciudadano,
  CiudadanoDomicilio,
  Usuario,
  Zona,
  Ruta,
} = db;

const getUserOrFail = async (
  idUsuario,
  transaction = null,
) => {
  const usuario =
    await Usuario.findByPk(
      idUsuario,
      {
        transaction,
      },
    );

  if (!usuario) {
    throw new AppError(
      'El usuario no fue encontrado.',
      404,
      'USER_NOT_FOUND',
    );
  }

  return usuario;
};

const getCitizenByUserOrFail = async (
  idUsuario,
  options = {},
) => {
  const {
    transaction = null,
    lock = null,
  } = options;

  const ciudadano =
    await Ciudadano.findOne({
      where: {
        id_usuario:
          idUsuario,
      },

      transaction,

      ...(lock
        ? {
          lock,
        }
        : {}),
    });

  if (!ciudadano) {
    throw new AppError(
      'El usuario no tiene un perfil ciudadano.',
      404,
      'CITIZEN_PROFILE_NOT_FOUND',
    );
  }

  return ciudadano;
};

const getAddressOwnedOrFail =
  async ({
    idDomicilio,
    idCiudadano,
    transaction = null,
    lock = null,
  }) => {
    const domicilio =
      await CiudadanoDomicilio
        .findOne({
          where: {
            id_domicilio:
              idDomicilio,

            id_ciudadano:
              idCiudadano,
          },

          transaction,

          ...(lock
            ? {
              lock,
            }
            : {}),
        });

    if (!domicilio) {
      throw new AppError(
        'El domicilio no fue encontrado.',
        404,
        'CITIZEN_ADDRESS_NOT_FOUND',
      );
    }

    return domicilio;
  };

const validateZoneAndRoute =
  async ({
    idZona,
    idRuta = null,
    transaction = null,
  }) => {
    const zona =
      await Zona.findByPk(
        idZona,
        {
          transaction,
        },
      );

    if (!zona) {
      throw new AppError(
        'La zona no fue encontrada.',
        404,
        'ZONE_NOT_FOUND',
      );
    }

    let ruta = null;

    if (idRuta) {
      ruta =
        await Ruta.findByPk(
          idRuta,
          {
            transaction,
          },
        );

      if (!ruta) {
        throw new AppError(
          'La ruta no fue encontrada.',
          404,
          'ROUTE_NOT_FOUND',
        );
      }

      if (
        Number(
          ruta.id_zona,
        ) !== Number(
          idZona,
        )
      ) {
        throw new AppError(
          'La ruta seleccionada no pertenece a la zona del domicilio.',
          409,
          'ROUTE_ZONE_MISMATCH',
        );
      }
    }

    return {
      zona,
      ruta,
    };
  };

module.exports = {
  getUserOrFail,
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
  validateZoneAndRoute,
};