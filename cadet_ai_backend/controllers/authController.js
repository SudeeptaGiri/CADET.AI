const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const config = require('../config/config');
const emailService = require('../services/emailService');

// Create JWT token
const signToken = id => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// Send JWT as cookie and JSON response
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + config.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  // Send cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Sign up new user
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role || 'candidate' // Default role is candidate
  });

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(newUser);
  } catch (err) {
    console.error('Error sending welcome email:', err);
  }

  createSendToken(newUser, 201, req, res);
});

// Login user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, req, res);
});

// Logout user
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// Protect routes - middleware to check if user is logged in
exports.protect = catchAsync(async (req, res, next) => {
  // Get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
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

  // Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please log in again.', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Restrict routes to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send it to user's email
  try {
    const resetURL = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
    await emailService.sendPasswordResetEmail(user, resetURL);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later.', 500));
  }
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

// Update password for logged in user
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // Update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Log user in, send JWT
  createSendToken(user, 200, req, res);
});

// Interview access authentication
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
  
  // Check if interview time is valid (not more than 15 minutes before or after scheduled time)
  const now = new Date();
  const interviewTime = new Date(interview.scheduledDate);
  const timeDiff = Math.abs(now - interviewTime) / (1000 * 60); // difference in minutes
  
  if (timeDiff > 15) {
    return next(new AppError('You can only access the interview 15 minutes before or after the scheduled time', 401));
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
    const tempPassword = crypto.randomBytes(4).toString('hex');
    candidateUser = await User.create({
      name: interview.candidateName,
      email: interview.candidateEmail,
      password: tempPassword,
      passwordConfirm: tempPassword,
      role: 'candidate'
    });
    
    // Update interview with candidate user
    interview.candidateUser = candidateUser._id;
    await interview.save({ validateBeforeSave: false });
  }
  
  // Generate token for candidate
  createSendToken(candidateUser, 200, req, res);
});

