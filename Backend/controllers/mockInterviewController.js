const JobPostingModel = require('../models/jobPostingModel');
const MockInterviewModel = require('../models/mockInterviewModel');
const MockInterviewService = require('../services/mockInterviewService');

/**
 * MockInterviewController (Tasks 11.1, 11.2, 11.3)
 * Handles starting an automated mock interview session for a job posting,
 * persisting the 5 generated questions (3 technical + 2 behavioral STAR) in `mock_interviews`,
 * and saving the Job Seeker's sequential typed or recorded responses.
 */
class MockInterviewController {
  /**
   * POST /api/mock-interviews/job/:jobId/start (or POST /api/jobs/:id/mock-interview)
   * Ingests the target job posting's description and requirements, generates 5 tailored
   * interview questions, and stores the session in `mock_interviews`.
   */
  static async startInterview(req, res) {
    try {
      const jobId = req.params.jobId || req.params.id || req.body?.job_id || req.body?.jobId;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to start a mock interview.'
        });
      }

      let job = null;
      if (jobId) {
        job = await JobPostingModel.findById(jobId);
      }

      if (!job && (!req.body || (!req.body.job_description && !req.body.jobDescription))) {
        return res.status(404).json({
          success: false,
          error: 'Target job posting not found.'
        });
      }

      const resolvedJobId = job ? job.id : String(jobId || 'custom_job');
      const forceNew = Boolean(req.body && req.body.forceNew);

      // Resume existing in-progress interview session unless forceNew is requested
      if (!forceNew && job) {
        const existingSessions = await MockInterviewModel.findByUserAndJob(userId, resolvedJobId);
        const activeSession = existingSessions.find(
          (s) => s.status === MockInterviewModel.STATUS_IN_PROGRESS && Array.isArray(s.questions) && s.questions.length === 5
        );
        if (activeSession) {
          return res.status(200).json({
            success: true,
            resumed: true,
            interview: activeSession
          });
        }
      }

      const { provider, questions } = await MockInterviewService.generateQuestions({
        job,
        job_description: req.body?.job_description || req.body?.jobDescription,
        requirements: req.body?.requirements,
        title: req.body?.title,
        companyName: req.body?.companyName,
        department: req.body?.department
      });

      const interview = await MockInterviewModel.create({
        user_id: userId,
        job_id: resolvedJobId,
        jobTitle: job?.title || req.body?.title || 'Target Role',
        companyName: job?.companyName || req.body?.companyName || '',
        provider,
        questions
      });

      return res.status(201).json({
        success: true,
        resumed: false,
        interview
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to start mock interview session.'
      });
    }
  }

  /**
   * PUT /api/mock-interviews/:interviewId
   * Saves sequential responses (typed or recorded) to the interview transcript.
   */
  static async saveTranscript(req, res) {
    try {
      const { interviewId } = req.params;
      const userId = req.user?.id;
      const { transcript, singleAnswer, status } = req.body || {};

      const updated = await MockInterviewModel.updateTranscript(interviewId, userId, {
        transcript,
        singleAnswer,
        status
      });

      return res.status(200).json({
        success: true,
        interview: updated
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to save mock interview response.'
      });
    }
  }

  /**
   * GET /api/mock-interviews/:interviewId
   * Retrieve a specific mock interview session by ID
   */
  static async getSessionById(req, res) {
    try {
      const { interviewId } = req.params;
      const session = await MockInterviewModel.findById(interviewId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Mock interview session not found.'
        });
      }

      if (req.user && String(session.user_id) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied.'
        });
      }

      return res.status(200).json({
        success: true,
        interview: session
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to load mock interview session.'
      });
    }
  }

  /**
   * GET /api/mock-interviews/job/:jobId
   * List previous mock interview sessions for the logged-in user and target job posting
   */
  static async listByJob(req, res) {
    try {
      const jobId = req.params.jobId || req.params.id;
      const userId = req.user?.id;

      const interviews = await MockInterviewModel.findByUserAndJob(userId, jobId);
      return res.status(200).json({
        success: true,
        interviews
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch mock interview history.'
      });
    }
  }
}

module.exports = MockInterviewController;
