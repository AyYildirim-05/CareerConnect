
import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../services/profileService';

const emptyProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  headline: '',
  bio: ''
};

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

        // Supports common response formats:
        // { profile: {...} } or a direct profile object.
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
    return <p>Loading your profile...</p>;
  }

  return (
    <div style={{
      maxWidth: '650px',
      margin: '40px auto',
      padding: '24px'
    }}>
      <h1>My Profile</h1>
      <p>Manage your Job Seeker information.</p>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: 'green' }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {[
          ['firstName', 'First Name'],
          ['lastName', 'Last Name'],
          ['phone', 'Phone Number'],
          ['headline', 'Professional Headline']
        ].map(([name, label]) => (
          <div key={name} style={{ marginBottom: '18px' }}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              value={profile[name]}
              onChange={handleChange}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                marginTop: '6px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="bio">About Me</label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows={5}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginTop: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
