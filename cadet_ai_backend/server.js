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