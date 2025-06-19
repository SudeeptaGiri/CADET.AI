// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGODB_URI);

// MongoDB connection
mongoose
  .connect(
    process.env.MONGODB_URI || 'mongodb+srv://gearup:gearUp8@cluster0.idgfejd.mongodb.net/CADET-AI?retryWrites=true&w=majority&appName=Cluster0',
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/reports', reportRoutes);

// Simple test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// In server.js, add this after registering routes
console.log('Available routes:', app._router.stack
  .filter(r => r.route)
  .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
