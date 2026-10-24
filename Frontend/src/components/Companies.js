import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCompanies } from '../services/companyService';

/**
 * Directory of every company page, sorted by name.
 * Visible to all logged-in users.
 */
export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetchCompanies(token);
        setCompanies(res.companies);
      } catch (err) {
        setError(err.error || err.message || 'Failed to load companies.');
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, [token]);

  if (loading) return <p>Loading companies...</p>;

  return (
    <div>
      <h2>Companies</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!error && companies.length === 0 && <p>No companies yet.</p>}

      {companies.map((company) => (
        <div key={company.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>
            <Link to={`/companies/${company.id}`}>{company.name}</Link>
          </h3>
          <p style={{ margin: '0.25rem 0' }}>
            {[company.industry, company.location].filter(Boolean).join(' · ')}
          </p>
        </div>
      ))}
    </div>
  );
}
