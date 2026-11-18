
import React, { useEffect, useState } from 'react';
import {
  getResumeProfile,
  updateResumeProfile
} from '../services/profileService';

const personalFields = [
  'fullName', 'firstName', 'lastName', 'email',
  'phone', 'location', 'linkedin', 'github',
  'portfolio', 'summary'
];

const templates = {
  workExperience: {
    title: '', company: '', location: '',
    dates: '', bullets: []
  },
  education: {
    institution: '', degree: '', fieldOfStudy: '',
    dates: '', gpa: '', details: []
  },
  projects: {
    name: '', techStack: [], link: '',
    description: '', bullets: []
  },
  extracurriculars: {
    title: '', organization: '', dates: '',
    description: ''
  },
  volunteerExperience: {
    role: '', organization: '', dates: '',
    description: ''
  },
  certifications: {
    name: '', issuer: '', date: ''
  }
};

const sectionLabels = {
  workExperience: 'Work Experience',
  education: 'Education',
  projects: 'Projects',
  extracurriculars: 'Extracurricular Activities',
  volunteerExperience: 'Volunteer Experience',
  certifications: 'Certifications'
};

const emptyResume = {
  personalInfo: {},
  skills: {
    all: [],
    categories: {
      languages: [],
      frameworksAndTools: [],
      technical: [],
      softSkills: []
    }
  },
  workExperience: [],
  education: [],
  projects: [],
  extracurriculars: [],
  volunteerExperience: [],
  certifications: [],
  additional: {
    languages: [],
    interests: [],
    detectedSectionNames: []
  },
  metadata: {}
};

const formatLabel = key =>
  key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase());

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box',
  font: 'inherit',
  minWidth: 0,
  maxWidth: '100%',
  backgroundColor: '#fff',
  color: '#0f172a'
};

const cardStyle = {
  padding: 'clamp(14px, 3vw, 20px)',
  minWidth: 0,
  overflowWrap: 'anywhere',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  marginBottom: 16,
  background: '#fff'
};

const actionButtonStyle = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  maxWidth: '100%',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere'
};

const removeButtonStyle = {
  ...actionButtonStyle,
  borderColor: '#fecaca',
  backgroundColor: '#fff7f7',
  color: '#b91c1c'
};

function Field({ name, value, onChange }) {
  const isArray = Array.isArray(value);
  const isObject = value !== null &&
    typeof value === 'object' && !isArray;

  const displayValue = isArray
    ? value.map(item =>
        typeof item === 'string'
          ? item
          : JSON.stringify(item)
      ).join('\n')
    : isObject
      ? JSON.stringify(value, null, 2)
      : value == null
        ? ''
        : String(value);

  const multiline = isArray || isObject ||
    ['summary', 'description', 'details', 'bullets']
      .includes(name);

  function handleChange(text) {
    if (isArray) {
      onChange(text.split('\n').map(x => x.trim()).filter(Boolean));
    } else if (isObject) {
      try {
        onChange(JSON.parse(text));
      } catch {
        // Invalid JSON is not saved.
      }
    } else if (typeof value === 'number') {
      onChange(text === '' ? '' : Number(text));
    } else {
      onChange(text);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontWeight: 600,
          marginBottom: 6
        }}
      >
        {formatLabel(name)}
      </label>

      {multiline ? (
        <textarea
          style={{ ...inputStyle, minHeight: 85 }}
          value={displayValue}
          onChange={e => handleChange(e.target.value)}
        />
      ) : (
        <input
          style={inputStyle}
          value={displayValue}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {isArray && (
        <small style={{ color: '#64748b' }}>
          Enter one item per line.
        </small>
      )}
    </div>
  );
}

export default function ResumeProfileEditor() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getResumeProfile();
        setResume(data || emptyResume);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function updateObject(group, field, value) {
    setResume(prev => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [field]: value
      }
    }));
    setMessage('');
  }

  function updateSkills(field, value, category = false) {
    setResume(prev => ({
      ...prev,
      skills: category
        ? {
            ...(prev.skills || {}),
            categories: {
              ...(prev.skills?.categories || {}),
              [field]: value
            }
          }
        : {
            ...(prev.skills || {}),
            [field]: value
          }
    }));
    setMessage('');
  }

  function updateItem(section, index, field, value) {
    setResume(prev => ({
      ...prev,
      [section]: (prev[section] || []).map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    }));
    setMessage('');
  }

  function addItem(section) {
    setResume(prev => ({
      ...prev,
      [section]: [
        ...(prev[section] || []),
        { ...templates[section] }
      ]
    }));
    setMessage('');
  }

  function removeItem(section, index) {
    setResume(prev => ({
      ...prev,
      [section]: (prev[section] || [])
        .filter((_, i) => i !== index)
    }));
    setMessage('');
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateResumeProfile(resume);
      setMessage('Resume profile saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading resume information...</p>;
  }

  if (!resume) {
    return (
      <div>
        <p role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </p>
        <p>Please upload and parse your resume first.</p>
      </div>
    );
  }

  const info = resume.personalInfo || {};
  const personalKeys = [
    ...new Set([
      ...personalFields,
      ...Object.keys(info)
    ])
  ];

  const skills = resume.skills || {};
  const categories = skills.categories || {};

  const skillCategoryKeys = [
    ...new Set([
      'languages',
      'frameworksAndTools',
      'technical',
      'softSkills',
      ...Object.keys(categories)
    ])
  ];

  const additional = resume.additional || {};

  return (
    <section style={{
      width: '100%',
      maxWidth: 950,
      minWidth: 0,
      boxSizing: 'border-box',
      margin: '24px auto',
      padding: 'clamp(0px, 2vw, 20px)',
      color: '#1e293b',
      overflowWrap: 'anywhere'
    }}>
      <h2>Resume Information</h2>
      <p>
        Review and edit the information extracted
        from your resume.
      </p>

      {error && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: '#15803d' }}>
          {message}
        </p>
      )}

      <div style={cardStyle}>
        <h3>Personal Information</h3>

        {personalKeys.map(field => (
          <Field
            key={field}
            name={field}
            value={info[field] ?? ''}
            onChange={value =>
              updateObject('personalInfo', field, value)
            }
          />
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Skills</h3>

        <Field
          name="all"
          value={skills.all || []}
          onChange={value =>
            updateSkills('all', value)
          }
        />

        {skillCategoryKeys.map(key => (
          <Field
            key={key}
            name={key}
            value={categories[key] || []}
            onChange={value =>
              updateSkills(key, value, true)
            }
          />
        ))}

        {Object.keys(skills)
          .filter(key =>
            key !== 'all' && key !== 'categories'
          )
          .map(key => (
            <Field
              key={key}
              name={key}
              value={skills[key]}
              onChange={value =>
                updateSkills(key, value)
              }
            />
          ))}
      </div>

      {Object.keys(templates).map(section => {
        const items = resume[section] || [];

        return (
          <div key={section} style={cardStyle}>
            <h3>{sectionLabels[section]}</h3>

            {items.map((item, index) => {
              const fields = [
                ...new Set([
                  ...Object.keys(templates[section]),
                  ...Object.keys(item || {})
                ])
              ];

              return (
                <div
                  key={index}
                  style={{
                    padding: 'clamp(10px, 3vw, 16px)',
                    minWidth: 0,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    marginBottom: 14
                  }}
                >
                  <h4>
                    {sectionLabels[section]} #{index + 1}
                  </h4>

                  {fields.map(field => (
                    <Field
                      key={field}
                      name={field}
                      value={
                        item?.[field] ??
                        templates[section][field] ??
                        ''
                      }
                      onChange={value =>
                        updateItem(
                          section,
                          index,
                          field,
                          value
                        )
                      }
                    />
                  ))}

                  <button
                    type="button"
                    style={removeButtonStyle}
                    onClick={() =>
                      removeItem(section, index)
                    }
                  >
                    Remove Entry
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => addItem(section)}
              style={actionButtonStyle}
            >
              + Add {sectionLabels[section]}
            </button>
          </div>
        );
      })}

      <div style={cardStyle}>
        <h3>Additional Information</h3>

        {[
          ...new Set([
            'languages',
            'interests',
            ...Object.keys(additional)
              .filter(k => k !== 'detectedSectionNames')
          ])
        ].map(field => (
          <Field
            key={field}
            name={field}
            value={additional[field] ?? []}
            onChange={value =>
              updateObject('additional', field, value)
            }
          />
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Resume Metadata</h3>
        <p style={{ color: '#64748b' }}>
          Automatically generated information.
        </p>

        {Object.entries(resume.metadata || {})
          .map(([key, value]) => (
            <p key={key}>
              <strong>{formatLabel(key)}:</strong>{' '}
              {String(value ?? '')}
            </p>
          ))}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={save}
        style={{
          padding: '12px 24px',
          width: '100%',
          maxWidth: 360,
          minHeight: 44,
          font: 'inherit',
          background: '#2563eb',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1
        }}
      >
        {saving
          ? 'Saving...'
          : 'Save Resume Information'}
      </button>
    </section>
  );
}
