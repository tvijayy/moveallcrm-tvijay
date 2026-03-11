const express = require('express');
const router = express.Router();
const contractorsController = require('../controllers/contractors.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Contractors routes: admin only
router.use(authenticate);
router.use(requireAdmin);

router.get('/', contractorsController.getAll);
router.get('/:id', contractorsController.getById);
router.post('/', contractorsController.create);
router.put('/:id', contractorsController.update);
router.delete('/:id', contractorsController.delete);

module.exports = router;
