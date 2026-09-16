const db = require('../../../../database/models');

// Validations
const { validateId } = require('../../validations/monitoreo.validation');

// Utils
const {
  getRouteOrFail,
  toPlain,
  getGpsStatus,
  calculateRouteProgress,
  calculateCapacity,
  getCapacityInclude,
  buildOperationalAlerts,
  mapRouteMonitorItem,
} = require('../../utils/monitoreo-service.utils');

// Modelos
const { RecorridoEvento } = db;

// ==============================================================
// SERVICE: Obtener detalles de la ruta para el monitor
// ==============================================================
const getRouteMonitorDetailService = async ({ id_recorrido }) => {
  const recorridoId = validateId(
    id_recorrido,
    'identificador del recorrido',
  );

  const recorridoInstance = await getRouteOrFail(
    recorridoId,
    {
      include: [
        {
          association: 'programacion',
          required: true,
          include: [
            {
              association: 'ruta',
              required: true,
              include: [
                {
                  association: 'zona',
                  required: false,
                },
              ],
            },
            {
              association: 'version_ruta',
              required: true,
              include: [
                {
                  association: 'puntos',
                  required: false,
                  where: {
                    estado: true,
                  },
                },
              ],
            },
            {
              association: 'vehiculo',
              required: true,
            },
            {
              association: 'personal_asignado',
              required: false,
              include: [
                {
                  association: 'personal',
                  required: false,
                },
              ],
            },
          ],
        },
        {
          association: 'ultima_ubicacion',
          required: false,
        },
        {
          association: 'recolecciones',
          required: false,
          include: [
            {
              association: 'punto_ruta',
              required: false,
            },
          ],
        },
        ...getCapacityInclude(),
        {
          association: 'eventos',
          required: false,
          include: [
            {
              association: 'usuario',
              required: false,
              attributes: [
                'id_usuario',
                'username',
              ],
            },
          ],
        },
        {
          association: 'usuario_inicio',
          required: false,
          attributes: [
            'id_usuario',
            'username',
          ],
        },
        {
          association: 'usuario_finalizacion',
          required: false,
          attributes: [
            'id_usuario',
            'username',
          ],
        },
      ],

      order: [
        [
          {
            model: RecorridoEvento,
            as: 'eventos',
          },
          'fecha_evento',
          'DESC',
        ],
      ],
    },
  );

  const recorrido = toPlain(recorridoInstance);
  const programacion = recorrido.programacion;

  /*
   * mapRouteMonitorItem espera que el recorrido esté dentro
   * de la programación.
   */
  const monitorItem = mapRouteMonitorItem({
    ...programacion,
    recorrido,
  });

  const alerts = buildOperationalAlerts([
    monitorItem,
  ]);

  return {
    ...recorrido,
    gps: getGpsStatus(
      recorrido.ultima_ubicacion,
    ),
    progreso: calculateRouteProgress(
      programacion,
      recorrido,
    ),
    capacidad: calculateCapacity(recorrido),
    alertas: alerts,
  };
};

module.exports = getRouteMonitorDetailService;