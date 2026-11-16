
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profile-resumes');

function getUserId(req) {
  return req.user?.id;
}

function getPdfPath(userId) {
  // Hash user ID so it cannot be used as a filesystem path.
  const safeId = crypto.createHash('sha256')
    .update(String(userId))
    .digest('hex');

  return path.join(UPLOAD_DIR, `${safeId}.pdf`);
}

const uploadProfileResume = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a PDF file.' });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filePath = getPdfPath(userId);

    // Save the original PDF without changing resume JSON.
    await fs.writeFile(filePath, req.file.buffer);

    return res.status(200).json({
      success: true,
      message: 'Resume PDF uploaded successfully.',
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Profile PDF upload error:', error);
    return res.status(500).json({ message: 'Failed to upload PDF.' });
  }
};

const previewProfileResume = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filePath = getPdfPath(userId);

    await fs.access(filePath);

    return res.sendFile(filePath, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'No PDF resume found.' });
    }

    console.error('Profile PDF preview error:', error);
    return res.status(500).json({ message: 'Failed to preview PDF.' });
  }
};

const deleteProfileResume = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filePath = getPdfPath(userId);

    await fs.unlink(filePath);

    return res.status(200).json({
      success: true,
      message: 'Resume PDF deleted successfully.'
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'No PDF resume found.' });
    }

    console.error('Profile PDF delete error:', error);
    return res.status(500).json({ message: 'Failed to delete PDF.' });
  }
};

module.exports = {
  uploadProfileResume,
  previewProfileResume,
  deleteProfileResume
};
