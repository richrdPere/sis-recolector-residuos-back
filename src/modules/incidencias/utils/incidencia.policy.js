"use strict";

/*
Esta política inicial permite a SUPER_ADMIN, ADMIN y SUPERVISOR gestionar incidencias. Los demás usuarios consultan sus propios reportes.

Recibe dos verificaciones de tu aplicación: acceso al recorrido y elegibilidad del responsable. Así no asumimos asociaciones de personal que no has compartido.
*/

// ==========================================================
// POLÍTICA DE ACCESO
// ==========================================================

function crearPoliticaIncidencias({
  tieneAccesoRecorrido,
  esResponsableElegible,
} = {}) {
  const gestores = [
    "SUPER_ADMIN",
    "ADMIN",
    "SUPERVISOR",
  ];

  // actor.roles debe ser un arreglo de nombres verificados
  // provenientes de la sesión autenticada.
  const tieneRol = (actor, nombres) =>
    Array.isArray(actor.roles) &&
    actor.roles.some((rol) => nombres.includes(rol));

  const esGestor = (actor) =>
    tieneRol(actor, gestores);

  const esPropia = (actor, incidencia) =>
    incidencia != null &&
    String(incidencia.id_usuario_reporte) ===
    String(actor.id_usuario);

  // --------------------------------------------------------
  // ALCANCE DEL LISTADO
  // --------------------------------------------------------

  async function obtenerAlcance({ actor }) {
    if (esGestor(actor)) {
      return {};
    }

    return {
      id_usuario_reporte: actor.id_usuario,
    };
  }

  // --------------------------------------------------------
  // AUTORIZACIÓN POR OPERACIÓN
  // --------------------------------------------------------

  async function autorizar({
    accion,
    actor,
    incidencia,
    datos,
    contexto,
    responsable,
    archivo,
    transaction,
  }) {
    if (
      !actor?.id_usuario ||
      !Array.isArray(actor.roles)
    ) {
      return false;
    }

    const gestor = esGestor(actor);
    const propia = esPropia(actor, incidencia);

    switch (accion) {
      case "listar":
        // El service aplica adicionalmente obtenerAlcance().
        return true;

      case "ver":
      case "ver_archivos":
      case "descargar_archivo":
      case "actualizar":
      case "agregar_archivos":
        return gestor || propia;

      case "crear": {
        const rolesOrigen = {
          WEB_MUNICIPAL: [
            ...gestores,
            "OPERADOR",
          ],

          APP_OPERATIVA: [
            ...gestores,
            "CONDUCTOR",
            "RECOLECTOR",
          ],

          APP_CIUDADANA: [
            "CIUDADANO",
          ],

          WEB_CIUDADANA: [
            "CIUDADANO",
          ],
        };

        if (
          !tieneRol(
            actor,
            rolesOrigen[datos.origen] || [],
          )
        ) {
          return false;
        }

        if (contexto.recorrido && !gestor) {
          if (
            typeof tieneAccesoRecorrido !== "function"
          ) {
            return false;
          }

          return (
            await tieneAccesoRecorrido({
              actor,
              ...contexto,
              transaction,
            })
          ) === true;
        }

        return true;
      }

      case "asignar_responsable":
        if (!gestor) {
          return false;
        }

        if (!responsable) {
          return true;
        }

        if (
          typeof esResponsableElegible !== "function"
        ) {
          return false;
        }

        return (
          await esResponsableElegible({
            actor,
            responsable,
            incidencia,
            transaction,
          })
        ) === true;

      case "cambiar_estado":
        return (
          gestor ||
          (
            propia &&
            datos.estado_incidencia === "CANCELADA" &&
            ["REPORTADA", "EN_REVISION"].includes(
              incidencia.estado_incidencia,
            )
          )
        );

      case "cambiar_habilitacion":
      case "eliminar":
        return gestor;

      case "eliminar_archivo":
        return (
          gestor ||
          (
            propia &&
            String(archivo.id_usuario_carga) ===
            String(actor.id_usuario)
          )
        );

      default:
        return false;
    }
  }

  return {
    autorizar,
    obtenerAlcance,
  };
}

module.exports = {
  crearPoliticaIncidencias,
};