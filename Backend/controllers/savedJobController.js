const SavedJobModel = require('../models/savedJobModel');
const JobPostingModel = require('../models/jobPostingModel');

class SavedJobController {
  /**
   * POST /api/jobs/:id/save
   * Bookmark a published job for the logged-in user
   */
  static async save(req, res) {
    try {
      const job = await JobPostingModel.findById(req.params.id);
      if (!job || job.status !== JobPostingModel.STATUS_PUBLISHED) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      await SavedJobModel.save(req.user.id, job.id);
      return res.status(201).json({ saved: true });
    } catch (error) {
      console.error('Save job error:', error);
      return res.status(500).json({ error: 'Failed to save job.' });
    }
  }

  /**
   * DELETE /api/jobs/:id/save
   * Remove a job from the logged-in user's saved list
   */
  static async unsave(req, res) {
    try {
      await SavedJobModel.remove(req.user.id, req.params.id);
      return res.status(200).json({ saved: false });
    } catch (error) {
      console.error('Unsave job error:', error);
      return res.status(500).json({ error: 'Failed to remove saved job.' });
    }
  }

  /**
   * GET /api/jobs/saved
   * The logged-in user's saved jobs (deleted/unpublished jobs are skipped)
   */
  static async listMine(req, res) {
    try {
      const saves = await SavedJobModel.findByUser(req.user.id);
      const jobs = await Promise.all(saves.map((s) => JobPostingModel.findById(s.jobId)));
      return res.status(200).json({
        jobs: jobs.filter((j) => j && j.status === JobPostingModel.STATUS_PUBLISHED)
      });
    } catch (error) {
      console.error('List saved jobs error:', error);
      return res.status(500).json({ error: 'Failed to load saved jobs.' });
    }
  }
}

module.exports = SavedJobController;