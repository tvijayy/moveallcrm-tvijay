const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const { authenticate } = require('../middleware/auth');

// All jobs routes require authentication
// router.use(authenticate);

router.get('/', jobsController.getAll);
router.get('/:id', jobsController.getById);
router.post('/', jobsController.create);
router.put('/:id', jobsController.update);
router.delete('/:id', jobsController.delete);

module.exports = router;
