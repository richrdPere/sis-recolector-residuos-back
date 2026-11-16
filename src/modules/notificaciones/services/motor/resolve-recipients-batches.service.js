'use strict';

const db = require('../../../../database/models');

const AppError = require('../../../../utils/app-error');

const resolveRecipients = require('./resolve-recipients.service');

// ==========================================================
// VALIDAR IDENTIFICADORES SIN PERDER PRECISIÓN
// ==========================================================

function normalizeId(value) {
  if (
    typeof value === 'number' &&
    !Number.isSafeInteger(value)
  ) {
    throw new AppError(
      'Use texto para identificadores BIGINT.',
      400,
      'INVALID_NOTIFICATION_ID',
    );
  }

  const id = String(value ?? '').trim();

  if (
    !/^[1-9]\d*$/.test(id) ||
    BigInt(id) > 9223372036854775807n
  ) {
    throw new AppError(
      'Identificador de destinatario no válido.',
      400,
      'INVALID_NOTIFICATION_ID',
    );
  }

  return id;
}

// ==========================================================
// RESOLVER DESTINATARIOS POR LOTES
// ==========================================================

async function* resolveRecipientsBatches(
  options = {},
  {
    tamanoLote = 200,
  } = {},
) {
  if (
    !Number.isInteger(tamanoLote) ||
    tamanoLote < 1 ||
    tamanoLote > 1000
  ) {
    throw new AppError(
      'El lote debe contener entre 1 y 1000 destinatarios.',
      400,
      'INVALID_RECIPIENT_BATCH_SIZE',
    );
  }

  // Compartir esta referencia evita desplazar horarios
  // o fechas de silencio entre páginas.
  const referencia =
    options.fecha_referencia ?? new Date();

  const base = {
    ...options,

    maxDestinatarios: tamanoLote,
    fecha_referencia: referencia,
  };

  // --------------------------------------------------------
  // USUARIOS EXPLÍCITOS
  // --------------------------------------------------------

  const tipoDestino =
    options.tipo_destino ?? 'USUARIOS';

  if (tipoDestino === 'USUARIOS') {
    const destinatarios =
      options.destinatarios ?? [];

    if (!Array.isArray(destinatarios)) {
      throw new AppError(
        'Lista de destinatarios no válida.',
        400,
        'INVALID_RECIPIENT_LIST',
      );
    }

    // Validar toda la lista antes de crear el primer aviso.
    // Deduplicar antes de dividir evita duplicados entre lotes.
    const ids = [
      ...new Set(
        destinatarios.map(normalizeId),
      ),
    ].sort(
      (a, b) =>
        BigInt(a) < BigInt(b)
          ? -1
          : BigInt(a) > BigInt(b)
            ? 1
            : 0,
    );

    if (!ids.length) {
      yield await resolveRecipients({
        ...base,
        destinatarios: [],
      });

      return;
    }

    for (
      let offset = 0;
      offset < ids.length;
      offset += tamanoLote
    ) {
      yield await resolveRecipients({
        ...base,

        destinatarios: ids.slice(
          offset,
          offset + tamanoLote,
        ),
      });
    }

    return;
  }

  // Reutilizar la validación existente para tipos inválidos.
  if (tipoDestino !== 'CIUDADANOS') {
    yield await resolveRecipients(base);
    return;
  }

  // --------------------------------------------------------
  // CIUDADANOS POR RUTA O ZONA
  // --------------------------------------------------------

  // Fijar una frontera superior evita perseguir registros
  // nuevos indefinidamente durante la paginación.
  const last = await db.Ciudadano.findOne({
    attributes: [
      'id_ciudadano',
    ],

    order: [
      ['id_ciudadano', 'DESC'],
    ],

    transaction: options.transaction,
  });

  const upper = last
    ? normalizeId(last.id_ciudadano)
    : '0';

  let cursor = null;

  do {
    const result = await resolveRecipients({
      ...base,

      despues_de_ciudadano: cursor,
      hasta_ciudadano: upper,
    });

    const next =
      result.siguiente_cursor_ciudadano;

    if (
      next != null &&
      cursor != null &&
      BigInt(next) <= BigInt(cursor)
    ) {
      throw new AppError(
        'El cursor de destinatarios no avanzó.',
        500,
        'RECIPIENT_CURSOR_NOT_ADVANCING',
      );
    }

    yield result;

    cursor = next;
  } while (cursor != null);
}

module.exports = resolveRecipientsBatches;