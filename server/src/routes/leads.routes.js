const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');
const { authenticate } = require('../middleware/auth');

// All leads routes require authentication
router.use(authenticate);

router.get('/', leadsController.getAll);
router.get('/:id', leadsController.getById);
router.post('/', leadsController.create);
router.put('/:id', leadsController.update);
router.delete('/:id', leadsController.delete);

module.exports = router;
