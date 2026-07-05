const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');

router.get('/', sprintController.getAllSprints);
router.get('/:id', sprintController.getSprintById);
router.post('/', sprintController.createSprint);
router.put('/:id', sprintController.updateSprint);
router.delete('/:id', sprintController.deleteSprint);

module.exports = router;
