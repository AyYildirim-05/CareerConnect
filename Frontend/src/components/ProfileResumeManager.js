
import React, { useEffect, useState } from 'react';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:5500/api';

export default function ProfileResumeManager() {
  const [file, setFile] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const endpoint = `${API_BASE_URL}/profile/resume`;

  function authHeaders() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please log in first.');
    return { Authorization: `Bearer ${token}` };
  }

  async function checkResume() {
    try {
      const response = await fetch(endpoint, {
        headers: authHeaders()
      });

      if (response.status === 404) {
        setHasResume(false);
      } else if (response.ok) {
        setHasResume(true);
      } else {
        throw new Error(`Unable to check resume (${response.status})`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  checkResume();
}, []);

  async function uploadResume() {
    if (!file) {
      setError('Please choose a PDF file.');
      return;
    }

    if (file.type !== 'application/pdf' ||
        !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('PDF must be 5 MB or smaller.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed.');
      }

      setHasResume(true);
      setFile(null);
      setMessage('PDF uploaded successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function previewResume() {
    setError('');

    try {
      const response = await fetch(endpoint, {
        headers: authHeaders()
      });

      if (!response.ok) {
        throw new Error('Unable to preview PDF.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the temporary browser URL later.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteResume() {
    if (!window.confirm('Delete your uploaded PDF?')) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }

      setHasResume(false);
      setMessage('PDF deleted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{
      marginTop: 30,
      padding: 20,
      border: '1px solid #ddd',
      borderRadius: 8
    }}>
      <h2>PDF Resume Management</h2>
      <p>Upload, preview or delete your PDF resume (max 5 MB).</p>

      {loading ? (
        <p>Checking resume...</p>
      ) : (
        <p>
          Status: {hasResume ? 'PDF uploaded' : 'No PDF uploaded'}
        </p>
      )}

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      {message && <p role="status" style={{ color: 'green' }}>{message}</p>}

      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={e => setFile(e.target.files[0] || null)}
        disabled={busy}
      />

      <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={uploadResume}
          disabled={busy || !file}
        >
          {busy ? 'Processing...' : 'Upload PDF'}
        </button>

        <button
          type="button"
          onClick={previewResume}
          disabled={busy || !hasResume}
        >
          Preview PDF
        </button>

        <button
          type="button"
          onClick={deleteResume}
          disabled={busy || !hasResume}
        >
          Delete PDF
        </button>
      </div>
    </section>
  );
}
