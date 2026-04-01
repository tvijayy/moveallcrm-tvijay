const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/comments.controller');

router.get('/leads/:leadId/comments',  ctrl.getByLead);
router.post('/leads/:leadId/comments', ctrl.create);
router.delete('/comments/:id',         ctrl.remove);

module.exports = router;
