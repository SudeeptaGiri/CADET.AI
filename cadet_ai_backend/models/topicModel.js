const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A topic must have a name'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'A topic must have a category'],
    enum: ['frontend', 'backend', 'database', 'devops', 'general', 'language', 'framework']
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;