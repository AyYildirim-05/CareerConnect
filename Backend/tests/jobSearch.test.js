const test = require('node:test');
const assert = require('node:assert');
const JobPostingModel = require('../models/jobPostingModel');

const mockJobs = [
  {
    id: 'job-1',
    title: 'Senior Full Stack Developer',
    companyName: 'CloudCorp Technologies',
    department: 'Engineering',
    location: 'Montreal, QC',
    jobType: 'Full-time',
    workMode: 'Hybrid',
    description: 'Looking for a skilled developer with Node.js and React expertise.',
    requirements: '3+ years experience with modern JavaScript.'
  },
  {
    id: 'job-2',
    title: 'Junior Frontend Engineer',
    companyName: 'DesignSpark Labs',
    department: 'UI/UX',
    location: 'Toronto, ON',
    jobType: 'Full-time',
    workMode: 'Remote',
    description: 'Build responsive and accessible web interfaces in React.',
    requirements: 'HTML, CSS, React basics.'
  },
  {
    id: 'job-3',
    title: 'Data Analyst Intern',
    companyName: 'FinMetrics Global',
    department: 'Analytics',
    location: 'Montreal, QC',
    jobType: 'Internship',
    workMode: 'On-site',
    description: 'Analyze financial datasets using Python and SQL.',
    requirements: 'Enrolled in a Computer Science or Statistics degree.'
  },
  {
    id: 'job-4',
    title: 'DevOps & Cloud Specialist',
    companyName: 'ScaleGrid Inc',
    department: 'Infrastructure',
    location: 'Vancouver, BC',
    jobType: 'Contract',
    workMode: 'Remote',
    description: 'Maintain Kubernetes clusters and automated CI/CD pipelines.',
    requirements: 'Docker, Kubernetes, AWS or GCP.'
  }
];

test('JobPostingModel.filterJobs returns all jobs when no filters are passed', () => {
  const result = JobPostingModel.filterJobs(mockJobs, {});
  assert.strictEqual(result.length, 4);
});

test('JobPostingModel.filterJobs searches by job title keyword (case-insensitive)', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { keyword: 'full stack' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-1');
});

test('JobPostingModel.filterJobs searches by company name keyword (case-insensitive)', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { keyword: 'finmetrics' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-3');
});

test('JobPostingModel.filterJobs searches by description keywords', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { keyword: 'kubernetes' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-4');
});

test('JobPostingModel.filterJobs matches multi-word tokens across fields', () => {
  // Matches title "Developer" and description "Node.js"
  const result = JobPostingModel.filterJobs(mockJobs, { keyword: 'developer node.js' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-1');
});

test('JobPostingModel.filterJobs filters by location', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { location: 'montreal' });
  assert.strictEqual(result.length, 2);
  const ids = result.map(j => j.id);
  assert.ok(ids.includes('job-1'));
  assert.ok(ids.includes('job-3'));
});

test('JobPostingModel.filterJobs filters by employment type (jobType)', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { type: 'Internship' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-3');
});

test('JobPostingModel.filterJobs filters by work mode', () => {
  const result = JobPostingModel.filterJobs(mockJobs, { workMode: 'Remote' });
  assert.strictEqual(result.length, 2);
  const ids = result.map(j => j.id);
  assert.ok(ids.includes('job-2'));
  assert.ok(ids.includes('job-4'));
});

test('JobPostingModel.filterJobs combines multiple criteria: keyword + location + type', () => {
  const result = JobPostingModel.filterJobs(mockJobs, {
    keyword: 'react',
    location: 'Montreal',
    type: 'Full-time'
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'job-1');
});

test('JobPostingModel.filterJobs returns empty list when no jobs match criteria', () => {
  const result = JobPostingModel.filterJobs(mockJobs, {
    keyword: 'Astronaut'
  });
  assert.strictEqual(result.length, 0);
});
