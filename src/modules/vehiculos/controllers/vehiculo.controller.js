const {
    createVehiculoService,
    getVehiculosPaginadoService,
    getVehiculoByIdService,
    updateVehiculoService,
    changeEstadoVehiculoService,
    deleteVehiculoService,
} = require('../services');

/*
|--------------------------------------------------------------------------
| 1. Crear vehículo
|--------------------------------------------------------------------------
*/

const createVehiculoController = async (
    req,
    res,
    next,
) => {
    try {
        const vehiculo =
            await createVehiculoService(req.body);

        return res.status(201).json({
            success: true,
            message:
                'Vehículo registrado correctamente.',
            data: vehiculo,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| 2. Listar vehículos + Paginado
|--------------------------------------------------------------------------
*/

const getVehiculosPaginadoController = async (
    req,
    res,
    next,
) => {
    try {
        const result =
            await getVehiculosPaginadoService({
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                estado: req.query.estado,
                estado_operativo:
                    req.query.estado_operativo,
                tipo_vehiculo:
                    req.query.tipo_vehiculo,
            });

        return res.status(200).json({
            success: true,
            message:
                'Vehículos obtenidos correctamente.',
            data: result.vehiculos,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| 3. Obtener vehículo
|--------------------------------------------------------------------------
*/

const getVehiculoByIdController = async (
    req,
    res,
    next,
) => {
    try {
        const vehiculo =
            await getVehiculoByIdService(
                req.params.id,
            );

        return res.status(200).json({
            success: true,
            message:
                'Vehículo obtenido correctamente.',
            data: vehiculo,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| 4. Actualizar vehículo
|--------------------------------------------------------------------------
*/

const updateVehiculoController = async (
    req,
    res,
    next,
) => {
    try {
        const vehiculo =
            await updateVehiculoService(
                req.params.id,
                req.body,
            );

        return res.status(200).json({
            success: true,
            message:
                'Vehículo actualizado correctamente.',
            data: vehiculo,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| 5. Activar o desactivar vehículo
|--------------------------------------------------------------------------
*/

const changeEstadoVehiculoController =
    async (req, res, next) => {
        try {
            const vehiculo =
                await changeEstadoVehiculoService({
                    id_vehiculo: req.params.id,
                    estado: req.body.estado,
                });

            return res.status(200).json({
                success: true,
                message:
                    'Estado del vehículo actualizado correctamente.',
                data: vehiculo,
            });
        } catch (error) {
            next(error);
        }
    };

/*
|--------------------------------------------------------------------------
| 6. Eliminar vehículo
|--------------------------------------------------------------------------
*/

const deleteVehiculoController = async (
    req,
    res,
    next,
) => {
    try {
        const result =
            await deleteVehiculoService(
                req.params.id,
            );

        return res.status(200).json({
            success: true,
            message:
                'Vehículo eliminado correctamente.',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createVehiculoController,
    getVehiculosPaginadoController,
    getVehiculoByIdController,
    updateVehiculoController,
    changeEstadoVehiculoController,
    deleteVehiculoController,
};