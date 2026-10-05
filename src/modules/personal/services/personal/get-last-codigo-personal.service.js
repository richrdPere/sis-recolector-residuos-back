const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const { PersonalOperativo } = db;

const getLastCodigoPersonalService = async () => {

  const ultimoPersonal = await PersonalOperativo.findOne({
    attributes: ['id_personal', 'codigo_empleado'],
    order: [['id_personal', 'DESC']],
  });

  let siguienteNumero = 1;

  if (ultimoPersonal) {
    const codigoActual = String(
      ultimoPersonal.codigo_empleado ?? ''
    ).trim();

    const coincidencia = /^EM(\d+)$/.exec(codigoActual);

    if (!coincidencia) {
      throw new AppError(
        'El último código de personal tiene un formato inválido.',
        500
      );
    }

    const numeroActual = Number(coincidencia[1]);

    if (!Number.isSafeInteger(numeroActual + 1)) {
      throw new AppError(
        'El consecutivo del código de personal excede el límite permitido.',
        500
      );
    }

    siguienteNumero = numeroActual + 1;
  }

  return `EM${String(siguienteNumero).padStart(4, '0')}`;

  // const ultimoPersonal = await PersonalOperativo.findOne({

  //     order: [
  //         ["id_personal", "DESC"]
  //     ]

  // });

  // let siguienteNumero = 1;

  // if (ultimoPersonal && ultimoPersonal.codigo_empleado) {

  //     const numeroActual = parseInt(ultimoPersonal.codigo_empleado.split("-")[1]);
  //     siguienteNumero = numeroActual + 1;
  // }

  // return `PERS-${String(
  //     siguienteNumero
  // ).padStart(4, "0")}`;

}

module.exports = getLastCodigoPersonalService;