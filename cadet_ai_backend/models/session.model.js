// // models/session.model.js
// const mongoose = require('mongoose');

// const SessionSchema = new mongoose.Schema({
//   userId: {
//     type: String,
//     required: true
//   },
//   interviewId: {
//     type: String,
//     required: true
//   },
//   currentTopic: {
//     type: String,
//     required: true
//   },
//   currentDifficulty: {
//     type: String,
//     required: true,
//     enum: ['Easy', 'Medium', 'Hard']
//   },
//   currentQuestionId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Question'
//   },
//   questionCount: {
//     type: Number,
//     default: 0
//   },
//   topicFailures: {
//     type: Number,
//     default: 0
//   },
//   answeredQuestions: [{
//     questionId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Question'
//     },
//     userAnswer: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   skippedQuestions: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Question'
//   }],
//   status: {
//     type: String,
//     enum: ['active', 'completed', 'abandoned'],
//     default: 'active'
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('Session', SessionSchema);

const mongoose = require('mongoose');

const AnsweredQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  userAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean
    // You can fill this when checking answers if needed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const SkippedQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const SessionSchema = new mongoose.Schema({
  interviewId: {
    type: String,
    required: true,
    unique: true     // Ensures one session per interview
  },
  // If you want multiple users for an interview, change this array/object
  userId: {
    type: String,
    required: true
  },
  answeredQuestions: [AnsweredQuestionSchema],
  skippedQuestions: [SkippedQuestionSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  currentTopic: {
    type: String
  },
  currentDifficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard']
  },
  topicFailures: {
    type: Number,
    default: 0
  },
  questionCount: {
    type: Number,
    default: 0
  },
  finishedAt: {
    type: Date
    // Fill this when interview is done
  }
  
});

module.exports = mongoose.model('Session', SessionSchema);
