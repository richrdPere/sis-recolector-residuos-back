const bcrypt = require('bcryptjs');

const db = require('../database/models');

const {
    Persona,
    Usuario,
    Roles,
    UsuarioRol,
    sequelize,
} = db;

async function crearAdminPorDefecto() {
    const transaction =
        await sequelize.transaction();

    try {
        console.log(
            '🔎 Verificando administrador por defecto...',
        );

        /*
        |--------------------------------------------------------------------------
        | 1. Datos del administrador
        |--------------------------------------------------------------------------
        */

        const adminData = {
            nombres:
                process.env.ADMIN_NOMBRES ||
                'RICHARD',

            apellidos:
                process.env.ADMIN_APELLIDOS ||
                'PEREIRA',

            numero_documento:
                process.env.ADMIN_DOCUMENTO ||
                '12345678',

            celular:
                process.env.ADMIN_CELULAR ||
                '999999999',

            username:
                process.env.ADMIN_USERNAME ||
                '12345678',

            email:
                process.env.ADMIN_EMAIL ||
                'admin@sistema.com',

            password:
                process.env.ADMIN_PASSWORD ||
                '123456',
        };

        /*
        |--------------------------------------------------------------------------
        | 2. Detectar el nombre del campo de correo
        |--------------------------------------------------------------------------
        |
        | Tu modelo inicial utilizaba "email", pero tu script utiliza
        | "email_acceso". Este bloque funciona con cualquiera de los dos.
        |
        */

        let emailField;

        if (
            Usuario.rawAttributes
                ?.email_acceso
        ) {
            emailField =
                'email_acceso';
        } else if (
            Usuario.rawAttributes?.email
        ) {
            emailField = 'email';
        } else {
            throw new Error(
                'El modelo Usuario debe tener el campo email o email_acceso.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Buscar administrador existente
        |--------------------------------------------------------------------------
        */

        let usuario =
            await Usuario.findOne({
                where: {
                    username:
                        adminData.username,
                },
                paranoid: false,
                transaction,
            });

        let persona;

        if (usuario) {
            /*
            |--------------------------------------------------------------------------
            | Restaurar usuario eliminado
            |--------------------------------------------------------------------------
            */

            if (
                usuario.deleted_at &&
                typeof usuario.restore ===
                'function'
            ) {
                await usuario.restore({
                    transaction,
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Buscar persona asociada
            |--------------------------------------------------------------------------
            */

            persona =
                await Persona.findByPk(
                    usuario.id_persona,
                    {
                        transaction,
                    },
                );

            if (!persona) {
                throw new Error(
                    'El administrador existe, pero no tiene una persona asociada.',
                );
            }

            await persona.update(
                {
                    nombres:
                        adminData.nombres,

                    apellidos:
                        adminData.apellidos,

                    celular:
                        adminData.celular,

                    estado: true,
                },
                {
                    transaction,
                },
            );

            await usuario.update(
                {
                    [emailField]:
                        adminData.email,

                    estado: true,
                },
                {
                    transaction,
                },
            );

            console.log(
                '✔️ Administrador existente verificado.',
            );
        } else {
            /*
            |--------------------------------------------------------------------------
            | 4. Buscar persona por documento
            |--------------------------------------------------------------------------
            */

            persona =
                await Persona.findOne({
                    where: {
                        numero_documento:
                            adminData.numero_documento,
                    },
                    transaction,
                });

            if (!persona) {
                persona =
                    await Persona.create(
                        {
                            nombres:
                                adminData.nombres,

                            apellidos:
                                adminData.apellidos,

                            tipo_documento:
                                'DNI',

                            numero_documento:
                                adminData
                                    .numero_documento,

                            celular:
                                adminData.celular,

                            estado: true,
                        },
                        {
                            transaction,
                        },
                    );

                console.log(
                    '✅ Persona del administrador creada.',
                );
            } else {
                await persona.update(
                    {
                        nombres:
                            adminData.nombres,

                        apellidos:
                            adminData.apellidos,

                        celular:
                            adminData.celular,

                        estado: true,
                    },
                    {
                        transaction,
                    },
                );

                console.log(
                    '✔️ Persona del administrador encontrada.',
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 5. Crear usuario administrador
            |--------------------------------------------------------------------------
            */

            const passwordHashed =
                await bcrypt.hash(
                    adminData.password,
                    12,
                );

            usuario =
                await Usuario.create(
                    {
                        id_persona:
                            persona.id_persona,

                        username:
                            adminData.username,

                        [emailField]:
                            adminData.email,

                        password:
                            passwordHashed,

                        estado: true,
                    },
                    {
                        transaction,
                    },
                );

            console.log(
                '✅ Usuario administrador creado.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 6. Obtener todos los roles activos
        |--------------------------------------------------------------------------
        */

        const rolesSistema =
            await Roles.findAll({
                where: {
                    estado: true,
                },
                order: [
                    ['id_rol', 'ASC'],
                ],
                transaction,
            });

        if (!rolesSistema.length) {
            throw new Error(
                'No existen roles activos. Debe ejecutar primero initRoles.js.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 7. Asignar todos los roles al administrador
        |--------------------------------------------------------------------------
        */

        for (
            const rol of
            rolesSistema
        ) {
            let usuarioRol =
                await UsuarioRol.findOne({
                    where: {
                        id_usuario:
                            usuario.id_usuario,

                        id_rol:
                            rol.id_rol,
                    },
                    transaction,
                });

            if (!usuarioRol) {
                usuarioRol =
                    await UsuarioRol.create(
                        {
                            id_usuario:
                                usuario.id_usuario,

                            id_rol:
                                rol.id_rol,

                            estado: true,
                        },
                        {
                            transaction,
                        },
                    );

                console.log(
                    `✅ Rol asignado al administrador: ${rol.nombre}`,
                );
            } else if (
                !usuarioRol.estado
            ) {
                await usuarioRol.update(
                    {
                        estado: true,
                    },
                    {
                        transaction,
                    },
                );

                console.log(
                    `♻️ Rol reactivado para el administrador: ${rol.nombre}`,
                );
            } else {
                console.log(
                    `✔️ El administrador ya tiene el rol: ${rol.nombre}`,
                );
            }
        }

        await transaction.commit();

        console.log(
            '🚀 Administrador inicializado correctamente.',
        );

        console.log(
            `👤 Usuario: ${adminData.username}`,
        );

        console.log(
            `🔐 Roles: ${rolesSistema
                .map((rol) => rol.nombre)
                .join(', ')}`,
        );
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        console.error(
            '❌ Error inicializando administrador:',
            {
                name: error.name,
                message: error.message,
                original: error.original?.message,
                code: error.original?.code,
                sql: error.sql,
            },
        );

        throw error;
    }
}

module.exports = crearAdminPorDefecto;
// const bcrypt = require("bcryptjs");

// const db = require("../database/models");

// const Persona = db.Persona;
// const Usuario = db.Usuario;
// const Roles = db.Roles;
// const UsuarioRol = db.UsuarioRol;

// async function crearAdminPorDefecto() {
//     try {
//         console.log("🔎 Verificando creación automática de usuarios...");

//         // -------------------------------------------------------
//         // 1. Verificar si ya existe un usuario con rol ADMIN
//         // -------------------------------------------------------
//         const adminExiste = await Usuario.findOne({
//             include: [
//                 {
//                     model: Roles,
//                     where: { nombre: "SUPER_ADMIN" },
//                     through: { attributes: [] },
//                     as: "roles"
//                 },
//             ],
//         });

//         if (adminExiste) {
//             console.log("✔ Admin ya existe. Saltando creación initial.");
//             return;
//         }

//         // -------------------------------------------------------
//         // 2. Crear o buscar rol ADMIN
//         // -------------------------------------------------------
//         let adminRol = await Roles.findOne({
//             where: { nombre: "SUPER_ADMIN" },
//         });

//         if (!adminRol) {
//             adminRol = await Roles.create({
//                 nombre: "SUPER_ADMIN",
//                 descripcion: "Administrador del sistema",
//                 estado: true,
//             });
//         }

//         // -------------------------------------------------------
//         // 3. Crear Persona
//         // -------------------------------------------------------
//         const persona = await Persona.create({
//             nombres: "RICHARD",
//             apellidos: "PEREIRA",
//             numero_documento: "12345678",
//             celular: "999999999",
//         });

//         // -------------------------------------------------------
//         // 4. Crear Usuario
//         // -------------------------------------------------------
//         const passwordHashed = await bcrypt.hash("123456", 12);

//         const usuario = await Usuario.create({
//             username: "12345678",
//             email_acceso: "admin@sistema.com",
//             password: passwordHashed,
//             estado: true,
//             id_persona: persona.id_persona, // ajusta si tu PK tiene otro nombre
//         });

//         // -------------------------------------------------------
//         // 5. Asignar rol al usuario
//         // -------------------------------------------------------
//         await UsuarioRol.create({
//             id_usuario: usuario.id_usuario,
//             id_rol: adminRol.id_rol,
//         });

//         console.log("✔ Admin creado correctamente con rol asignado.");

//     } catch (error) {
//         console.error("❌ Error creando admin por defecto:", error);
//     }
// }


// module.exports = crearAdminPorDefecto;
