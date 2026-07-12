const express = require('express');
const router  = express.Router();
const sprintController = require('../controllers/sprintController');
const authMiddleware   = require('../middleware/authMiddleware');

// All sprint routes require authentication
router.use(authMiddleware);

router.get('/',     sprintController.getAllSprints);
router.get('/:id',  sprintController.getSprintById);
router.post('/',    sprintController.createSprint);
router.put('/:id',  sprintController.updateSprint);
router.delete('/:id', sprintController.deleteSprint);

module.exports = router;
