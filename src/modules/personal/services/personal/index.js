const changePersonalEstadoService = require('./change-personal.service');
const createPersonalService = require('./create-personal.service');
const deletePersonalService = require('./delete-personal.service');
const getPersonalPaginatedService = require('./get-personal-paginated.service');
const getPersonalByIdService = require('./get-personal-by-id.service');
const updatePersonalService = require('./update-personal.service');


module.exports = {
    changePersonalEstadoService,
    createPersonalService,
    deletePersonalService,
    getPersonalPaginatedService,
    getPersonalByIdService,
    updatePersonalService,
};