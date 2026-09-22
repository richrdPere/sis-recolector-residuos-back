const { Op } = require('sequelize');
const db = require('../../database/models');
const { fail } = require('../utils/errors');

async function resolveQr(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token))
    throw fail('QR inválido.', 'QR_INVALID', 400);

  const qr = await db.CodigoQr.findOne(
    {
      where:
      {
        token_publico: token,
        estado_qr: 'ACTIVO'
      }
    });

  if (!qr || (qr.fecha_expiracion && !(new Date(qr.fecha_expiracion).getTime() > Date.now())))
    throw fail('QR no disponible.', 'QR_UNAVAILABLE');

  if (qr.tipo_recurso === 'ZONA') {
    const zone = await db.Zona.findByPk(qr.id_zona);

    if (!zone?.estado)
      throw fail('Zona no disponible.', 'ZONE_UNAVAILABLE');

  } else if (qr.tipo_recurso !== 'RUTA')
    throw fail('Recurso no disponible.', 'RESOURCE_UNAVAILABLE');

  return qr;
}


function projectLocation(location, recorrido) {
  if (!location || !['EN_CURSO', 'PAUSADO'].includes(recorrido.estado_recorrido))
    return {
      disponible: false
    };

  const time = new Date(location.fecha_dispositivo).getTime();
  const age = Date.now() - time;

  if (!Number.isFinite(time) || age < -300000 || age > 300000 || location.es_ubicacion_simulada)
    return { disponible: false };

  const lat = Number(location.latitud),
    lng = Number(location.longitud);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return {
      disponible: false
    };

  return {
    disponible: true,
    latitud: Number(lat.toFixed(3)),
    longitud: Number(lng.toFixed(3)),
    es_aproximada: true,
    ultima_actualizacion: location.fecha_dispositivo
  };
}


async function snapshot(token) {
  const qr = await resolveQr(token);
  const where = { estado: true, estado_ruta: 'ACTIVA' };

  if (qr.tipo_recurso === 'RUTA')
    where.id_ruta = qr.id_ruta;
  else where.id_zona = qr.id_zona;

  const routes = await db.Ruta.findAll(
    {
      where,
      attributes: ['id_ruta']
    }
  );

  if (qr.tipo_recurso === 'RUTA' && !routes.length)
    throw fail('Ruta no disponible.', 'ROUTE_UNAVAILABLE');

  const rutas = [];
  for (const route of routes) {
    const journey = await db.Recorrido.findOne({
      where: {
        estado: true,
        estado_recorrido: {
          [Op.in]: ['EN_CURSO', 'PAUSADO']
        }
      },
      include: [
        {
          association: 'programacion',
          attributes: [],
          where: {
            id_ruta: route.id_ruta
          },
          required: true
        }],

      order: [['fecha_hora_inicio', 'DESC']],
    });

    const location = journey ? await db.RecorridoUltimaUbicacion.findOne(
      {
        where: {
          id_recorrido: journey.id_recorrido
        }
      }) : null;

    rutas.push({
      id_ruta: route.id_ruta,
      estado: journey ? (journey.estado_recorrido === 'PAUSADO' ? 'DEMORADA' : 'EN_PROCESO') : 'SIN_RECORRIDO_ACTIVO',
      ubicacion: journey ? projectLocation(location, journey) : { disponible: false }
    });
  }

  return {
    qr,
    data: {
      tipo_recurso: qr.tipo_recurso,
      id_recurso: qr.id_ruta || qr.id_zona, rutas
    }
  };
}

module.exports = {
  resolveQr,
  snapshot,
  projectLocation
};
