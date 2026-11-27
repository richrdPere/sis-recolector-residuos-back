const db = require('../../database/models');

const getMapaPublico = require(
  '../../modules/publico/services/get-mapa-publico.service',
);

function installPublicMap(io) {
  const namespace = io.of('/mapa-publico');

  const removals = [];

  let closed = false;
  let busy = false;
  let dirty = false;
  let timer = null;
  let lastStart = 0;

  const enqueue = () => {
    if (closed) return;

    dirty = true;

    if (
      busy ||
      timer ||
      !namespace.sockets.size
    ) {
      return;
    }

    // Agrupa cambios y limita las consultas a una por segundo.
    const espera = Math.max(
      100,
      1000 - (Date.now() - lastStart),
    );

    timer = setTimeout(
      publish,
      espera,
    );

    timer.unref?.();
  };

  const publish = async () => {
    timer = null;

    if (
      closed ||
      busy ||
      !dirty ||
      !namespace.sockets.size
    ) {
      return;
    }

    busy = true;
    dirty = false;

    lastStart = Date.now();

    try {
      // Reutilizar siempre los datos públicos.
      // No emitir directamente instancias de los modelos.
      const data = await getMapaPublico();

      if (!closed) {
        namespace.emit(
          'mapa:actualizado',
          data,
        );
      }
    } catch (error) {
      if (!closed) {
        namespace.emit('mapa:error', {
          message:
            'No se pudo actualizar el mapa. Se volverá a intentar.',
        });
      }

      console.error(
        '[mapa-publico]',
        error.code || error.name,
      );
    } finally {
      busy = false;

      // Si hubo otro cambio durante la consulta,
      // publicar también ese estado posterior.
      if (dirty && !closed) {
        enqueue();
      }
    }
  };

  const schedule = (options = {}) => {
    if (options.transaction) {
      options.transaction.afterCommit(
        enqueue,
      );
    } else {
      enqueue();
    }
  };

  const models = [
    db.RecorridoUltimaUbicacion,
    db.Recorrido,
    db.ProgramacionRuta,
    db.Ruta,
    db.RutaVersion,
    db.Zona,
    db.Vehiculo,
  ].filter(Boolean);

  for (const model of models) {
    for (const type of [
      'afterSave',
      'afterDestroy',
      'afterBulkCreate',
    ]) {
      const name =
        'mapa-publico:' + type;

      model.addHook(
        type,
        name,
        (_row, options) => schedule(options),
      );

      removals.push(() => {
        model.removeHook(type, name);
      });
    }

    for (const type of [
      'afterBulkUpdate',
      'afterBulkDestroy',
    ]) {
      const name =
        'mapa-publico:' + type;

      model.addHook(
        type,
        name,
        options => schedule(options),
      );

      removals.push(() => {
        model.removeHook(type, name);
      });
    }
  }

  namespace.on(
    'connection',
    enqueue,
  );

  // También actualiza la caducidad de las posiciones.
  const interval = setInterval(
    enqueue,
    15000,
  );

  interval.unref?.();

  return () => {
    closed = true;

    clearTimeout(timer);
    clearInterval(interval);

    namespace.off(
      'connection',
      enqueue,
    );

    removals.forEach(remove => remove());
  };
}

module.exports = {
  installPublicMap,
};