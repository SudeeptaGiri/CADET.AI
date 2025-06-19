// models/session.model.js
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  interviewId: {
    type: String,
    required: true
  },
  currentTopic: {
    type: String,
    required: true
  },
  currentDifficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  currentQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  questionCount: {
    type: Number,
    default: 0
  },
  topicFailures: {
    type: Number,
    default: 0
  },
  answeredQuestions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    correct: Boolean,
    userAnswer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  skippedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', SessionSchema);