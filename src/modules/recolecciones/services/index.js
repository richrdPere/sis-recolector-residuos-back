// services/index.js

const registerCollectionService = require('./register-collection.service');
const registerCollectionBatchService = require('./register-collection-batch.service');
const getCollectionByIdService = require('./get-collection-by-id.service');
const getRouteCollectionPointsService = require('./get-route-collection-points.service');
const getRouteProgressService = require('./get-route-progress.service');
const annulCollectionService = require('./annul-collection.service');
const registerEvidenceService = require('./register-evidence.service');
const getCollectionEvidencesService = require('./get-collection-evidences.service');
const annulEvidenceService = require('./annul-evidence.service');
const getRecorridoCapacidadService = require("./get-collection-capacidad.service");

module.exports = {
    registerCollectionService,
    registerCollectionBatchService,
    getCollectionByIdService,
    getRouteCollectionPointsService,
    getRouteProgressService,
    annulCollectionService,
    registerEvidenceService,
    getCollectionEvidencesService,
    annulEvidenceService,
    getRecorridoCapacidadService,
};