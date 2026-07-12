const express = require('express');
const router  = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// All task routes require authentication
router.use(authMiddleware);

router.get('/',                    taskController.getAllTasks);
router.get('/standup',             taskController.getStandupTasks);
router.get('/blockers',            taskController.getBlockersByDate);
router.get('/:id',                 taskController.getTaskById);
router.post('/',                   taskController.createTask);
router.put('/:id/move-tomorrow',   taskController.moveTomorrow);
router.put('/:id',                 taskController.updateTask);
router.delete('/:id',              taskController.deleteTask);

module.exports = router;
