const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Theoretical', 'Coding']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  keywords: {
    type: [String],
    required: true
  },
  followUps: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Question',
    default: []
  },
  testCases: {
    type: [{
      input: String,
      expectedOutput: String
    }],
    default: []
  }
});

module.exports = mongoose.model('Question', QuestionSchema);