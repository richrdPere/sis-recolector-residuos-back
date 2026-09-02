
const db = require('../../../../database/models',);

// Modelos
const {
  ConductorPerfil,
  Usuario,
  Persona,
  Roles,
} = db;

// Modelo general
const getPersonalIncludes = () => [  {
    model: Usuario,
    as: 'usuario',

    attributes: [
      'id_usuario',
      'id_persona',
      'email_acceso',
      'username',
      'estado',
      'ultimo_acceso',
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
          'email_contacto',
          'tipo_documento',
          'numero_documento',
          'fecha_nacimiento',
          'celular',
          'direccion',
          'foto_url',
          'genero',
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
          'descripcion',
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
  {
    model: ConductorPerfil,
    as: 'conductor',
    required: false,
  },
];


module.exports = getPersonalIncludes;