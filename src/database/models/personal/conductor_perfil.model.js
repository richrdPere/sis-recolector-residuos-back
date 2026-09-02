const { DataTypes, } = require('sequelize');

const sequelize = require('../../../config/database');

const ConductorPerfil = sequelize.define('ConductorPerfil', {
    id_conductor: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Relación única con personal operativo
    |--------------------------------------------------------------------------
    |
    | Un trabajador solo puede tener un perfil de conductor.
    |
    */

    id_personal: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,

        references: {
            model:
                'personal_operativo',
            key: 'id_personal',
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },

    numero_licencia: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,

        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue(
                    'numero_licencia',
                    value,
                );

                return;
            }

            this.setDataValue(
                'numero_licencia',
                String(value)
                    .trim()
                    .toUpperCase(),
            );
        },

        validate: {
            notEmpty: {
                msg:
                    'El número de licencia es obligatorio.',
            },

            len: {
                args: [5, 30],
                msg:
                    'El número de licencia debe tener entre 5 y 30 caracteres.',
            },
        },
    },

    /*
    |--------------------------------------------------------------------------
    | Se utiliza STRING y no ENUM
    |--------------------------------------------------------------------------
    |
    | Esto permite manejar categorías como:
    | A-I, A-IIA, A-IIB, A-IIIA, A-IIIB, A-IIIC.
    |
    */

    categoria_licencia: {
        type: DataTypes.STRING(20),
        allowNull: false,

        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue(
                    'categoria_licencia',
                    value,
                );

                return;
            }

            this.setDataValue(
                'categoria_licencia',
                String(value)
                    .trim()
                    .toUpperCase(),
            );
        },

        validate: {
            notEmpty: {
                msg:
                    'La categoría de la licencia es obligatoria.',
            },

            len: {
                args: [2, 20],
                msg:
                    'La categoría de la licencia no es válida.',
            },
        },
    },

    fecha_emision_licencia: {
        type: DataTypes.DATEONLY,
        allowNull: true,

        validate: {
            isDate: {
                msg:
                    'La fecha de emisión de la licencia no es válida.',
            },
        },
    },

    fecha_vencimiento_licencia: {
        type: DataTypes.DATEONLY,
        allowNull: false,

        validate: {
            isDate: {
                msg:
                    'La fecha de vencimiento de la licencia no es válida.',
            },
        },
    },

    estado_licencia: {
        type: DataTypes.ENUM(
            'VIGENTE',
            'VENCIDA',
            'SUSPENDIDA',
            'REVOCADA',
        ),

        allowNull: false,
        defaultValue: 'VIGENTE',
    },

    restricciones: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    observacion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
},
    {
        tableName:
            'conductor_perfiles',

        timestamps: true,
        paranoid: true,

        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',

        indexes: [
            {
                unique: true,
                fields: [
                    'id_personal',
                ],
                name:
                    'uk_conductor_perfil_personal',
            },
            {
                unique: true,
                fields: [
                    'numero_licencia',
                ],
                name:
                    'uk_conductor_numero_licencia',
            },
            {
                fields: [
                    'fecha_vencimiento_licencia',
                ],
                name:
                    'idx_conductor_vencimiento_licencia',
            },
            {
                fields: [
                    'estado_licencia',
                ],
                name:
                    'idx_conductor_estado_licencia',
            },
            {
                fields: [
                    'estado',
                ],
                name:
                    'idx_conductor_estado',
            },
        ],

        validate: {
            fechaVencimientoPosteriorEmision() {
                if (
                    this
                        .fecha_emision_licencia &&
                    this
                        .fecha_vencimiento_licencia &&
                    new Date(
                        this
                            .fecha_vencimiento_licencia,
                    ) <=
                    new Date(
                        this
                            .fecha_emision_licencia,
                    )
                ) {
                    throw new Error(
                        'La fecha de vencimiento debe ser posterior a la fecha de emisión de la licencia.',
                    );
                }
            },
        },
    },
);

module.exports = ConductorPerfil;