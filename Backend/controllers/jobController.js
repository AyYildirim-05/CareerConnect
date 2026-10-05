const { JobPostingModel, RecruiterModel } = require('../models');

const REQUIRED_FIELDS = ['title', 'description', 'department', 'location', 'jobType', 'workMode', 'requirements'];

/**
 * Validate job posting form fields and return trimmed values
 * @param {Object} body - req.body
 * @returns {{ fields: Object, errors: Object }}
 */
function validateJobFields(body) {
  const fields = {};
  const errors = {};

  REQUIRED_FIELDS.forEach((name) => {
    const value = typeof body[name] === 'string' ? body[name].trim() : '';
    if (!value) {
      errors[name] = `${name} is required.`;
    }
    fields[name] = value;
  });

  if (fields.jobType && !JobPostingModel.JOB_TYPES.includes(fields.jobType)) {
    errors.jobType = `Job type must be one of: ${JobPostingModel.JOB_TYPES.join(', ')}.`;
  }

  if (fields.workMode && !JobPostingModel.WORK_MODES.includes(fields.workMode)) {
    errors.workMode = `Work mode must be one of: ${JobPostingModel.WORK_MODES.join(', ')}.`;
  }

  return { fields, errors };
}

/**
 * Load a posting and confirm the logged-in recruiter owns it.
 * Sends the error response itself and returns null if not allowed.
 */
async function findOwnedJob(req, res) {
  const job = await JobPostingModel.findById(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job posting not found.' });
    return null;
  }
  if (job.recruiterId !== String(req.user.id)) {
    res.status(403).json({ error: 'Forbidden: You can only manage your own job postings.' });
    return null;
  }
  return job;
}

class JobController {
  /**
   * POST /api/jobs
   * Create a job posting (draft by default, or published if body.publish is true)
   */
  static async create(req, res) {
    try {
      const { fields, errors } = validateJobFields(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }

      const recruiter = await RecruiterModel.findById(req.user.id);
      if (!recruiter) {
        return res.status(404).json({ error: 'Recruiter not found.' });
      }

      const job = await JobPostingModel.create({
        recruiterId: recruiter.id,
        companyName: recruiter.recruiterProfile && recruiter.recruiterProfile.companyName,
        fields,
        publish: req.body.publish === true
      });

      await RecruiterModel.addJobPosting(recruiter.id, job.id);

      return res.status(201).json({
        message: job.status === JobPostingModel.STATUS_PUBLISHED
          ? 'Job posting published!'
          : 'Job posting saved as draft.',
        job
      });
    } catch (error) {
      console.error('Create job posting error:', error);
      return res.status(500).json({ message: 'Failed to create job posting.' });
    }
  }

  /**
   * PUT /api/jobs/:id
   * Edit a job posting owned by the logged-in recruiter
   */
  static async update(req, res) {
    try {
      const job = await findOwnedJob(req, res);
      if (!job) return;

      const { fields, errors } = validateJobFields(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }

      const updatedJob = await JobPostingModel.update(job.id, fields);
      return res.status(200).json({ message: 'Job posting updated.', job: updatedJob });
    } catch (error) {
      console.error('Update job posting error:', error);
      return res.status(500).json({ message: 'Failed to update job posting.' });
    }
  }

  /**
   * PATCH /api/jobs/:id/publish
   * Publish a draft so it appears in the active job listings
   */
  static async publish(req, res) {
    try {
      const job = await findOwnedJob(req, res);
      if (!job) return;

      if (job.status === JobPostingModel.STATUS_PUBLISHED) {
        return res.status(200).json({ message: 'Job posting is already published.', job });
      }

      const publishedJob = await JobPostingModel.publish(job.id);
      return res.status(200).json({ message: 'Job posting published!', job: publishedJob });
    } catch (error) {
      console.error('Publish job posting error:', error);
      return res.status(500).json({ message: 'Failed to publish job posting.' });
    }
  }

  /**
   * GET /api/jobs
   * Active job listings (published postings only)
   */
  static async listPublished(req, res) {
    try {
      const jobs = await JobPostingModel.findPublished();
      return res.status(200).json({ jobs });
    } catch (error) {
      console.error('List job postings error:', error);
      return res.status(500).json({ error: 'Failed to fetch job listings.' });
    }
  }

  /**
   * GET /api/jobs/mine
   * All postings (drafts included) owned by the logged-in recruiter
   */
  static async listMine(req, res) {
    try {
      const jobs = await JobPostingModel.findByRecruiter(req.user.id);
      return res.status(200).json({ jobs });
    } catch (error) {
      console.error('List recruiter job postings error:', error);
      return res.status(500).json({ error: 'Failed to fetch your job postings.' });
    }
  }

  /**
   * GET /api/jobs/:id
   * A single posting. Drafts are only visible to their owner.
   */
  static async getById(req, res) {
    try {
      const job = await JobPostingModel.findById(req.params.id);
      const isOwner = job && job.recruiterId === String(req.user.id);

      if (!job || (job.status !== JobPostingModel.STATUS_PUBLISHED && !isOwner)) {
        return res.status(404).json({ error: 'Job posting not found.' });
      }
      return res.status(200).json({ job });
    } catch (error) {
      console.error('Get job posting error:', error);
      return res.status(500).json({ error: 'Failed to fetch job posting.' });
    }
  }
}

module.exports = JobController;
