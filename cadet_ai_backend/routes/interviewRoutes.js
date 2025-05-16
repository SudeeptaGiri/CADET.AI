// routes/interviewRoutes.js
const express = require('express');
const interviewController = require('../controllers/interviewController');
const authController = require('../controllers/authController');

const router = express.Router();



// All routes require authentication
router.use(authController.protect);


//routes accessible to all authenticated candidates
router.get('/my-interview', interviewController.getMyInterview);
router.get('/:id', interviewController.getInterview);

// All routes require admin access
router.use(authController.restrictToAdmin);

// Get available topics and interview types
router.get('/topics', interviewController.getAvailableTopics);
router.get('/types', interviewController.getInterviewTypes);

// Interview routes
router.route('/')
  .get(interviewController.getAllInterviews)
  .post(interviewController.createInterview);

router.route('/:id')
  .patch(interviewController.updateInterview)
  .delete(interviewController.deleteInterview);

// Cancel interview
router.patch('/:id/cancel', interviewController.cancelInterview);

// Get interview credentials
router.get('/:id/credentials', interviewController.getInterviewCredentials);

module.exports = router;