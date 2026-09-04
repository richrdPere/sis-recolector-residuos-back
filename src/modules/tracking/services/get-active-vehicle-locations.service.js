const db = require('../../../database/models');

// Modelos
const { Recorrido, } = db;

// ===============================================
// Service: Obtener vehículos activos
// ===============================================
const getActiveVehicleLocationsService = async () => {
  const recorridos =
    await Recorrido.findAll({
      where: {
        estado_recorrido:
          'EN_CURSO',

        estado:
          true,
      },

      attributes: [
        'id_recorrido',
        'id_programacion',
        'estado_recorrido',
        'fecha_hora_inicio',
      ],

      include: [
        {
          association:
            'ultima_ubicacion',

          required:
            false,

          attributes: [
            'id_ultima_ubicacion',
            'id_posicion',
            'latitud',
            'longitud',
            'precision_gps',
            'velocidad_mps',
            'rumbo',
            'nivel_bateria',
            'fecha_dispositivo',
            'fecha_recepcion',
            'updated_at',
          ],
        },
        {
          association:
            'programacion',

          required:
            true,

          attributes: [
            'id_programacion',
            'fecha_programada',
            'hora_inicio_programada',
            'hora_fin_programada',
            'estado_programacion',
          ],

          include: [
            {
              association:
                'vehiculo',

              required:
                true,
            },
            {
              association:
                'ruta',

              required:
                true,

              include: [
                {
                  association:
                    'zona',

                  required:
                    false,
                },
              ],
            },
          ],
        },
      ],

      order: [
        [
          'fecha_hora_inicio',
          'DESC',
        ],
      ],
    });

  return recorridos;
};

module.exports = getActiveVehicleLocationsService;