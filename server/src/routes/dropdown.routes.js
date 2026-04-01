const express = require('express');
const router = express.Router();
const { getOptions, addOption, deleteOption } = require('../controllers/dropdown.controller');

router.get('/',       getOptions);
router.post('/',      addOption);
router.delete('/:id', deleteOption);

module.exports = router;
