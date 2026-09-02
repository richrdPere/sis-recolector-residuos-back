const db = require('../database/models');

const {
  Roles,
  sequelize,
} = db;

const ROLES_SISTEMA = [
  {
    nombre: 'SUPER_ADMIN',
    descripcion: 'Configuración técnica y administración total del sistema.',
  },
  {
    nombre: 'ADMIN',
    descripcion: 'Gestión institucional de usuarios, rutas y vehículos.',
  },
  {
    nombre: 'SUPERVISOR',
    descripcion: 'Programación y supervisión de las operaciones.',
  },
  {
    nombre: 'OPERADOR',
    descripcion: 'Monitoreo diario, incidencias y cambios de horario.',
  },
  {
    nombre: 'CONDUCTOR',
    descripcion: 'Ejecución de la ruta y transmisión de ubicación GPS.',
  },
  {
    nombre: 'RECOLECTOR',
    descripcion: 'Registro de puntos atendidos, residuos e incidencias.',
  },
  {
    nombre: 'CIUDADANO',
    descripcion: 'Consulta de horarios, avisos y reportes ciudadanos.',
  },
];

async function crearRolesPorDefecto() {
  const transaction =
    await sequelize.transaction();

  try {
    console.log(
      '🔍 Verificando roles por defecto...',
    );

    for (
      const roleData of
      ROLES_SISTEMA
    ) {
      /*
      |--------------------------------------------------------------------------
      | Buscar incluso si fue eliminado lógicamente
      |--------------------------------------------------------------------------
      */

      let rol = await Roles.findOne({
        where: {
          nombre: roleData.nombre,
        },
        paranoid: false,
        transaction,
      });

      if (!rol) {
        rol = await Roles.create(
          {
            nombre: roleData.nombre,
            descripcion: roleData.descripcion,
            estado: true,
          },
          {
            transaction,
          },
        );

        console.log(`✅ Rol creado: ${roleData.nombre}`);

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Restaurar rol eliminado
      |--------------------------------------------------------------------------
      */

      if (rol.deleted_at && typeof rol.restore === 'function') {
        await rol.restore({
          transaction,
        });

        console.log(`♻️ Rol restaurado: ${roleData.nombre}`);
      }

      /*
      |--------------------------------------------------------------------------
      | Mantener descripción y estado actualizados
      |--------------------------------------------------------------------------
      */
      await rol.update(
        {
          descripcion: roleData.descripcion,
          estado: true,
        },
        {
          transaction,
        },
      );

      console.log(`✔️ Rol verificado: ${roleData.nombre}`);
    }

    await transaction.commit();

    console.log('🚀 Roles verificados correctamente.');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      '❌ Error inicializando roles:',
      {
        name: error.name,
        message: error.message,
        original:
          error.original?.message,
        code:
          error.original?.code,
        sql: error.sql,
      },
    );

    throw error;
  }
}

module.exports = crearRolesPorDefecto;