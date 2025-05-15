const Interview = require('../models/interviewModel');
const Topic = require('../models/topicModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const emailService = require('../services/emailService');

// Get all interviews
exports.getAllInterviews = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // If user is not admin, only show their own interviews
  if (req.user.role !== 'admin') {
    filter.createdBy = req.user._id;
  }
  
  // Apply filters from query params
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.startDate && req.query.endDate) {
    filter.scheduledDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  // Find interviews
  const interviews = await Interview.find(filter)
    .sort({ scheduledDate: -1 })
    .limit(req.query.limit ? parseInt(req.query.limit) : 100);
  
  res.status(200).json({
    status: 'success',
    results: interviews.length,
    data: {
      interviews
    }
  });
});

// Get interview by ID
exports.getInterview = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  
  if (!interview) {
    return next(new AppError('No interview found with that ID', 404));
  }
  
  // Check if user has permission to view this interview
  if (req.user.role !== 'admin' && interview.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to view this interview', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// Create new interview
exports.createInterview = catchAsync(async (req, res, next) => {
  // Add user ID to request body
  req.body.createdBy = req.user._id;
  
  // Create interview
  // const interviewData = req.body;
  // if(interviewData.difficultyLevel=== 1) {
  //   interviewData.difficultyLevel="beginner";
  // }else if(interviewData.difficultyLevel=== 2) {
  //   interviewData.difficultyLevel="intermediate";
  // } else if(interviewData.difficultyLevel=== 3) {
  //   interviewData.difficultyLevel="advanced";
  // }
  const newInterview = await Interview.create(req.body);
  
  // Send interview invitation email
  try {
    await emailService.sendInterviewInvitation(newInterview);
  } catch (err) {
    console.error('Error sending interview invitation:', err);
    // Continue even if email fails
  }
  
  res.status(201).json({
    status: 'success',
    data: {
      interview: newInterview
    }
  });
});

// Update interview
exports.updateInterview = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  
  if (!interview) {
    return next(new AppError('No interview found with that ID', 404));
  }
  
  // Check if user has permission to update this interview
  if (req.user.role !== 'admin' && interview.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to update this interview', 403));
  }
  
  // Check if interview is already completed
  if (interview.status === 'completed') {
    return next(new AppError('Cannot update a completed interview', 400));
  }
  
  // Update interview
  const updatedInterview = await Interview.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      interview: updatedInterview
    }
  });
});

// Delete interview
exports.deleteInterview = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  
  if (!interview) {
    return next(new AppError('No interview found with that ID', 404));
  }
  
  // Check if user has permission to delete this interview
  if (req.user.role !== 'admin' && interview.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to delete this interview', 403));
  }
  
  await Interview.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Cancel interview
exports.cancelInterview = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  
  if (!interview) {
    return next(new AppError('No interview found with that ID', 404));
  }
  
  // Check if user has permission to cancel this interview
  if (req.user.role !== 'admin' && interview.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to cancel this interview', 403));
  }
  
  // Check if interview is already completed
  if (interview.status === 'completed') {
    return next(new AppError('Cannot cancel a completed interview', 400));
  }
  
  // Update status to cancelled
  interview.status = 'cancelled';
  await interview.save();
  
  // Send cancellation email
  try {
    await emailService.sendInterviewCancellation(interview);
  } catch (err) {
    console.error('Error sending cancellation email:', err);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// Get available topics
exports.getAvailableTopics = catchAsync(async (req, res, next) => {
  const topics = await Topic.find({ active: true }).select('name category');
  
  // Transform to simple array if needed
  const topicNames = topics.map(topic => topic.name);
  
  res.status(200).json({
    status: 'success',
    data: topicNames
  });
});

// Get available interview types
exports.getInterviewTypes = catchAsync(async (req, res, next) => {
  const interviewTypes = [
    'Tech Check Interview',
    'Golden Certificate',
    'Campus Hiring',
    'Senior Software Hiring',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist'
  ];
  
  res.status(200).json({
    status: 'success',
    data: interviewTypes
  });
});

// Get interview access credentials
exports.getInterviewCredentials = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id).select('+accessPasswordPlain');
  
  if (!interview) {
    return next(new AppError('No interview found with that ID', 404));
  }
  
  // Check if user has permission to view credentials
  if (req.user.role !== 'admin' && interview.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to view these credentials', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      accessCode: interview.accessCode,
      accessPassword: interview.accessPasswordPlain
    }
  });
});

// Get the interview assigned to the logged-in candidate
exports.getMyInterview = catchAsync(async (req, res, next) => {
  // Check if user is a candidate
  if (req.user.role !== 'candidate') {
    return next(new AppError('Only candidates can access this route', 403));
  }
  
  // Check if the candidate has an assigned interview
  if (!req.user.interview) {
    return next(new AppError('No interview assigned to this candidate', 404));
  }
  
  // Find the interview
  const interview = await Interview.findById(req.user.interview);
  
  if (!interview) {
    return next(new AppError('Interview not found', 404));
  }
  
  // Check if the candidate is authorized to access this interview
  if (interview.candidateEmail !== req.user.email) {
    return next(new AppError('You are not authorized to access this interview', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});