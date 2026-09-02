const {
    DataTypes,
} = require('sequelize');

const sequelize = require(
    '../../../config/database',
);

const PersonalOperativo = sequelize.define('PersonalOperativo', {
    id_personal: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Relación única con Usuario
    |--------------------------------------------------------------------------
    |
    | Un usuario solo puede tener un perfil laboral.
    |
    */

    id_usuario: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,

        references: {
            model: 'usuarios',
            key: 'id_usuario',
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },

    codigo_empleado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,

        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue(
                    'codigo_empleado',
                    value,
                );

                return;
            }

            this.setDataValue(
                'codigo_empleado',
                String(value)
                    .trim()
                    .toUpperCase(),
            );
        },

        validate: {
            notEmpty: {
                msg:
                    'El código del empleado es obligatorio.',
            },

            len: {
                args: [2, 30],
                msg:
                    'El código del empleado debe tener entre 2 y 30 caracteres.',
            },
        },
    },

    fecha_ingreso: {
        type: DataTypes.DATEONLY,
        allowNull: false,

        validate: {
            isDate: {
                msg:
                    'La fecha de ingreso no es válida.',
            },
        },
    },

    fecha_salida: {
        type: DataTypes.DATEONLY,
        allowNull: true,

        validate: {
            isDate: {
                msg:
                    'La fecha de salida no es válida.',
            },
        },
    },

    tipo_contrato: {
        type: DataTypes.ENUM(
            'NOMBRADO',
            'CONTRATADO',
            'CAS',
            'LOCADOR',
            'TERCERO',
            'OTRO',
        ),

        allowNull: false,
        defaultValue: 'CONTRATADO',
    },

    turno_preferente: {
        type: DataTypes.ENUM(
            'MANANA',
            'TARDE',
            'NOCHE',
            'ROTATIVO',
        ),

        allowNull: true,
    },

    estado_laboral: {
        type: DataTypes.ENUM(
            'ACTIVO',
            'VACACIONES',
            'DESCANSO_MEDICO',
            'SUSPENDIDO',
            'CESADO',
        ),

        allowNull: false,
        defaultValue: 'ACTIVO',
    },

    observacion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Estado administrativo del registro
    |--------------------------------------------------------------------------
    |
    | estado = false:
    | El registro está deshabilitado en el sistema.
    |
    | estado_laboral:
    | Representa la situación laboral del trabajador.
    |
    */

    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
},
    {
        tableName:
            'personal_operativo',

        timestamps: true,
        paranoid: true,

        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',

        indexes: [
            {
                unique: true,
                fields: [
                    'id_usuario',
                ],
                name:
                    'uk_personal_operativo_usuario',
            },
            {
                unique: true,
                fields: [
                    'codigo_empleado',
                ],
                name:
                    'uk_personal_operativo_codigo',
            },
            {
                fields: [
                    'estado_laboral',
                ],
                name:
                    'idx_personal_estado_laboral',
            },
            {
                fields: [
                    'tipo_contrato',
                ],
                name:
                    'idx_personal_tipo_contrato',
            },
            {
                fields: [
                    'estado',
                ],
                name:
                    'idx_personal_estado',
            },
        ],

        validate: {
            fechaSalidaPosteriorIngreso() {
                if (
                    this.fecha_ingreso &&
                    this.fecha_salida &&
                    new Date(
                        this.fecha_salida,
                    ) <
                    new Date(
                        this.fecha_ingreso,
                    )
                ) {
                    throw new Error(
                        'La fecha de salida no puede ser anterior a la fecha de ingreso.',
                    );
                }
            },
        },
    },
);

module.exports = PersonalOperativo;