
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config/config');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const reportRoutes = require('./routes/reportRoutes'); // Add this line
const questionRoutes = require('./routes/questions.routes');
const sessionRoutes = require('./routes/sessions.routes');

// Connect to MongoDB
mongoose
  .connect(config.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/reports', reportRoutes); // Add this line

app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

// Sample data route to seed the database
app.get('/api/seed', async (req, res) => {
  const Question = require('./models/question.model');
  
  // Clear existing questions
  await Question.deleteMany({});
  
  // Sample questions with more diverse topics matching potential interview topics
  const sampleQuestions = [
    // JavaScript questions
    {
      questionText: 'Explain closures in JavaScript.',
      topic: 'JavaScript',
      category: 'Theoretical',
      difficulty: 'Medium',
      keywords: ['scope', 'lexical environment', 'function', 'variable access', 'private variables'],
      followUps: []
    },
    {
      questionText: 'What is the difference between let, const, and var in JavaScript?',
      topic: 'JavaScript',
      category: 'Theoretical',
      difficulty: 'Easy',
      keywords: ['block scope', 'function scope', 'hoisting', 'reassignment', 'temporal dead zone'],
      followUps: []
    },
    {
      questionText: 'Implement a debounce function in JavaScript.',
      topic: 'JavaScript',
      category: 'Coding',
      difficulty: 'Medium',
      keywords: [],
      testCases: [
        { input: 'rapid function calls', expectedOutput: 'single function call after delay' }
      ],
      followUps: []
    },
    
    // Node.js questions
    {
      questionText: 'Explain the event loop in Node.js.',
      topic: 'Node.js',
      category: 'Theoretical',
      difficulty: 'Medium',
      keywords: ['non-blocking', 'asynchronous', 'single-threaded', 'callbacks', 'event queue', 'libuv'],
      followUps: []
    },
    {
      questionText: 'What are streams in Node.js and how are they used?',
      topic: 'Node.js',
      category: 'Theoretical',
      difficulty: 'Medium',
      keywords: ['readable', 'writable', 'transform', 'pipe', 'buffer', 'data chunks'],
      followUps: []
    },
    {
      questionText: 'Create a simple HTTP server in Node.js that returns JSON data.',
      topic: 'Node.js',
      category: 'Coding',
      difficulty: 'Easy',
      keywords: [],
      testCases: [
        { input: 'GET request', expectedOutput: 'JSON response' }
      ],
      followUps: []
    },
    
    // MongoDB questions
    {
      questionText: 'Explain the concept of indexing in MongoDB.',
      topic: 'MongoDB',
      category: 'Theoretical',
      difficulty: 'Medium',
      keywords: ['performance', 'query optimization', 'b-tree', 'compound index', 'unique index'],
      followUps: []
    },
    {
      questionText: 'What is the aggregation pipeline in MongoDB?',
      topic: 'MongoDB',
      category: 'Theoretical',
      difficulty: 'Medium',
      keywords: ['stages', 'data processing', '$match', '$group', '$project', 'data transformation'],
      followUps: []
    },
    {
      questionText: 'Write a MongoDB query to find documents with an array field containing a specific value.',
      topic: 'MongoDB',
      category: 'Coding',
      difficulty: 'Easy',
      keywords: [],
      testCases: [
        { input: 'Array field search', expectedOutput: 'Matching documents' }
      ],
      followUps: []
    }
  ];
  
  // Insert sample questions
  const questions = await Question.insertMany(sampleQuestions);
  
  // Update follow-ups
  questions[0].followUps = [questions[1]._id];
  await questions[0].save();
  
  questions[3].followUps = [questions[4]._id];
  await questions[3].save();
  
  questions[6].followUps = [questions[7]._id];
  await questions[6].save();
  
  res.status(200).json({ message: 'Database seeded successfully', questions });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Something went wrong!'
  });
});

// Start server
const PORT = config.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
