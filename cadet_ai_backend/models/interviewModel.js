const mongoose = require('mongoose');
const crypto = require('crypto');

const interviewSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'An interview must have a title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  interviewType: {
    type: String,
    required: [true, 'An interview must have a type'],
    enum: [
      'Tech Check Interview',
      'Golden Certificate',
      'Campus Hiring',
      'Senior Software Hiring',
      'Full Stack Developer',
      'DevOps Engineer',
      'Data Scientist'
    ]
  },
  candidateName: {
    type: String,
    required: [true, 'Please provide the candidate name']
  },
  candidateEmail: {
    type: String,
    required: [true, 'Please provide the candidate email'],
    lowercase: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: [true, 'An interview must have a scheduled date']
  },
  duration: {
    type: Number,
    required: [true, 'An interview must have a duration'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  difficulty: {
    type: String,
    required: [true, 'An interview must have a difficulty level'],
    enum: ['beginner', 'intermediate', 'advanced']
  },
  topics: {
    type: [String],
    required: [true, 'At least one topic must be selected'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one topic must be selected'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  accessCode: {
    type: String,
    // unique: true
  },
  accessPassword: {
    type: String,
    select: false
  },
  accessPasswordPlain: {
    type: String,
    select: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'An interview must belong to a user']
  },
  candidateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    strengths: [String],
    weaknesses: [String],
    notes: String
  },
  recordingUrl: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
interviewSchema.index({ scheduledDate: 1 });
interviewSchema.index({ candidateEmail: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ accessCode: 1 });
interviewSchema.index({ accessPasswordPlain: 1 });
// Virtual property to calculate end time
interviewSchema.virtual('endTime').get(function() {
  return new Date(this.scheduledDate.getTime() + this.duration * 60000);
});

// Pre-save hook to generate access code and password
interviewSchema.pre('save', async function(next) {
  // Only run this function if it's a new interview or status is modified
  if (!this.isNew && !this.isModified('status')) return next();

  // Generate a unique access code
  this.accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Generate a random password for interview access
  if (this.isNew || this.isModified('status')) {
    const password = Math.random().toString(36).slice(-8).toUpperCase();
    this.accessPasswordPlain = password;
    this.accessPassword = crypto.createHash('sha256').update(password).digest('hex');
  }

  next();
});

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;