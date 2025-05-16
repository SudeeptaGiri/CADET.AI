// const mongoose = require('mongoose');
// const express = require('express');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const morgan = require('morgan');
// const helmet = require('helmet');
// const xss = require('xss-clean');
// const mongoSanitize = require('express-mongo-sanitize');
// const rateLimit = require('express-rate-limit');
// const hpp = require('hpp');
// const compression = require('compression');

// const config = require('./config/config');
// const AppError = require('./utils/appError');
// const authRoutes = require('./routes/authRoutes');
// const interviewRoutes = require('./routes/interviewRoutes');
// const globalErrorHandler = require('./middleware/errorMiddleware');
// // Connect to MongoDB
// mongoose
//   .connect(config.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
//   })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   });

// // Initialize Express app
// const app = express();

// // Set security HTTP headers
// app.use(helmet());

// // Development logging
// if (config.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// // Rate limiting
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000, // 1 hour
//   message: 'Too many requests from this IP, please try again in an hour!'
// });
// app.use('/api', limiter);

// // Body parser
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// app.use(cookieParser());

// // Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// // Data sanitization against XSS
// app.use(xss());

// // Prevent parameter pollution
// app.use(hpp({
//   whitelist: ['duration', 'difficulty', 'status', 'scheduledDate']
// }));

// // Enable CORS
// app.use(cors({
//   origin: config.FRONTEND_URL,
//   credentials: true
// }));

// // Compression
// app.use(compression());

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/interviews', interviewRoutes);

// // Handle undefined routes
// app.all('*', (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// // Global error handler
// app.use(globalErrorHandler);

// // Start server
// const PORT = config.PORT;
// const server = app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', err => {
//   console.error('UNHANDLED REJECTION! 💥 Shutting down...');
//   console.error(err.name, err.message);
//   server.close(() => {
//     process.exit(1);
//   });
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', err => {
//   console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//   console.error(err.name, err.message);
//   process.exit(1);
// });

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