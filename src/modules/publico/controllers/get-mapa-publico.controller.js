// Service
const getMapaPublicoService = require('../services/get-mapa-publico.service');

const getMapaPublicoController = async (_req, res, next) => {
    try {
        const data = await getMapaPublicoService();

        return res.json({
            success: true,
            message: 'Mapa público consultado correctamente.',
            data,
        });
    } catch (error) {
        next(error);
    }

}


module.exports = {
    getMapaPublicoController,
}