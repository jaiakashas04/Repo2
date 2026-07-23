const express = require('express');
const { bulkUpload, getLogs, getFacets, getLogById } = require('../controllers/logController');

const router = express.Router();

router.post('/bulk', bulkUpload);
router.get('/facets', getFacets); // must be registered before "/:id" so "facets" isn't parsed as an id
router.get('/:id', getLogById);
router.get('/', getLogs);

module.exports = router;
