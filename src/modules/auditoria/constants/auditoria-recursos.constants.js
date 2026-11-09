const RECURSOS_AUDITORIA = {
  USUARIO: {
    modulo: 'USUARIOS',
    entidad: 'USUARIO',
    id: 'id_usuario',
    campos: [
      'username',
      'email_acceso',
      'id_persona',
      'estado',
      'roles_ids',
    ],
  },

  PERSONA: {
    modulo: 'USUARIOS',
    entidad: 'PERSONA',
    id: 'id_persona',
    campos: [
      'nombres',
      'apellidos',
      'tipo_documento',
      'numero_documento',
      'email_contacto',
      'celular',
      'estado',
    ],
  },

  ROL_USUARIO: {
    modulo: 'USUARIOS',

    // Permite consultar los cambios de roles
    // dentro del historial del usuario.
    entidad: 'USUARIO',
    id: 'id_usuario',

    campos: [
      'id_rol',
      'estado',
    ],
  },

  PROGRAMACION: {
    modulo: 'PROGRAMACIONES',
    entidad: 'PROGRAMACION',
    id: 'id_programacion',

    campos: [
      'id_ruta',
      'id_ruta_version',
      'id_vehiculo',
      'fecha_programada',
      'hora_inicio_programada',
      'hora_fin_programada',
      'turno',
      'observacion',
      'estado_programacion',
      'fecha_cancelacion',
    ],
  },

  ASIGNACION: {
    modulo: 'PROGRAMACIONES',
    entidad: 'PROGRAMACION_PERSONAL',
    id: 'id_programacion_personal',
    campos: [
      'id_programacion',
      'id_personal',
      'funcion',
      'es_principal',
      'estado_asignacion',
      'fecha_respuesta',
      'observacion',
      'deleted_at',
    ],
  },

  RECORRIDO: {
    modulo: 'RECORRIDOS',
    entidad: 'RECORRIDO',
    id: 'id_recorrido',

    campos: [
      'id_programacion',
      'estado_recorrido',

      'id_usuario_inicio',
      'id_usuario_finalizacion',

      'fecha_hora_inicio',
      'fecha_hora_finalizacion',

      'latitud_inicio',
      'longitud_inicio',
      'precision_inicio',

      'latitud_finalizacion',
      'longitud_finalizacion',
      'precision_finalizacion',

      'kilometraje_inicio',
      'kilometraje_final',

      'distancia_recorrida_metros',
      'duracion_segundos',

      'observacion_inicio',
      'observacion_finalizacion',

      'motivo_cancelacion',
    ],
  },

  ATENCION: {
    modulo: 'RECOLECCIONES',
    entidad: 'RECOLECCION_PUNTO',
    id: 'id_recoleccion',

    campos: [
      'id_recorrido',
      'id_ruta_punto',
      'id_usuario',

      'estado_recoleccion',
      'resultado_atencion',
      'motivo_omision',
      'observacion',

      'fecha_dispositivo',
      'fecha_recepcion',

      'latitud',
      'longitud',
      'precision_gps',

      'distancia_punto_metros',
      'dentro_radio_permitido',
    ],
  },

  RESULTADO_FINAL: {
    modulo: 'RESULTADOS_FINALES',
    entidad: 'RECORRIDO',
    id: 'id_recorrido',
    campos: [
      'cantidad_total',
      'unidad_medida',
      'id_usuario',
      'fecha_dispositivo',
      'fecha_recepcion',
    ],
  },

  VEHICULO: {
    modulo: 'VEHICULOS',
    entidad: 'VEHICULO',
    id: 'id_vehiculo',
    campos: [
      'codigo',
      'placa',
      'marca',
      'modelo',
      'anio',
      'tipo_vehiculo',
      'capacidad_maxima',
      'unidad_capacidad',
      'kilometraje',
      'estado_operativo',
      'estado',
    ],
  },

  MANTENIMIENTO: {
    modulo: 'MANTENIMIENTOS',
    entidad: 'MANTENIMIENTO',
    id: 'id_mantenimiento',
    campos: [
      'id_vehiculo',
      'tipo_mantenimiento',
      'estado_mantenimiento',
      'fecha_inicio_programada',
      'fecha_fin_programada',
      'fecha_inicio_real',
      'fecha_fin_real',
      'fecha_cancelacion',
      'costo_total',
      'vehiculo_operativo',
    ],
  },

  ZONA: {
    modulo: 'ZONAS',
    entidad: 'ZONA',
    id: 'id_zona',
    campos: [
      'codigo',
      'nombre',
      'descripcion',
      'color',
      'centro_latitud',
      'centro_longitud',
      'poligono_geojson',
      'estado',
    ],
  },

  RUTA: {
    modulo: 'RUTAS',
    entidad: 'RUTA',
    id: 'id_ruta',
    campos: [
      'id_zona',
      'codigo',
      'nombre',
      'descripcion',
      'color',
      'estado_ruta',
      'estado',
    ],
  },

  VERSION: {
    modulo: 'RUTAS',
    entidad: 'RUTA_VERSION',
    id: 'id_ruta_version',
    campos: [
      'id_ruta',
      'numero_version',
      'geometria_geojson',
      'distancia_estimada_km',
      'duracion_estimada_min',
      'fecha_vigencia_desde',
      'fecha_vigencia_hasta',
      'vigente',
      'estado',
    ],
  },

  PUNTO: {
    modulo: 'RUTAS',
    entidad: 'RUTA_PUNTO',
    id: 'id_ruta_punto',
    campos: [
      'id_ruta_version',
      'codigo',
      'nombre',
      'tipo_punto',
      'latitud',
      'longitud',
      'orden',
      'radio_atencion_metros',
      'tiempo_estimado_min',
      'obligatorio',
      'estado',
    ],
  },

  HORARIO: {
    modulo: 'HORARIOS',
    entidad: 'RUTA_HORARIO',
    id: 'id_ruta_horario',
    campos: [
      'id_ruta',
      'dia_semana',
      'hora_inicio',
      'hora_fin',
      'frecuencia',
      'fecha_vigencia_desde',
      'fecha_vigencia_hasta',
      'estado',
    ],
  },

  INCIDENCIA: {
    modulo: 'INCIDENCIAS',
    entidad: 'INCIDENCIA',
    id: 'id_incidencia',
    campos: [
      'id_recorrido',
      'id_ruta',
      'id_zona',
      'tipo',
      'prioridad',
      'estado_incidencia',
      'titulo',
      'id_usuario_reporte',
      'id_responsable',
      'fecha_reporte',
      'fecha_resolucion',
      'estado',
    ],
  },

  QR: {
    modulo: 'CODIGOS_QR',
    entidad: 'CODIGO_QR',
    id: 'id_codigo_qr',
    campos: [
      'codigo',
      'tipo_recurso',
      'id_zona',
      'id_ruta',
      'version',
      'id_codigo_reemplazado',
      'estado_qr',
      'fecha_generacion',
      'fecha_expiracion',
      'fecha_revocacion',
    ],
  },

  SESION: {
    modulo: 'AUTENTICACION',
    entidad: 'USUARIO',
    id: 'id_usuario',
    campos: [
      'ultimo_acceso',
      'sesiones_cerradas',
    ],
  },

  EXPORTACION: {
    modulo: 'REPORTES',
    entidad: 'REPORTE_EXPORTACION',
    id: 'id_reporte_exportacion',
    campos: [
      'tipo_reporte',
      'formato',
      'estado',
      'columnas',
      'total_registros',
      'tamano_bytes',
      'fecha_inicio_proceso',
      'fecha_fin_proceso',
    ],
  },
};

module.exports = {
  RECURSOS_AUDITORIA,
};