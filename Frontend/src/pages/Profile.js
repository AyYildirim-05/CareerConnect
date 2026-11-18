
import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../services/profileService';
import ResumeProfileEditor from '../components/ResumeProfileEditor';
import ProfileResumeManager from '../components/ProfileResumeManager';

const emptyProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  headline: '',
  bio: ''
};

const profileFields = [
  ['firstName', 'First Name'],
  ['lastName', 'Last Name'],
  ['phone', 'Phone Number'],
  ['headline', 'Professional Headline']
];

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await getProfile();
        const data = result.profile || result.data || result;

        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          headline: data.headline || '',
          bio: data.bio || ''
        });
      } catch (err) {
        setError(err.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateProfile(profile);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="cc-page">
        <p role="status">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="cc-page cc-profile-page">
      <header className="cc-profile-header">
        <h1 className="cc-page-title">My Profile</h1>
        <p className="cc-muted">
          Manage your Job Seeker information and resume.
        </p>
      </header>

      <section
        className="cc-card cc-section"
        aria-labelledby="personal-profile-heading"
      >
        <h2
          id="personal-profile-heading"
          className="cc-card-title"
        >
          Personal Profile
        </h2>

        <p className="cc-muted cc-profile-description">
          Update your contact information and professional details.
        </p>

        {error && (
          <p role="alert" className="cc-alert cc-alert-error">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="cc-alert cc-alert-success">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="cc-profile-grid">
            {profileFields.map(([name, label]) => (
              <div className="cc-form-group" key={name}>
                <label className="cc-label" htmlFor={name}>
                  {label}
                </label>

                <input
                  className="cc-input"
                  id={name}
                  name={name}
                  type={name === 'phone' ? 'tel' : 'text'}
                  autoComplete={
                    name === 'firstName'
                      ? 'given-name'
                      : name === 'lastName'
                      ? 'family-name'
                      : name === 'phone'
                      ? 'tel'
                      : 'off'
                  }
                  value={profile[name]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <div className="cc-form-group">
            <label className="cc-label" htmlFor="bio">
              About Me
            </label>

            <textarea
              className="cc-textarea"
              id="bio"
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              rows={5}
            />
          </div>

          <div className="cc-profile-actions">
            <button
              type="submit"
              className="cc-button cc-button-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      <section
        className="cc-card cc-section"
        aria-label="PDF Resume Management"
      >
        <ProfileResumeManager />
      </section>

      <section
        className="cc-card cc-section"
        aria-label="Resume Information Editor"
      >
        <ResumeProfileEditor />
      </section>
    </main>
  );
}
