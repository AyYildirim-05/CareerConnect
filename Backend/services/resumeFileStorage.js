
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resumes');

async function savePdf(userId, buffer) {
  if (!userId || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid user or PDF data.');
  }

  if (
    buffer.length > 5 * 1024 * 1024 ||
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString() !== '%PDF-'
  ) {
    throw new Error('Invalid PDF or file exceeds 5 MB.');
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${crypto.randomUUID()}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filePath, buffer, { flag: 'wx' });

  return {
    filename,
    originalSize: buffer.length
  };
}

async function getPdf(filename) {
  if (!/^[a-f0-9-]{36}\.pdf$/i.test(filename || '')) {
    throw new Error('Invalid PDF filename.');
  }

  return fs.readFile(path.join(UPLOAD_DIR, filename));
}

async function deletePdf(filename) {
  if (!/^[a-f0-9-]{36}\.pdf$/i.test(filename || '')) {
    throw new Error('Invalid PDF filename.');
  }

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  savePdf,
  getPdf,
  deletePdf
};
