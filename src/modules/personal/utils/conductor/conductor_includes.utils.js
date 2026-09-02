const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error');

const {
  PersonalOperativo,
  Usuario,
  Persona,
  Roles,
} = db;


const getPersonalWithRoles = async (
  idPersonal,
) => {
  const personal =
    await PersonalOperativo.findByPk(
      idPersonal,
      {
        include: [
          {
            model: Usuario,
            as: 'usuario',

            attributes: [
              'id_usuario',
              'username',
              'email_acceso',
              'estado',
            ],

            required: true,

            include: [
              {
                model: Persona,
                as: 'persona',

                attributes: [
                  'id_persona',
                  'nombres',
                  'apellidos',
                  'estado',
                ],

                required: true,
              },
              {
                model: Roles,
                as: 'roles',

                attributes: [
                  'id_rol',
                  'nombre',
                ],

                where: {
                  estado: true,
                },

                through: {
                  where: {
                    estado: true,
                  },

                  attributes: [],
                },

                required: false,
              },
            ],
          },
        ],
      },
    );

  if (!personal) {
    throw new AppError(
      'El personal operativo no fue encontrado.',
      404,
      'PERSONAL_NOT_FOUND',
    );
  }

  return personal;
};

module.exports = {
  getPersonalWithRoles,
};