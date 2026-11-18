
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublishedJobs, fetchSavedJobs } from '../services/jobService';
import { fetchMyApplications } from '../services/applicationService';
import JobCard from './JobCard';
import BookmarkButton from './BookmarkButton';
import ApplyButton from './ApplyButton';
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

export default function JobListings() {
  const { token, user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [allLocations, setAllLocations] = useState(DEFAULT_LOCATIONS);
  const [savedIds, setSavedIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');

  const debouncedKeyword = useDebounce(keyword, 350);

  // Load applications for Job Seekers
  useEffect(() => {
    async function loadApplications() {
      if (!token || user?.role !== 'Job Seeker') return;

      try {
        const res = await fetchMyApplications(token);

        setAppliedIds(
          new Set(
            (res.applications || []).map(application => application.jobId)
          )
        );
      } catch (err) {
        console.error('Failed to load applications:', err);
      }
    }

    loadApplications();
  }, [token, user?.role]);

  // Load saved jobs
  useEffect(() => {
    async function loadSavedJobs() {
      if (!token) return;

      try {
        const saved = await fetchSavedJobs(token);

        setSavedIds(
          new Set(
            (saved.jobs || []).map(job => job.id)
          )
        );
      } catch (err) {
        console.error('Failed to load saved jobs:', err);
      }
    }

    loadSavedJobs();
  }, [token]);

  // Fetch jobs when filters change
  const loadJobs = useCallback(async (isInitial = false) => {
    if (!token) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setFilterLoading(true);
    }

    try {
      const res = await fetchPublishedJobs(token, {
        keyword: debouncedKeyword,
        location,
        type: jobType,
        workMode
      });

      const fetchedJobs = res.jobs || [];

      setJobs(fetchedJobs);
      setError('');

      if (fetchedJobs.length > 0) {
        setAllLocations(prev => {
          const discovered = fetchedJobs
            .map(job => job.location)
            .filter(Boolean);

          return Array.from(
            new Set([...prev, ...discovered])
          ).sort();
        });
      }
    } catch (err) {
      setError(
        err.error ||
        err.message ||
        'Failed to load job listings.'
      );
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setFilterLoading(false);
      }
    }
  }, [token, debouncedKeyword, location, jobType, workMode]);

 useEffect(() => {
  loadJobs(true);
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
    <main className="cc-page cc-jobs-page">
      <header className="cc-jobs-header">
        <h1 className="cc-page-title">
          Explore Job Opportunities
        </h1>

        <p className="cc-muted">
          Search by keywords and filter by location or employment
          type to find your next career move.
        </p>
      </header>

      {/* Search and filter section */}
      <section
        className="cc-jobs-filters cc-section"
        aria-label="Search and filter jobs"
      >
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
      </section>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="cc-alert cc-alert-error"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div
          className="cc-jobs-state"
          role="status"
        >
          <p>Loading job listings...</p>
        </div>
      ) : jobs.length === 0 ? (
        /* Empty state */
        <section className="cc-jobs-empty">
          <h2>
            {hasActiveFilters
              ? 'No jobs match your search criteria.'
              : 'No open roles right now. Check back soon!'}
          </h2>

          {hasActiveFilters && (
            <>
              <p>
                Try adjusting your keywords, selecting a different
                location, or resetting the filters.
              </p>

              <button
                type="button"
                onClick={handleResetFilters}
                className="cc-button cc-button-primary"
              >
                Reset All Filters
              </button>
            </>
          )}
        </section>
      ) : (
        /* Job listings */
        <section
          className="cc-jobs-list"
          aria-label="Available job opportunities"
          aria-busy={filterLoading}
        >
          {jobs.map(job => (
            <div
              key={job.id}
              className="cc-job-item"
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Apply and Save actions */}
              <div
                className="cc-job-actions"
                style={{
                  position: 'static',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fff',
                  border: '1px solid #cbd5e1',
                  borderBottom: 'none',
                  borderRadius: '10px 10px 0 0',
                  boxSizing: 'border-box',
                  width: '100%',
                  maxWidth: '100%'
                }}
              >
                <ApplyButton
                  jobId={job.id}
                  initiallyApplied={appliedIds.has(job.id)}
                  onApplied={id => {
                    setAppliedIds(prev => {
                      const updated = new Set(prev);
                      updated.add(id);
                      return updated;
                    });
                  }}
                />

                <BookmarkButton
                  jobId={job.id}
                  initiallySaved={savedIds.has(job.id)}
                />
              </div>

              {/* Job details and AI Match */}
              <JobCard job={job} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
