const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const config = require('../config/config');

// Create JWT token
const signToken = id => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN || '1d'
  });
};

// Send JWT as response
// controllers/authController.js

const createSendToken = (user, statusCode, req, res) => {
  // Create token
  const token = signToken(user._id);

  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  // Set cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  // Prepare response data
  const responseData = {
    status: 'success',
    token,
    data: {
      user
    }
  };

  // If user is a candidate and has an interview, include the interview ID
  if (user.role === 'candidate' && user.interview) {
    responseData.data.interviewId = user.interview;
  }

  res.status(statusCode).json(responseData);
};

// Admin signup (only for initial admin creation)
exports.adminSignup = catchAsync(async (req, res, next) => {
  // Check if user is trying to create an admin account
  // if (req.body.role !== 'admin') {
  //   return next(new AppError('Only admin accounts can be created through this endpoint', 403));
  // }

  // Create new admin user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: 'admin'
  });

  createSendToken(newUser, 201, req, res);
});

// Admin login
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)) || user.role !== 'admin') {
    return next(new AppError('Incorrect email or password, or not an admin account', 401));
  }

  createSendToken(user, 200, req, res);
});

// Interview access authentication (for candidates)
exports.interviewAccess = catchAsync(async (req, res, next) => {
  const { accessCode, password } = req.body;
  
  if (!accessCode || !password) {
    return next(new AppError('Please provide access code and password', 400));
  }

  const Interview = require('../models/interviewModel');
  
  // Find interview by access code
  const interview = await Interview.findOne({ accessCode }).select('+accessPassword');
  
  if (!interview) {
    return next(new AppError('Invalid access code', 401));
  }
  
  // Check if interview is scheduled
  if (interview.status !== 'scheduled') {
    return next(new AppError('This interview is no longer available', 401));
  }
  
  // Check password
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  if (hashedPassword !== interview.accessPassword) {
    return next(new AppError('Incorrect password', 401));
  }
  
  // Create or get candidate user
  let candidateUser = await User.findOne({ email: interview.candidateEmail });
  
  if (!candidateUser) {
    // Create a new user for the candidate
    console.log('Creating new candidate user');
    const tempPassword = crypto.randomBytes(4).toString('hex');
    candidateUser = await User.create({
      name: interview.candidateName,
      email: interview.candidateEmail,
      password: tempPassword,
      passwordConfirm: tempPassword,
      role: 'candidate',
      interview: interview._id // Set the interview ID here
    });
    
    // Update interview with candidate user
    interview.candidateUser = candidateUser._id;
    await interview.save({ validateBeforeSave: false });
  } else {
    // Update existing user with interview ID
    candidateUser.interview = interview._id;
    await candidateUser.save({ validateBeforeSave: false });
  }
  
  // Create a custom response that includes both user and interview data
  const token = signToken(candidateUser._id);
  
  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  // Set cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  candidateUser.password = undefined;
  
  // Send response with both user and interview data
  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: candidateUser,
      interviewId: interview._id,
      interview: {
        _id: interview._id,
        title: interview.title,
        scheduledDate: interview.scheduledDate,
        duration: interview.duration
      }
    }
  });
});

// Protect routes - middleware to check if user is logged in
exports.protect = catchAsync(async (req, res, next) => {
  // Get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // Verify token
  const decoded = await promisify(jwt.verify)(token, config.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Restrict to admin only
exports.restrictToAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('This route is restricted to admin users', 403));
  }
  next();
};