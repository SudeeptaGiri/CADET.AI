const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallRating: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  technicalAssessment: {
    implementationRating: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    theoreticalRating: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    topicAssessments: [{
      topic: String,
      score: Number,
      isStrength: Boolean,
      comments: String
    }]
  },
  behavioralAnalysis: {
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral'
    },
    fillerWordFrequency: {
      type: Number,
      default: 0
    },
    articulationClarity: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    }
  },
  integrityVerification: {
    impersonationDetected: {
      type: Boolean,
      default: false
    },
    anomaliesDetected: [{
      type: String
    }],
    conductCompliance: {
      type: Boolean,
      default: true
    }
  },
  recommendations: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);