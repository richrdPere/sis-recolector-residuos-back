

// Utils
const { enteroQuery } = require("../utils/mantenimientos.utils");

// Service 
const getMantenimientosPaginatedService = require("./get-mantenimientos-paginated.service");

// *********************************************************
// SERVICE: OBTENER PRÓXIMOS MANTENIMIENTOS
// *********************************************************
const getMantenimientosProximosService = async (
  query = {},
) => {
  const dias = enteroQuery(
    query.dias,
    7,
    'dias',
    365,
  );

  const ahora = new Date();

  const hasta = new Date(
    ahora.getTime() + dias * 24 * 60 * 60 * 1000,
  );

  return getMantenimientosPaginatedService({
    page: query.page,
    limit: query.limit,
    id_vehiculo: query.id_vehiculo,
    tipo_mantenimiento: query.tipo_mantenimiento,

    estado_mantenimiento: 'PROGRAMADO',
    fecha_inicio: ahora.toISOString(),
    fecha_fin: hasta.toISOString(),

    sort_by: 'fecha_inicio_programada',
    sort_order: 'ASC',
  });
};

module.exports = getMantenimientosProximosService;