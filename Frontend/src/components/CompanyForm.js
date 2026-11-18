import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCompany, updateMyCompany, joinCompany, fetchCompanies, uploadCompanyImage, removeCompanyImage } from '../services/companyService';
import ImageCropper from './ImageCropper';

// Banner crop box is 600x150 on screen, uploaded as a 1200x300 JPEG (well under the 300 KB banner limit)
const BANNER_CROP = { width: 600, height: 150, outScale: 2, type: 'image/jpeg', name: 'banner', hint: 'Drag to position your banner and zoom to crop it.' };

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
  const { token, user, company, setCompany } = useAuth();
  const isEditing = Boolean(company);

  // 'choose' shown only to new recruiters; 'create' and 'join' are the two paths
  const [mode, setMode] = useState(isEditing ? 'create' : 'choose');
  const [companies, setCompanies] = useState([]);
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [form, setForm] = useState(() => {
    if (!company) return EMPTY_FORM;
    const { name, description, industry, size, website, location } = company;
    return { name, description, industry, size, website, location };
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageSaving, setImageSaving] = useState(false);
  const [crop, setCrop] = useState(null); // { field: 'logo'|'banner', src: object URL } while cropping
  const [imageField, setImageField] = useState(null); // image last picked/saved, so its cropper and status show next to it

  const navigate = useNavigate();

  const closeCropper = () => {
    URL.revokeObjectURL(crop.src);
    setCrop(null);
  };

  // Every image goes through the cropper so it has a fixed shape and stays under the server's size limit
  const handleImagePick = (field, file) => {
    setImageError('');
    setImageField(field);
    setCrop({ field, src: URL.createObjectURL(file) });
  };

  // Logo and banner are saved on their own, separately from the text fields below
  const handleImage = async (field, file) => {
    if (crop) closeCropper();
    setImageField(field);
    setImageError('');
    setImageSaving(true);
    try {
      const res = file ? await uploadCompanyImage(field, file, token) : await removeCompanyImage(field, token);
      setCompany(res.company);
    } catch (err) {
      setImageError(err.error || err.message || `Failed to update ${field}.`);
    } finally {
      setImageSaving(false);
    }
  };

  useEffect(() => {
    if (mode !== 'join') return;
    fetchCompanies(token)
      .then(res => setCompanies(res.companies || []))
      .catch(() => setJoinError('Failed to load companies.'));
  }, [mode, token]);

  const handleJoin = async (id) => {
    setJoinError('');
    setJoining(true);
    try {
      const res = await joinCompany(id, token);
      setCompany(res.company);
      navigate(`/companies/${res.company.id}`);
    } catch (err) {
      setJoinError(err.error || err.message || 'Failed to join company.');
    } finally {
      setJoining(false);
    }
  };

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

  // Members who joined a company can post jobs under it, but only the owner edits the page
  if (company && company.ownerId !== String(user.id)) {
    return (
      <div>
        <h2>{company.name}</h2>
        <p>You are a member of this company. Only its owner can edit the company page.</p>
        <Link to={`/companies/${company.id}`}>View company page</Link>
      </div>
    );
  }

  
  if (mode === 'choose') {
    return (
      <main className="cc-company-page">
        <section className="cc-company-panel">
          <div className="cc-company-heading">
            <h1>Set Up Your Company</h1>
            <p>
              Every recruiter is associated with a company.
              Create a new company or join an existing one
              to get started.
            </p>
          </div>

          <div className="cc-company-choice-grid">
            <button
              type="button"
              className="cc-company-choice"
              onClick={() => setMode('create')}
            >
              <span className="cc-company-choice-icon">
                +
              </span>
              <strong>Create New Company</strong>
              <span>
                Build a company profile and start posting jobs.
              </span>
              <span className="cc-company-choice-action">
                Create company
              </span>
            </button>

            <button
              type="button"
              className="cc-company-choice"
              onClick={() => setMode('join')}
            >
              <span className="cc-company-choice-icon">
                ↗
              </span>
              <strong>Join Existing Company</strong>
              <span>
                Find your organization and join its team.
              </span>
              <span className="cc-company-choice-action">
                Browse companies
              </span>
            </button>
          </div>
        </section>
      </main>
    );
  }


  
  if (mode === 'join') {
    return (
      <main className="cc-company-page">
        <section className="cc-company-panel">
          <button
            type="button"
            className="cc-company-back"
            onClick={() => setMode('choose')}
          >
            ← Back to company setup
          </button>

          <div className="cc-company-heading">
            <h1>Join a Company</h1>
            <p>
              Choose the company you belong to from
              the list below.
            </p>
          </div>

          {joinError && (
            <div className="cc-company-alert" role="alert">
              {joinError}
            </div>
          )}

          {companies.length === 0 && !joinError && (
            <p className="cc-company-empty">
              No companies found.
            </p>
          )}

          <div className="cc-company-list">
            {companies.map(c => (
              <article
                key={c.id}
                className="cc-company-list-card"
              >
                <div className="cc-company-list-info">
                  <h2>{c.name}</h2>

                  {c.industry && (
                    <p>{c.industry}</p>
                  )}

                  {c.location && (
                    <span className="cc-company-location">
                      {c.location}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="cc-company-primary"
                  onClick={() => handleJoin(c.id)}
                  disabled={joining}
                  aria-label={`Join ${c.name}`}
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }


  const imageStatus = (
    <>
      {crop && (
        <ImageCropper
          {...(crop.field === 'banner' ? BANNER_CROP : {})}
          src={crop.src}
          onCrop={(file) => handleImage(crop.field, file)}
          onCancel={closeCropper}
        />
      )}
      {imageSaving && <span> Saving...</span>}
      {imageError && <p style={{ color: 'red' }}>{imageError}</p>}
    </>
  );

  return (
      <div className="cc-company-page cc-company-form-page">
    <h2>{isEditing ? 'Edit Company Profile' : 'Set Up Your Company Page'}</h2>
     
      {!isEditing && (
        <p>
          <button onClick={() => setMode('choose')}>← Back</button>
        </p>
      )}
      {isEditing ? (
        <p>This is what job seekers see on your company page.</p>
      ) : (
        <p>Every recruiter represents one company. Tell job seekers about yours before posting jobs.</p>
      )}

      {isEditing && (
        <div>
          <label htmlFor="banner">Company Banner (PNG, JPEG or WebP, cropped to 4:1):</label><br />
          {company.banner && (
            <img src={company.banner} alt={`${company.name} banner`} style={{ width: '100%', maxWidth: 600, aspectRatio: '4 / 1', objectFit: 'cover', display: 'block' }} />
          )}
          <input
            id="banner"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={imageSaving || Boolean(crop)}
            onChange={(e) => { if (e.target.files[0]) handleImagePick('banner', e.target.files[0]); e.target.value = ''; }}
          />
          {company.banner && !crop && (
            <button type="button" onClick={() => handleImage('banner', null)} disabled={imageSaving}>Remove Banner</button>
          )}
          {imageField === 'banner' && imageStatus}
          <br /><br />
          <label htmlFor="logo">Company Logo (PNG, JPEG or WebP, cropped to a square):</label><br />
          {company.logo && (
            <img src={company.logo} alt={`${company.name} logo`} style={{ width: 96, height: 96, objectFit: 'contain', display: 'block' }} />
          )}
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={imageSaving || Boolean(crop)}
            onChange={(e) => { if (e.target.files[0]) handleImagePick('logo', e.target.files[0]); e.target.value = ''; }}
          />
          {company.logo && !crop && (
            <button type="button" onClick={() => handleImage('logo', null)} disabled={imageSaving}>Remove Logo</button>
          )}
          {imageField === 'logo' && imageStatus}
          <br />
        </div>
      )}

      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

      <form
  className="cc-company-details-form"
  onSubmit={handleSubmit}
  noValidate
>
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
