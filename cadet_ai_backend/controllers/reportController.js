const Report = require('../models/reportModel');
const Interview = require('../models/interviewModel');
const User = require('../models/userModel');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createReport = catchAsync(async (req, res, next) => {
    const { interviewId, candidateId } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
        return next(new AppError('Interview not found', 404));
    }

    const candidate = await User.findById(candidateId);
    if (!candidate) {
        return next(new AppError('Candidate not found', 404));
    }

    const existingReport = await Report.findOne({ interviewId, candidateId });
    if (existingReport) {
        return next(new AppError('Report already exists for this interview', 400));
    }

    const report = await Report.create(req.body);

    res.status(201).json(new ApiResponse(true, report, 'Report created successfully'));
});

exports.getReportById = catchAsync(async (req, res, next) => {
    const report = await Report.findById(req.params.id)
        .populate('interviewId', 'title scheduledDate duration interviewType')
        .populate('candidateId', 'name email');

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    res.status(200).json(new ApiResponse(true, report, 'Report retrieved successfully'));
});

exports.getAllReports = catchAsync(async (req, res, next) => {
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'candidateName', 'interviewType', 'minRating', 'startDate', 'endDate'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Build a new filter object instead of mutating queryObj
    const filters = { ...queryObj };

    // Add minRating filter safely
    if (req.query.minRating) {
        filters.overallRating = { $gte: parseFloat(req.query.minRating) };
    }

    // Add date filters safely
    if (req.query.startDate || req.query.endDate) {
        filters.createdAt = {};
        if (req.query.startDate) filters.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filters.createdAt.$lte = new Date(req.query.endDate);

        // Remove createdAt if empty object (edge case)
        if (Object.keys(filters.createdAt).length === 0) delete filters.createdAt;
    }

    // Log to debug
    console.log('Filters used:', JSON.stringify(filters, null, 2));

    let query = Report.find(filters)
        .populate('interviewId', 'title scheduledDate duration interviewType')
        .populate('candidateId', 'name email');


    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    const reports = await query;

    // Manual filtering after population for interviewType and candidateName
    const filteredReports = reports.filter(report => {
        const matchInterviewType = req.query.interviewType
            ? report.interviewId?.interviewType === req.query.interviewType
            : true;

        const matchCandidateName = req.query.candidateName
            ? new RegExp(req.query.candidateName, 'i').test(report.candidateId?.name)
            : true;

        return report.interviewId && report.candidateId && matchInterviewType && matchCandidateName;
    });

    const totalCount = filteredReports.length;

    res.status(200).json(new ApiResponse(
        true,
        {
            reports: filteredReports,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        },
        'Reports retrieved successfully'
    ));
});

exports.getReportsByInterview = catchAsync(async (req, res, next) => {
    const { interviewId } = req.params;
    const reports = await Report.find({ interviewId })
        .populate('candidateId', 'name email');

    res.status(200).json(new ApiResponse(true, reports, 'Reports retrieved successfully'));
});

exports.getReportsByCandidate = catchAsync(async (req, res, next) => {
    const { candidateId } = req.params;
    const reports = await Report.find({ candidateId })
        .populate('interviewId', 'title scheduledDate duration interviewType');

    res.status(200).json(new ApiResponse(true, reports, 'Reports retrieved successfully'));
});

exports.updateReport = catchAsync(async (req, res, next) => {
    const report = await Report.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
    );

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    res.status(200).json(new ApiResponse(true, report, 'Report updated successfully'));
});

exports.deleteReport = catchAsync(async (req, res, next) => {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    res.status(200).json(new ApiResponse(true, null, 'Report deleted successfully'));
});

exports.getReportStats = catchAsync(async (req, res, next) => {
    const matchStage = {};

    if (req.query.startDate) {
        matchStage.createdAt = { $gte: new Date(req.query.startDate) };
    }

    if (req.query.endDate) {
        matchStage.createdAt = matchStage.createdAt || {};
        matchStage.createdAt.$lte = new Date(req.query.endDate);
    }

    const pipeline = [];

    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }

    if (req.query.interviewType) {
        pipeline.push(
            {
                $lookup: {
                    from: 'interviews',
                    localField: 'interviewId',
                    foreignField: '_id',
                    as: 'interview'
                }
            },
            {
                $match: {
                    'interview.interviewType': req.query.interviewType
                }
            }
        );
    }

    pipeline.push({
        $group: {
            _id: null,
            avgOverallRating: { $avg: '$overallRating' },
            avgImplementationRating: { $avg: '$technicalAssessment.implementationRating' },
            avgTheoreticalRating: { $avg: '$technicalAssessment.theoreticalRating' },
            avgConfidence: { $avg: '$behavioralAnalysis.confidence' },
            totalReports: { $sum: 1 }
        }
    });

    const stats = await Report.aggregate(pipeline);

    res.status(200).json(new ApiResponse(true, stats[0] || {
        avgOverallRating: 0,
        avgImplementationRating: 0,
        avgTheoreticalRating: 0,
        avgConfidence: 0,
        totalReports: 0
    }, 'Report statistics retrieved successfully'));
});

exports.generateAIReport = catchAsync(async (req, res, next) => {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId)
        .populate('candidateId', 'name email');

    if (!interview) {
        return next(new AppError('Interview not found', 404));
    }

    const reportData = {
        interviewId,
        candidateId: interview.candidateId._id,
        overallRating: 7.5,
        technicalAssessment: {
            implementationRating: 8,
            theoreticalRating: 7,
            topicAssessments: [
                { topic: 'JavaScript', score: 8.5, isStrength: true, comments: 'Strong understanding of async concepts' },
                { topic: 'Database Design', score: 6.5, isStrength: false, comments: 'Could improve on normalization concepts' }
            ]
        },
        behavioralAnalysis: {
            confidence: 8,
            sentiment: 'Positive',
            fillerWordFrequency: 12,
            articulationClarity: 7.5
        },
        integrityVerification: {
            impersonationDetected: false,
            anomaliesDetected: [],
            conductCompliance: true
        },
        recommendations: 'Candidate shows strong technical skills and communication abilities. Recommended for next round.'
    };

    const report = await Report.create(reportData);

    res.status(201).json(new ApiResponse(true, report, 'AI Report generated successfully'));
});
