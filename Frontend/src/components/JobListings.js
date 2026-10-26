import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublishedJobs, fetchSavedJobs } from '../services/jobService';
import JobCard from './JobCard';
import BookmarkButton from './BookmarkButton';
import JobSearchFilter from './JobSearchFilter';
import useDebounce from '../hooks/useDebounce';

const DEFAULT_LOCATIONS = [
  'Montreal, QC',
  'Toronto, ON',
  'Vancouver, BC',
  'Ottawa, ON',
  'Calgary, AB',
  'Remote'
];

/**
 * Active job listings with keyword search and multi-criteria filters
 * (Location, Employment Type, Work Mode) with debounced input.
 * Visible to all logged-in users (Job Seekers and Recruiters).
 */
export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [allLocations, setAllLocations] = useState(DEFAULT_LOCATIONS);
  const [savedIds, setSavedIds] = useState(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  // Search and filter states
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');

  // Debounced keyword (350ms delay) to avoid excessive API requests
  const debouncedKeyword = useDebounce(keyword, 350);

  const { token } = useAuth();

  // Load saved job bookmark IDs once
  useEffect(() => {
    async function loadSavedJobs() {
      if (!token) return;
      try {
        const saved = await fetchSavedJobs(token);
        setSavedIds(new Set(saved.jobs.map((j) => j.id)));
      } catch (err) {
        console.error('Failed to load saved jobs:', err);
      }
    }
    loadSavedJobs();
  }, [token]);

  // Fetch jobs whenever debounced search query or filters change
  const loadJobs = useCallback(async (isInitial = false) => {
    if (!token) return;
    if (isInitial) setLoading(true);
    else setFilterLoading(true);

    try {
      const res = await fetchPublishedJobs(token, {
        keyword: debouncedKeyword,
        location,
        type: jobType,
        workMode
      });
      setJobs(res.jobs || []);
      setError('');

      // Dynamically discover and accumulate locations from loaded jobs
      if (res.jobs && res.jobs.length > 0) {
        setAllLocations((prev) => {
          const discovered = res.jobs.map((j) => j.location).filter(Boolean);
          const combined = Array.from(new Set([...prev, ...discovered])).sort();
          return combined;
        });
      }
    } catch (err) {
      setError(err.error || err.message || 'Failed to load job listings.');
    } finally {
      if (isInitial) setLoading(false);
      else setFilterLoading(false);
    }
  }, [token, debouncedKeyword, location, jobType, workMode]);

  useEffect(() => {
    loadJobs(jobs.length === 0 && loading);
  }, [loadJobs]);

  const handleResetFilters = () => {
    setKeyword('');
    setLocation('');
    setJobType('');
    setWorkMode('');
  };

  const hasActiveFilters = Boolean(
    keyword.trim() || location || jobType || workMode
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#0f172a' }}>
          Explore Job Opportunities
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
          Search by keywords and filter by location or employment type to find your next career move.
        </p>
      </div>

      {/* Multi-Criteria Search & Filter Engine (US-04) */}
      <JobSearchFilter
        keyword={keyword}
        onKeywordChange={setKeyword}
        location={location}
        onLocationChange={setLocation}
        jobType={jobType}
        onJobTypeChange={setJobType}
        workMode={workMode}
        onWorkModeChange={setWorkMode}
        availableLocations={allLocations}
        onReset={handleResetFilters}
        totalResults={jobs.length}
        loading={filterLoading}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>
          Loading job listings...
        </p>
      ) : jobs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#334155', marginBottom: '0.5rem' }}>
            {hasActiveFilters
              ? 'No jobs match your search criteria.'
              : 'No open roles right now. Check back soon!'}
          </p>
          {hasActiveFilters && (
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Try adjusting your keywords, selecting a different location, or resetting the filters.
            </p>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}>
                <BookmarkButton jobId={job.id} initiallySaved={savedIds.has(job.id)} />
              </div>
              <JobCard job={job} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}