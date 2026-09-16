const COLUMNAS_REPORTE = Object.freeze({
  PROGRAMACIONES: [
    'codigo',
    'fecha_programada',
    'turno',
    'zona',
    'ruta',
    'vehiculo',
    'conductor',
    'equipo',
    'estado',
    'hora_inicio_programada',
    'hora_inicio_real',
    'hora_fin_real',
    'duracion',
  ],

  RECORRIDOS: [
    'codigo',
    'fecha_inicio',
    'fecha_fin',
    'zona',
    'ruta',
    'vehiculo',
    'conductor',
    'distancia_km',
    'puntos_programados',
    'puntos_atendidos',
    'porcentaje_avance',
    'duracion',
    'estado',
  ],

  RECOLECCIONES: [
    'codigo',
    'fecha_recoleccion',
    'zona',
    'ruta',
    'punto',
    'vehiculo',
    'responsable',
    'cantidad',
    'unidad_medida',
    'estado',
    'observaciones',
  ],

  INCIDENCIAS: [
    'codigo',
    'fecha_reporte',
    'tipo',
    'prioridad',
    'descripcion',
    'zona',
    'ruta',
    'vehiculo',
    'reportado_por',
    'responsable',
    'estado',
    'fecha_resolucion',
    'tiempo_atencion',
  ],

  VEHICULOS: [
    'placa',
    'codigo',
    'modelo',
    'capacidad',
    'unidad_capacidad',
    'estado',
    'total_jornadas',
    'cantidad_recolectada',
    'capacidad_promedio',
    'total_incidencias',
    'ultimo_mantenimiento',
    'proximo_mantenimiento',
  ],

  REPORTES_CIUDADANOS: [
    'codigo',
    'fecha_reporte',
    'categoria',
    'descripcion',
    'zona',
    'estado',
    'responsable',
    'fecha_atencion',
    'tiempo_atencion',
    'respuesta',
  ],

  BITACORA_GPS: [
    'fecha_dispositivo',
    'fecha_servidor',
    'latitud',
    'longitud',
    'precision',
    'velocidad',
    'rumbo',
    'bateria',
  ],
});

const obtenerColumnasPermitidas = (
  tipoReporte,
) => {
  return COLUMNAS_REPORTE[tipoReporte]
    ? [...COLUMNAS_REPORTE[tipoReporte]]
    : [];
};

const filtrarColumnasPermitidas = ({
  tipoReporte,
  columnas,
}) => {
  const permitidas =
    obtenerColumnasPermitidas(tipoReporte);

  if (!Array.isArray(columnas)) {
    return permitidas;
  }

  const columnasValidas = columnas.filter(
    (columna) => permitidas.includes(columna),
  );

  return columnasValidas.length
    ? columnasValidas
    : permitidas;
};

module.exports = {
  COLUMNAS_REPORTE,
  obtenerColumnasPermitidas,
  filtrarColumnasPermitidas,
};