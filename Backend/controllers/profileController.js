
const JobSeekerModel = require('../models/jobSeekerModel');

const FIELDS = {
  firstName: 100,
  lastName: 100,
  phone: 30,
  headline: 200,
  bio: 2000
};

async function getProfile(req, res) {
  try {
    const user = await JobSeekerModel.findById(req.user.id);

    if (!user || user.role !== JobSeekerModel.ROLE) {
      return res.status(404).json({ error: 'Job Seeker not found.' });
    }

    return res.status(200).json({
      profile: user.profile || {}
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' ||
        Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    const updates = {};

    for (const [field, maxLength] of Object.entries(FIELDS)) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' ||
            req.body[field].trim().length > maxLength) {
          return res.status(400).json({
            error: `Invalid ${field}. Must be a string up to ${maxLength} characters.`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid profile fields provided.'
      });
    }

    const user = await JobSeekerModel.findById(req.user.id);

    if (!user || user.role !== JobSeekerModel.ROLE) {
      return res.status(404).json({ error: 'Job Seeker not found.' });
    }

    const updated = await JobSeekerModel.updateProfile(
      req.user.id,
      updates
    );

    return res.status(200).json({
      message: 'Profile updated successfully.',
      profile: updated.profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

module.exports = { getProfile, updateProfile };
