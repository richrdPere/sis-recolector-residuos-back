const MODULOS_SUPERVISOR = Object.freeze([
  'ZONAS',
  'RUTAS',
  'HORARIOS',
  'VEHICULOS',
  'PROGRAMACIONES',
  'RECORRIDOS',
  'RECOLECCIONES',
  'RESULTADOS_FINALES',
  'INCIDENCIAS',
  'MANTENIMIENTOS',
  'CODIGOS_QR',
]);

const RESULTADOS = Object.freeze([
  'EXITOSO',
  'RECHAZADO',
  'FALLIDO',
]);

const TIPOS_ACTOR = Object.freeze([
  'USUARIO',
  'SISTEMA',
  'ANONIMO',
]);

const ORIGENES = Object.freeze([
  'WEB',
  'MOVIL',
  'API',
  'SISTEMA',
  'DESCONOCIDO',
]);

const ATRIBUTOS_LISTADO = Object.freeze([
  'id_auditoria',
  'clave_evento',
  'id_usuario',
  'tipo_actor',
  'modulo',
  'accion',
  'tipo_entidad',
  'id_entidad',
  'resultado',
  'fecha_servidor',
  'fecha_dispositivo',
  'origen',
  'request_id',
  'clave_operacion',
]);

const ATRIBUTOS_DETALLE = Object.freeze([
  ...ATRIBUTOS_LISTADO,
  'roles_actor',
  'cambios',
  'motivo',
  'codigo_resultado',
  'ip',
  'user_agent',
]);


module.exports = {
  MODULOS_SUPERVISOR,
  RESULTADOS,
  TIPOS_ACTOR,
  ORIGENES,
  ATRIBUTOS_LISTADO,
  ATRIBUTOS_DETALLE,
};