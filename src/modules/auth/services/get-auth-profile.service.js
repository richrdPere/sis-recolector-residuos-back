const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    Usuario,
    Roles,
} = db;

const getAuthProfileService = async ({
    id_usuario,
}) => {
    const usuario = await Usuario.findByPk(
        id_usuario,
        {
            attributes: [
                'id_usuario',
                'id_persona',
                'email_acceso',
                'username',
                'estado',
                'ultimo_acceso',
                'created_at',
                'updated_at',
            ],

            include: [
                {
                    association: 'persona',

                    attributes: [
                        'id_persona',
                        'nombres',
                        'apellidos',
                        'tipo_documento',
                        'numero_documento',
                        'fecha_nacimiento',
                        'celular',
                        'direccion',
                        'foto_url',
                        'genero',
                        'estado',
                    ],
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
    );

    if (!usuario) {
        throw new AppError(
            'El usuario autenticado no fue encontrado.',
            404,
            'AUTH_USER_NOT_FOUND',
        );
    }

    if (!usuario.estado) {
        throw new AppError(
            'La cuenta del usuario está inactiva.',
            403,
            'USER_INACTIVE',
        );
    }

    return usuario;
};

module.exports = getAuthProfileService;
