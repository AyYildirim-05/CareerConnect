import React from 'react';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];

/**
 * JobSearchFilter Component
 * Provides a debounced keyword search bar and multi-criteria dropdown filters
 * (Location, Employment Type, Work Mode) with quick reset actions.
 */
export default function JobSearchFilter({
  keyword,
  onKeywordChange,
  location,
  onLocationChange,
  jobType,
  onJobTypeChange,
  workMode,
  onWorkModeChange,
  availableLocations = [],
  onReset,
  totalResults = 0,
  loading = false
}) {
  const hasActiveFilters = Boolean(
    keyword.trim() || location || jobType || workMode
  );

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      {/* Search Bar Row */}
      <div style={{ marginBottom: '1rem', position: 'relative' }}>
        <label
          htmlFor="job-search-input"
          style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '0.4rem',
            color: '#1e293b',
            fontSize: '0.95rem'
          }}
        >
          🔍 Search Jobs
        </label>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <input
            id="job-search-input"
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Search by job title, company name, or description keywords..."
            style={{
              width: '100%',
              padding: '0.65rem 2.5rem 0.65rem 0.85rem',
              fontSize: '0.95rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => onKeywordChange('')}
              aria-label="Clear search keyword"
              style={{
                position: 'absolute',
                right: '10px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: '1rem',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Multi-Criteria Dropdown Filters Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end'
        }}
      >
        {/* Location Dropdown */}
        <div>
          <label
            htmlFor="location-filter-select"
            style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.35rem',
              fontSize: '0.875rem',
              color: '#334155'
            }}
          >
            📍 Location
          </label>
          <select
            id="location-filter-select"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Locations</option>
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Dropdown */}
        <div>
          <label
            htmlFor="job-type-filter-select"
            style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.35rem',
              fontSize: '0.875rem',
              color: '#334155'
            }}
          >
            💼 Employment Type
          </label>
          <select
            id="job-type-filter-select"
            value={jobType}
            onChange={(e) => onJobTypeChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Employment Types</option>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Work Mode Dropdown */}
        <div>
          <label
            htmlFor="work-mode-filter-select"
            style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.35rem',
              fontSize: '0.875rem',
              color: '#334155'
            }}
          >
            🏢 Work Mode
          </label>
          <select
            id="work-mode-filter-select"
            value={workMode}
            onChange={(e) => onWorkModeChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Work Modes</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div>
          <button
            type="button"
            id="clear-filters-btn"
            onClick={onReset}
            disabled={!hasActiveFilters}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: hasActiveFilters ? '1px solid #ef4444' : '1px solid #cbd5e1',
              backgroundColor: hasActiveFilters ? '#fff5f5' : '#f8fafc',
              color: hasActiveFilters ? '#dc2626' : '#94a3b8',
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary Bar & Active Filters */}
      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: '#64748b'
        }}
      >
        <div>
          {loading ? (
            <span>Filtering jobs...</span>
          ) : (
            <span>
              Showing <strong>{totalResults}</strong> {totalResults === 1 ? 'job opportunity' : 'job opportunities'}
            </span>
          )}
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
            {keyword.trim() && (
              <span style={pillStyle}>
                Keyword: "{keyword.trim()}"
              </span>
            )}
            {location && (
              <span style={pillStyle}>
                Location: {location}
              </span>
            )}
            {jobType && (
              <span style={pillStyle}>
                Type: {jobType}
              </span>
            )}
            {workMode && (
              <span style={pillStyle}>
                Mode: {workMode}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pillStyle = {
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  padding: '0.2rem 0.55rem',
  borderRadius: '12px',
  fontSize: '0.75rem',
  fontWeight: '500',
  border: '1px solid #bfdbfe'
};
