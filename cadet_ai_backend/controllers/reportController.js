const Report = require('../models/reportModel');
const Session = require('../models/session.model');
const Interview = require('../models/interviewModel');
const User = require('../models/userModel');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { OpenAI } = require('openai');
const { default: mongoose } = require('mongoose');
const openai = new OpenAI({baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY} );


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
  
  console.log(`Generating AI report for interview ID: ${interviewId}`);
  // Get interview and candidate details
  const interview = await Interview.findById(interviewId)
    .populate('candidateUser', 'name email')

  console.log(interview);
  
  if (!interview) {
    return next(new AppError('Interview not found', 404));
  }
  
  // Get corresponding session data (optional but recommended)
  const session = await Session.findOne({ interviewId });
  if (!session) {
    return next(new AppError('Interview session not found', 404));
  }

  const MAX_TRIES = 3;
  let tries = 0;
  let reportData;

//   do {
//     // Generate the report using AI model/service
//     reportData = await generateAIReportData(session, interview);

//     tries++;
//   } while (!isValidReportFormat(reportData) && tries < MAX_TRIES);

    reportData = await generateAIReportData(session, interview);

  // If after all attempts, the report is invalid, stop and error out
  if (!isValidReportFormat(reportData)) {
    return res.status(500).json({
      success: false,
      message: 'AI did not return a valid report format, even after retries.',
      data: null
    });
  }

  const report = await Report.create(reportData);

  res.status(201).json(new ApiResponse(true, report, 'AI Report generated successfully'));
});



// Updated generateAIReportData function with better error handling and logging
const generateAIReportData = async (session, interview) => {
    let totalScore = 0;
    let implementationScores = [];
    let theoreticalScores = [];
    let topicMap = new Map();
    let totalComments = [];
    let behavioralData = [];

    console.log(`Processing ${session.answeredQuestions.length} questions...`);

    for (const q of session.answeredQuestions) {
        const prompt = `
You are a technical interviewer assistant. Analyze and evaluate the candidate's answer.

Provide:
1. A score between 0 and 10 based on correctness and clarity.
2. Theoretical score (0-10) — knowledge of concept.
3. Implementation score (0-10) — how well the concept is applied.
4. A comment on the answer quality.
5. Behavioral traits (confidence, clarity, sentiment, filler word frequency) as observed from the text.

Respond ONLY with valid JSON. No markdown blocks, no extra text.
Return exactly this structure:

{
  "score": 7.5,
  "theoreticalScore": 8.0,
  "implementationScore": 7.0,
  "comment": "Good understanding demonstrated",
  "behavioral": {
    "confidence": 7.5,
    "articulationClarity": 8.0,
    "sentiment": "Positive",
    "fillerWordFrequency": 3
  }
}

Candidate's Response Analysis:
Question Topic: ${q.topic}
Difficulty: ${q.difficulty}
Question: ${q.questionText || 'Not provided'}
User's Answer: ${q.userAnswer}
        `;

        try {
            const completion = await openai.chat.completions.create({
                model: 'google/gemma-3n-e2b-it:free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });

            const response = completion.choices[0].message.content.trim();
            console.log(`AI Response for ${q.topic}:`, response);
            
            const parsed = extractJSONFromText(response);
            
            // Validate parsed data structure
            if (!parsed || typeof parsed !== 'object') {
                console.error('❌ Invalid parsed result for', q.topic, ':', parsed);
                continue; // Skip this question instead of failing entirely
            }

            // Extract with defaults to prevent undefined values
            const score = typeof parsed.score === 'number' ? parsed.score : 5;
            const theoreticalScore = typeof parsed.theoreticalScore === 'number' ? parsed.theoreticalScore : 5;
            const implementationScore = typeof parsed.implementationScore === 'number' ? parsed.implementationScore : 5;
            const comment = typeof parsed.comment === 'string' ? parsed.comment : 'Analysis unavailable';
            const behavioral = parsed.behavioral || {
                confidence: 5,
                articulationClarity: 5,
                sentiment: 'Neutral',
                fillerWordFrequency: 5
            };

            totalScore += score;
            theoreticalScores.push(theoreticalScore);
            implementationScores.push(implementationScore);
            totalComments.push(comment);
            behavioralData.push(behavioral);

            // Group topic-wise
            if (!topicMap.has(q.topic)) {
                topicMap.set(q.topic, { scores: [], comments: [] });
            }
            topicMap.get(q.topic).scores.push(score);
            topicMap.get(q.topic).comments.push(comment);

            console.log(`✅ Successfully processed question: ${q.topic}`);

        } catch (err) {
            console.error(`❌ OpenAI error for question "${q.topic}":`, err);
            // Add default values to prevent division by zero
            totalScore += 5;
            theoreticalScores.push(5);
            implementationScores.push(5);
            totalComments.push('Analysis failed');
            behavioralData.push({
                confidence: 5,
                articulationClarity: 5,
                sentiment: 'Neutral',
                fillerWordFrequency: 5
            });
        }
    }

    // Ensure we have data to work with
    const questionCount = Math.max(session.answeredQuestions.length, 1);
    const avgOverall = totalScore / questionCount;
    const avgTheoretical = theoreticalScores.length > 0 ? theoreticalScores.reduce((a, b) => a + b, 0) / theoreticalScores.length : 5;
    const avgImplementation = implementationScores.length > 0 ? implementationScores.reduce((a, b) => a + b, 0) / implementationScores.length : 5;

    console.log('Calculated averages:', { avgOverall, avgTheoretical, avgImplementation });

    // Create topic-wise breakdown
    const topicAssessments = [];
    for (const [topic, data] of topicMap.entries()) {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        topicAssessments.push({
            topic,
            score: parseFloat(avg.toFixed(1)),
            isStrength: avg >= 7,
            comments: data.comments.join(' | ')
        });
    }

    // Calculate behavioral analysis from collected data
    let behavioralAnalysis = {
        confidence: 7,
        sentiment: 'Neutral',
        fillerWordFrequency: 10,
        articulationClarity: 7
    };

    if (behavioralData.length > 0) {
        const avgConfidence = behavioralData.reduce((sum, b) => sum + (b.confidence || 5), 0) / behavioralData.length;
        const avgClarity = behavioralData.reduce((sum, b) => sum + (b.articulationClarity || 5), 0) / behavioralData.length;
        const avgFillerWords = behavioralData.reduce((sum, b) => sum + (b.fillerWordFrequency || 5), 0) / behavioralData.length;
        
        // Determine dominant sentiment
        const sentiments = behavioralData.map(b => b.sentiment || 'Neutral');
        const sentimentCounts = sentiments.reduce((acc, s) => {
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        const dominantSentiment = Object.entries(sentimentCounts).reduce((a, b) => sentimentCounts[a[0]] > sentimentCounts[b[0]] ? a : b)[0];

        behavioralAnalysis = {
            confidence: parseFloat(avgConfidence.toFixed(1)),
            sentiment: dominantSentiment,
            fillerWordFrequency: Math.round(avgFillerWords),
            articulationClarity: parseFloat(avgClarity.toFixed(1))
        };
    }

    console.log('Behavioral analysis:', behavioralAnalysis);

    // Generate recommendation
    let recommendation = 'Candidate shows adequate technical knowledge. Consider for further evaluation based on role requirements.';

    try {
        const recommendationPrompt = `
Based on interview performance:
- Overall Score: ${avgOverall.toFixed(1)}/10
- Technical Knowledge: ${avgTheoretical.toFixed(1)}/10  
- Implementation Skills: ${avgImplementation.toFixed(1)}/10
- Confidence Level: ${behavioralAnalysis.confidence}/10
- Communication: ${behavioralAnalysis.articulationClarity}/10

Provide a brief recommendation (1-2 sentences) about this candidate's suitability.
Respond with plain text only, no formatting.
        `;

        const recRes = await openai.chat.completions.create({
            model: 'google/gemma-3n-e2b-it:free',
            messages: [{ role: 'user', content: recommendationPrompt }],
            temperature: 0.3
        });

        recommendation = recRes.choices[0].message.content.trim();
        console.log('Generated recommendation:', recommendation);
    } catch (err) {
        console.error('❌ OpenAI recommendation error:', err);
    }
    console.log('Interview ID:', interview);
    // Final Report Data
    const reportData = {
        interviewId: session.interviewId,
        candidateId: interview.candidateUser._id,
        overallRating: parseFloat(avgOverall.toFixed(1)),
        technicalAssessment: {
            implementationRating: parseFloat(avgImplementation.toFixed(1)),
            theoreticalRating: parseFloat(avgTheoretical.toFixed(1)),
            topicAssessments
        },
        behavioralAnalysis: behavioralAnalysis,
        integrityVerification: {
            impersonationDetected: false,
            anomaliesDetected: [],
            conductCompliance: true
        },
        recommendations: recommendation
    };

    console.log('Final report data structure:', JSON.stringify(reportData, null, 2));
    
    // Validate the report before returning
    if (!isValidReportFormat(reportData)) {
        console.error('❌ Generated report failed validation');
        console.error('Report data:', reportData);
    } else {
        console.log('✅ Report passed validation');
    }

    return reportData;
};

// Improved JSON extraction function
function extractJSONFromText(text) {
    try {
        // Remove markdown code blocks
        let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Try direct parsing first
        try {
            return JSON.parse(cleanText);
        } catch (directError) {
            // Extract JSON from text if direct parsing fails
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found');
        }
    } catch (err) {
        console.error("❌ JSON parsing failed:", err.message);
        console.warn("🔍 Raw AI text:\n", text);
        
        // Return fallback values
        return {
            score: 5,
            theoreticalScore: 5,
            implementationScore: 5,
            comment: "Unable to parse AI response",
            behavioral: {
                confidence: 5,
                articulationClarity: 5,
                sentiment: "Neutral",
                fillerWordFrequency: 5
            }
        };
    }
}

// Enhanced validation function with detailed logging
function isValidReportFormat(report) {
    console.log('🔍 Validating report format...');
    
    if (!report) {
        console.error('❌ Report is null/undefined');
        return false;
    }
    
    if (!report.interviewId) {
        console.error('❌ Missing interviewId');
        return false;
    }
    
    if (!report.candidateId) {
        console.error('❌ Missing candidateId');
        return false;
    }
    
    if (typeof report.overallRating !== 'number') {
        console.error('❌ Invalid overallRating:', typeof report.overallRating, report.overallRating);
        return false;
    }
    
    const ta = report.technicalAssessment;
    if (!ta) {
        console.error('❌ Missing technicalAssessment');
        return false;
    }
    
    if (typeof ta.implementationRating !== 'number') {
        console.error('❌ Invalid implementationRating:', typeof ta.implementationRating);
        return false;
    }
    
    if (typeof ta.theoreticalRating !== 'number') {
        console.error('❌ Invalid theoreticalRating:', typeof ta.theoreticalRating);
        return false;
    }
    
    if (!Array.isArray(ta.topicAssessments)) {
        console.error('❌ topicAssessments is not an array');
        return false;
    }
    
    for (let i = 0; i < ta.topicAssessments.length; i++) {
        const t = ta.topicAssessments[i];
        if (typeof t.topic !== 'string' || typeof t.score !== 'number' || 
            typeof t.isStrength !== 'boolean' || typeof t.comments !== 'string') {
            console.error(`❌ Invalid topicAssessment at index ${i}:`, t);
            return false;
        }
    }
    
    const ba = report.behavioralAnalysis;
    if (!ba) {
        console.error('❌ Missing behavioralAnalysis');
        return false;
    }
    
    if (typeof ba.confidence !== 'number' || typeof ba.sentiment !== 'string' ||
        typeof ba.fillerWordFrequency !== 'number' || typeof ba.articulationClarity !== 'number') {
        console.error('❌ Invalid behavioralAnalysis:', ba);
        return false;
    }
    
    const iv = report.integrityVerification;
    if (!iv) {
        console.error('❌ Missing integrityVerification');
        return false;
    }
    
    if (typeof iv.impersonationDetected !== 'boolean' || !Array.isArray(iv.anomaliesDetected) ||
        typeof iv.conductCompliance !== 'boolean') {
        console.error('❌ Invalid integrityVerification:', iv);
        return false;
    }
    
    if (typeof report.recommendations !== 'string') {
        console.error('❌ Invalid recommendations:', typeof report.recommendations);
        return false;
    }
    
    console.log('✅ Report validation passed');
    return true;
}
