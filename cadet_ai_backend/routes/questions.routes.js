const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');

// Get questions with filters
router.get('/', questionController.getQuestions);

// Get question by ID
router.get('/:id', questionController.getQuestionById);

// Submit answer
router.post('/submit-answer', questionController.submitAnswer);

// Get next topic
router.get('/next-topic', questionController.getNextTopic);

module.exports = router;