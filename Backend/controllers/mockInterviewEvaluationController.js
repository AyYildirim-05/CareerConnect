const JobPostingModel = require('../models/jobPostingModel');
const MockInterviewModel = require('../models/mockInterviewModel');
const MockInterviewEvaluationService = require('../services/mockInterviewEvaluationService');

function fail(res, error, fallback) {
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || fallback
  });
}

/**
 * MockInterviewEvaluationController (Tasks 12.1 - 12.3)
 */
class MockInterviewEvaluationController {
  /**
   * POST /api/interviews/:interviewId/evaluate   (body: { force?: boolean })
   * Scores a session's responses, persists the evaluation on the interview document,
   * and returns it. An unchanged transcript returns the stored evaluation (no new LLM call).
   */
  static async evaluate(req, res) {
    try {
      const interviewId = req.params.interviewId || req.params.id;
      const userId = req.user && req.user.id;

      const interview = await MockInterviewModel.findById(interviewId);
      MockInterviewEvaluationService.validateInterview(interview);
      if (String(interview.user_id) !== String(userId)) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }

      const hash = MockInterviewEvaluationService.hashTranscript(interview.transcript);
      const force = Boolean(req.body && req.body.force) || req.query.force === 'true';

      if (!force && interview.evaluation && interview.evaluationHash === hash) {
        return res.status(200).json({ success: true, cached: true, evaluation: interview.evaluation, interview });
      }

      MockInterviewEvaluationService.checkRateLimit(userId);

      const job = await JobPostingModel.findById(interview.job_id);
      const { provider, evaluation } = await MockInterviewEvaluationService.evaluate(interview, job);
      const updated = await MockInterviewModel.saveEvaluation(interviewId, userId, { ...evaluation, provider }, hash);

      return res.status(200).json({ success: true, cached: false, evaluation: updated.evaluation, interview: updated });
    } catch (error) {
      return fail(res, error, 'Failed to evaluate mock interview.');
    }
  }

  /** PATCH /api/interviews/:interviewId/evaluation/save   body: { saved: boolean } */
  static async setSaved(req, res) {
    try {
      const saved = !(req.body && req.body.saved === false);
      const updated = await MockInterviewModel.setSavedToDashboard(req.params.interviewId, req.user.id, saved);
      return res.status(200).json({ success: true, saved: updated.savedToDashboard, interview: updated });
    } catch (error) {
      return fail(res, error, 'Failed to update saved critique.');
    }
  }

  /** GET /api/interviews/evaluations/saved - critiques saved to the user's dashboard */
  static async listSaved(req, res) {
    try {
      const interviews = await MockInterviewModel.findSavedEvaluationsByUser(req.user.id);
      return res.status(200).json({ success: true, interviews });
    } catch (error) {
      return fail(res, error, 'Failed to load saved critiques.');
    }
  }
}

module.exports = MockInterviewEvaluationController;
