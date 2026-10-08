import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchJob, createJob, updateJob, publishJob } from '../services/jobService';

// Must match JOB_TYPES / WORK_MODES in Backend/models/jobPostingModel.js
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];

const EMPTY_FORM = {
  title: '',
  description: '',
  department: '',
  location: '',
  jobType: JOB_TYPES[0],
  workMode: WORK_MODES[0],
  requirements: ''
};

/**
 * Create / edit form for a job posting.
 * Used at /recruiter/jobs/new (create) and /recruiter/jobs/:id/edit (edit).
 */
export default function JobPostingForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('draft');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { token, company } = useAuth();
  const navigate = useNavigate();

  // In edit mode, load the existing posting into the form
  useEffect(() => {
    if (!isEditing) return;

    async function loadJob() {
      try {
        const res = await fetchJob(id, token);
        const { title, description, department, location, jobType, workMode, requirements } = res.job;
        setForm({ title, description, department, location, jobType, workMode, requirements });
        setStatus(res.job.status);
      } catch (err) {
        setServerError(err.error || err.message || 'Failed to load job posting.');
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id, isEditing, token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};
    const labels = {
      title: 'Job title',
      description: 'Description',
      department: 'Department',
      location: 'Location',
      requirements: 'Requirements'
    };

    Object.keys(labels).forEach((name) => {
      if (!form[name].trim()) {
        newErrors[name] = `${labels[name]} is required.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save the form. If publish is true, the posting goes live in the job listings.
   */
  const handleSave = async (publish) => {
    setServerError('');
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isEditing) {
        await updateJob(id, form, token);
        if (publish && status !== 'published') {
          await publishJob(id, token);
        }
      } else {
        await createJob({ ...form, publish }, token);
      }
      navigate('/recruiter/jobs');
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      setServerError(err.message || err.error || 'Failed to save job posting.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(true);
  };

  if (loading) return <p>Loading job posting...</p>;

  const isPublished = status === 'published';

  return (
    <div>
      <h2>{isEditing ? 'Edit Job Posting' : 'Create Job Posting'}</h2>
      {/* Jobs are always posted under the recruiter's own company */}
      <p>Posting for: <Link to={`/companies/${company.id}`}><strong>{company.name}</strong></Link></p>
      {isEditing && <p>Status: <strong>{isPublished ? 'Published' : 'Draft'}</strong></p>}

      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="title">Job Title:</label><br />
          <input id="title" name="title" type="text" value={form.title} onChange={handleChange} />
          {errors.title && <p style={{ color: 'red' }}>{errors.title}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="description">Description:</label><br />
          <textarea id="description" name="description" rows={6} cols={60} value={form.description} onChange={handleChange} />
          {errors.description && <p style={{ color: 'red' }}>{errors.description}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="department">Department:</label><br />
          <input id="department" name="department" type="text" value={form.department} onChange={handleChange} />
          {errors.department && <p style={{ color: 'red' }}>{errors.department}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="location">Location:</label><br />
          <input id="location" name="location" type="text" value={form.location} onChange={handleChange} />
          {errors.location && <p style={{ color: 'red' }}>{errors.location}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="jobType">Job Type:</label><br />
          <select id="jobType" name="jobType" value={form.jobType} onChange={handleChange}>
            {JOB_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {errors.jobType && <p style={{ color: 'red' }}>{errors.jobType}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="workMode">Work Mode:</label><br />
          <select id="workMode" name="workMode" value={form.workMode} onChange={handleChange}>
            {WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          {errors.workMode && <p style={{ color: 'red' }}>{errors.workMode}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="requirements">Requirements:</label><br />
          <textarea id="requirements" name="requirements" rows={4} cols={60} value={form.requirements} onChange={handleChange} />
          {errors.requirements && <p style={{ color: 'red' }}>{errors.requirements}</p>}
        </div>
        <br />

        {isPublished ? (
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {' '}
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Publish'}
            </button>
          </>
        )}
        {' '}
        <Link to="/recruiter/jobs">Cancel</Link>
      </form>
    </div>
  );
}
