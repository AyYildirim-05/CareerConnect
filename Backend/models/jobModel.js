const db = require('../config/db');

/**
 * JobModel
 * Represents a job posting created by an employer. Tracks posting details,
 * status (Draft / Open / Closed) and the job seekers who applied.
 */
class JobModel {
  static COLLECTION = 'jobs';

  static STATUS = {
    DRAFT: 'Draft',
    OPEN: 'Open',
    CLOSED: 'Closed'
  };

  static JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];

  /**
   * Get the Firestore instance or throw if unavailable
   * @returns {Object}
   */
  static getCollection() {
    const firestore = db.getFirestore();
    if (!firestore) {
      throw new Error('Database is not available.');
    }
    return firestore.collection(this.COLLECTION);
  }

  /**
   * Convert a Firestore doc into a plain job object
   * @param {Object} doc
   * @returns {Object}
   */
  static fromDoc(doc) {
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Create a new job posting
   * @param {Object} params
   * @param {string} params.employerId - ID of the employer posting the job
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} [params.company]
   * @param {string} [params.location]
   * @param {string} [params.jobType] - One of JOB_TYPES
   * @param {boolean} [params.remote]
   * @param {Object} [params.salary] - { min, max, currency }
   * @param {Array<string>} [params.skills]
   * @param {Array<string>} [params.requirements]
   * @param {string} [params.status] - Defaults to Open
   * @returns {Promise<Object>} Created job record
   */
  static async create({
    employerId,
    title,
    description,
    company = '',
    location = '',
    jobType = 'Full-time',
    remote = false,
    salary = {},
    skills = [],
    requirements = [],
    status = this.STATUS.OPEN
  }) {
    if (!employerId || !title || !description) {
      throw new Error('employerId, title and description are required.');
    }
    if (!this.JOB_TYPES.includes(jobType)) {
      throw new Error(`Invalid job type. Must be one of: ${this.JOB_TYPES.join(', ')}`);
    }
    if (!Object.values(this.STATUS).includes(status)) {
      throw new Error('Invalid job status.');
    }

    const now = new Date().toISOString();
    const job = {
      employerId,
      title: title.trim(),
      description: description.trim(),
      company,
      location,
      jobType,
      remote: Boolean(remote),
      salary: {
        min: salary.min != null ? Number(salary.min) : null,
        max: salary.max != null ? Number(salary.max) : null,
        currency: salary.currency || 'CAD'
      },
      skills: Array.isArray(skills) ? skills : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      status,
      applicants: [],
      createdAt: now,
      updatedAt: now
    };

    const ref = await this.getCollection().add(job);
    return { id: ref.id, ...job };
  }

  /**
   * Find a job by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const doc = await this.getCollection().doc(id).get();
    return doc.exists ? this.fromDoc(doc) : null;
  }

  /**
   * Find jobs, optionally filtered. Defaults to Open jobs only.
   * @param {Object} [filters]
   * @param {string} [filters.status]
   * @param {string} [filters.jobType]
   * @param {string} [filters.location]
   * @param {boolean} [filters.remote]
   * @param {string} [filters.keyword] - Matches title, company, description or skills
   * @param {Array<string>} [filters.skills] - Job must include at least one
   * @returns {Promise<Array<Object>>}
   */
  static async findAll(filters = {}) {
    const status = filters.status || this.STATUS.OPEN;
    const snapshot = await this.getCollection().where('status', '==', status).get();

    let jobs = snapshot.docs.map(doc => this.fromDoc(doc));

    // Filtered in memory to avoid needing composite Firestore indexes
    if (filters.jobType) {
      jobs = jobs.filter(job => job.jobType === filters.jobType);
    }
    if (typeof filters.remote === 'boolean') {
      jobs = jobs.filter(job => job.remote === filters.remote);
    }
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      jobs = jobs.filter(job => (job.location || '').toLowerCase().includes(loc));
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      jobs = jobs.filter(job =>
        [job.title, job.company, job.description, ...(job.skills || [])]
          .some(field => (field || '').toLowerCase().includes(kw))
      );
    }
    if (Array.isArray(filters.skills) && filters.skills.length > 0) {
      const wanted = filters.skills.map(s => s.toLowerCase());
      jobs = jobs.filter(job =>
        (job.skills || []).some(s => wanted.includes(s.toLowerCase()))
      );
    }

    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Find all jobs posted by a specific employer (any status)
   * @param {string} employerId
   * @returns {Promise<Array<Object>>}
   */
  static async findByEmployer(employerId) {
    const snapshot = await this.getCollection()
      .where('employerId', '==', employerId)
      .get();

    return snapshot.docs
      .map(doc => this.fromDoc(doc))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Update job fields (title, description, salary, etc.)
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>} Updated job
   */
  static async update(id, updates) {
    const job = await this.findById(id);
    if (!job) {
      throw new Error('Job not found.');
    }

    // Protect fields that should never be changed through a general update
    const { id: _id, employerId, applicants, createdAt, ...allowed } = updates;

    if (allowed.jobType && !this.JOB_TYPES.includes(allowed.jobType)) {
      throw new Error(`Invalid job type. Must be one of: ${this.JOB_TYPES.join(', ')}`);
    }
    if (allowed.status && !Object.values(this.STATUS).includes(allowed.status)) {
      throw new Error('Invalid job status.');
    }
    if (allowed.salary) {
      allowed.salary = { ...job.salary, ...allowed.salary };
    }

    const changes = { ...allowed, updatedAt: new Date().toISOString() };
    await this.getCollection().doc(id).update(changes);
    return { ...job, ...changes };
  }

  /**
   * Update a job's status (Draft, Open, Closed)
   * @param {string} id
   * @param {string} status
   * @returns {Promise<Object>}
   */
  static async setStatus(id, status) {
    return this.update(id, { status });
  }

  /**
   * Close a job so it no longer accepts applications
   * @param {string} id
   * @returns {Promise<Object>}
   */
  static async close(id) {
    return this.setStatus(id, this.STATUS.CLOSED);
  }

  /**
   * Record an application from a job seeker
   * @param {string} id - Job ID
   * @param {string} jobSeekerId
   * @returns {Promise<Object>} Updated job
   */
  static async addApplicant(id, jobSeekerId) {
    const job = await this.findById(id);
    if (!job) {
      throw new Error('Job not found.');
    }
    if (job.status !== this.STATUS.OPEN) {
      throw new Error('This job is not accepting applications.');
    }
    if (job.applicants.some(a => a.jobSeekerId === jobSeekerId)) {
      throw new Error('You have already applied to this job.');
    }

    const applicants = [
      ...job.applicants,
      {
        jobSeekerId,
        status: 'Submitted',
        appliedAt: new Date().toISOString()
      }
    ];

    const updatedAt = new Date().toISOString();
    await this.getCollection().doc(id).update({ applicants, updatedAt });
    return { ...job, applicants, updatedAt };
  }

  /**
   * Update the status of one applicant
   * @param {string} id - Job ID
   * @param {string} jobSeekerId
   * @param {string} status
   * @returns {Promise<Object>} Updated job
   */
  static async updateApplicantStatus(id, jobSeekerId, status) {
    const job = await this.findById(id);
    if (!job) {
      throw new Error('Job not found.');
    }

    const index = job.applicants.findIndex(a => a.jobSeekerId === jobSeekerId);
    if (index === -1) {
      throw new Error('Applicant not found for this job.');
    }

    const applicants = [...job.applicants];
    applicants[index] = { ...applicants[index], status };

    const updatedAt = new Date().toISOString();
    await this.getCollection().doc(id).update({ applicants, updatedAt });
    return { ...job, applicants, updatedAt };
  }

  /**
   * Delete a job
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const job = await this.findById(id);
    if (!job) {
      throw new Error('Job not found.');
    }
    await this.getCollection().doc(id).delete();
    return true;
  }
}

module.exports = JobModel;