const ApplicationModel = require('../models/applicationModel');
const JobPostingModel = require('../models/jobPostingModel');
const JobSeekerModel = require('../models/jobSeekerModel');

class ApplicationController {
  // POST /api/applications - Job seeker applies to a job
  static async submit(req, res) {
    try {
      const userId = req.user.id;
      const { jobId, resumeUrl: customResumeUrl } = req.body;

      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required.' });
      }

      // Make sure job exists and is published
      const job = await JobPostingModel.findById(jobId);
      if (!job || job.status !== JobPostingModel.STATUS_PUBLISHED) {
        return res.status(404).json({ error: 'Job posting not found or is no longer active.' });
      }

      // Avoid duplicate applications
      const alreadyApplied = await ApplicationModel.hasUserApplied(userId, jobId);
      if (alreadyApplied) {
        return res.status(409).json({ error: 'You have already applied for this position.' });
      }

      // Get applicant profile for resume and contact info
      const seeker = await JobSeekerModel.findById(userId);
      const profile = seeker?.profile || {};

      const resumeUrl =
        customResumeUrl ||
        profile.resumeUrl ||
        (profile.resumeJson ? 'profile-parsed-resume' : null);

      if (!resumeUrl) {
        return res.status(400).json({
          error: 'No resume found on your profile. Please upload a resume before applying.'
        });
      }

      const applicantName =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        seeker?.email ||
        req.user.email;
      const applicantEmail = seeker?.email || req.user.email;

      const application = await ApplicationModel.create({
        userId,
        jobId,
        resumeUrl,
        companyId: job.companyId || null,
        jobTitle: job.title || '',
        companyName: job.companyName || '',
        applicantName,
        applicantEmail
      });

      return res.status(201).json({
        message: 'Application submitted successfully!',
        application
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_APPLICATION') {
        return res.status(409).json({ error: err.message });
      }
      console.error('ApplicationController.submit error:', err);
      return res.status(500).json({ error: 'Failed to submit application.' });
    }
  }

  // GET /api/applications/mine - All applications for current seeker
  static async listMine(req, res) {
    try {
      const userId = req.user.id;
      const applications = await ApplicationModel.findByUser(userId);

      return res.status(200).json({
        applications
      });
    } catch (err) {
      console.error('ApplicationController.listMine error:', err);
      return res.status(500).json({ error: 'Failed to fetch your applications.' });
    }
  }

  // PATCH /api/applications/:id/status - Recruiter updates applicant status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
      }

      if (!ApplicationModel.VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Invalid status "${status}". Allowed values: ${ApplicationModel.VALID_STATUSES.join(', ')}`
        });
      }

      const application = await ApplicationModel.findById(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      // Check that recruiter owns this job posting
      const job = await JobPostingModel.findById(application.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Associated job posting not found.' });
      }

      if (String(job.recruiterId) !== String(req.user.id)) {
        return res.status(403).json({
          error: 'Forbidden: You can only transition applications for your own job postings.'
        });
      }

      const updated = await ApplicationModel.updateStatus(id, status);

      return res.status(200).json({
        message: `Application status updated to ${status}.`,
        application: updated
      });
    } catch (err) {
      if (err.code === 'INVALID_STATUS') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      console.error('ApplicationController.updateStatus error:', err);
      return res.status(500).json({ error: 'Failed to update application status.' });
    }
  }

  // GET /api/applications/job/:jobId - Recruiter views applicants for a posting
  static async listByJob(req, res) {
    try {
      const { jobId } = req.params;

      const job = await JobPostingModel.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job posting not found.' });
      }

      if (String(job.recruiterId) !== String(req.user.id)) {
        return res.status(403).json({
          error: 'Forbidden: You can only view applicants for your own job postings.'
        });
      }

      const applications = await ApplicationModel.findByJob(jobId);
      return res.status(200).json({ applications });
    } catch (err) {
      console.error('ApplicationController.listByJob error:', err);
      return res.status(500).json({ error: 'Failed to fetch job applicants.' });
    }
  }

  /**
 * GET /api/applications/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Task 13.1: Aggregation query endpoint returning application counts & conversion metrics
 */
static async getStats(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const stats = await ApplicationModel.getStatsByUser(req.user.id, {
      startDate,
      endDate
    });
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Get application stats error:', error);
    return res.status(500).json({ error: 'Failed to compute application analytics.' });
  }
}


 // GET /api/applications/:id/job-details
 // Acceptance Criteria: Allows the applicant to view job posting details even if the posting is closed/archived 
static async getArchivedJobDetails(req, res) {
  try {
    const application = await ApplicationModel.findById(req.params.id);
    if (!application || application.userId !== String(req.user.id)) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const job = await JobPostingModel.findById(application.jobId);

    // Fallback snapshot if the job document was permanently deleted from the DB
    if (!job) {
      return res.status(200).json({
        archived: true,
        job: {
          id: application.jobId,
          title: application.jobTitle || 'Archived Position',
          companyName: application.companyName || 'Unknown Company',
          status: 'Closed / Removed',
          description: 'This job posting has been closed and removed from active listings.'
        },
        application
      });
    }

    return res.status(200).json({
      archived: job.status !== JobPostingModel.STATUS_PUBLISHED,
      job,
      application
    });
  } catch (error) {
    console.error('Get archived job details error:', error);
    return res.status(500).json({ error: 'Failed to load posting details.' });
  }
}
}

module.exports = ApplicationController;
