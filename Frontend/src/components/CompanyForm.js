import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCompany, updateMyCompany } from '../services/companyService';

// Must match COMPANY_SIZES in Backend/models/companyModel.js
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const EMPTY_FORM = {
  name: '',
  description: '',
  industry: '',
  size: '',
  website: '',
  location: ''
};

/**
 * The recruiter's company profile, at /recruiter/company.
 * New recruiters are sent here to set up their company before anything else;
 * afterwards the same form is used to edit it.
 */
export default function CompanyForm() {
  const { token, company, setCompany } = useAuth();
  const isEditing = Boolean(company);

  const [form, setForm] = useState(() => {
    if (!company) return EMPTY_FORM;
    const { name, description, industry, size, website, location } = company;
    return { name, description, industry, size, website, location };
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Company name is required.';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    if (form.website.trim() && !/^https?:\/\/\S+$/i.test(form.website.trim())) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = isEditing
        ? await updateMyCompany(form, token)
        : await createCompany(form, token);
      setCompany(res.company);
      navigate(`/companies/${res.company.id}`);
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      setServerError(err.message || err.error || 'Failed to save company page.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>{isEditing ? 'Edit Company Profile' : 'Set Up Your Company Page'}</h2>
      {isEditing ? (
        <p>This is what job seekers see on your company page.</p>
      ) : (
        <p>Every recruiter represents one company. Tell job seekers about yours before posting jobs.</p>
      )}

      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Company Name:</label><br />
          <input id="name" name="name" type="text" value={form.name} onChange={handleChange} />
          {errors.name && <p style={{ color: 'red' }}>{errors.name}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="description">About the Company:</label><br />
          <textarea id="description" name="description" rows={6} cols={60} value={form.description} onChange={handleChange} />
          {errors.description && <p style={{ color: 'red' }}>{errors.description}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="industry">Industry:</label><br />
          <input id="industry" name="industry" type="text" placeholder="e.g. Software, Finance" value={form.industry} onChange={handleChange} />
        </div>
        <br />

        <div>
          <label htmlFor="size">Company Size:</label><br />
          <select id="size" name="size" value={form.size} onChange={handleChange}>
            <option value="">Not specified</option>
            {COMPANY_SIZES.map((size) => <option key={size} value={size}>{size} employees</option>)}
          </select>
          {errors.size && <p style={{ color: 'red' }}>{errors.size}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="website">Website:</label><br />
          <input id="website" name="website" type="url" placeholder="https://" value={form.website} onChange={handleChange} />
          {errors.website && <p style={{ color: 'red' }}>{errors.website}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="location">Headquarters:</label><br />
          <input id="location" name="location" type="text" placeholder="e.g. Montreal, QC" value={form.location} onChange={handleChange} />
        </div>
        <br />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Company Page')}
        </button>
        {isEditing && (
          <>
            {' '}
            <Link to={`/companies/${company.id}`}>Cancel</Link>
          </>
        )}
      </form>
    </div>
  );
}
