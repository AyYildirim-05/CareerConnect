/**
 * Prompt Pipeline Builder & Output Normalizer for Job Compatibility Analysis (Task 9.1)
 */
class MatchPromptBuilder {
  /**
   * Build the structured LLM prompt comparing a candidate's profile/resume against a job posting
   * @param {Object} params
   * @param {string} params.candidateText - Plain text representation of candidate resume/profile
   * @param {string[]} [params.candidateSkills=[]] - Explicit list of candidate skills
   * @param {Object} params.job - Job posting object ({ title, companyName, department, description, requirements, jobType, workMode })
   * @returns {string}
   */
  static buildCompatibilityPrompt({ candidateText = '', candidateSkills = [], job = {} }) {
    const skillsLine = Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.join(', ')
      : 'See candidate profile text below';

    return `You are an expert technical recruiter and AI career matching engine.
Compare the candidate's qualifications and skills against the job posting requirements below.

Return strictly valid JSON with these exact keys:
- "matchScore": integer from 0 to 100 representing how well the candidate's qualifications align with the job requirements
- "matchedSkills": array of specific skills/qualifications from the job requirements that the candidate possesses
- "missingSkills": array of specific skills/qualifications required by the job that are missing from the candidate's profile
- "summaryBullets": array of 2 to 3 concise bullet strings summarizing (1) matched skills/strengths and (2) key skill gaps to address before applying

Job Posting:
- Title: ${job.title || 'Unspecified Role'}
- Company: ${job.companyName || 'Unspecified Company'}
- Department: ${job.department || 'General'}
- Type / Mode: ${job.jobType || 'Full-time'} (${job.workMode || 'On-site'})
- Description: ${job.description || ''}
- Requirements: ${job.requirements || ''}

Candidate Listed Skills:
${skillsLine}

Candidate Full Profile / Resume:
${candidateText}`;
  }

  /**
   * Validate and normalize raw LLM JSON output to guarantee acceptance criteria:
   * - matchScore is an integer between 0 and 100
   * - summaryBullets is an array of 2 to 3 non-empty strings
   * - matchedSkills and missingSkills are arrays of strings
   * @param {Object} payload
   * @returns {{ matchScore: number, matchedSkills: string[], missingSkills: string[], summaryBullets: string[] }}
   */
  static normalizeMatchPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid JSON payload returned from LLM.');
    }

    const rawScore = Number(payload.matchScore);
    if (Number.isNaN(rawScore)) {
      throw new Error('Missing or invalid matchScore in LLM response.');
    }

    const matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const toStringArray = (arr) =>
      Array.isArray(arr)
        ? arr.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const matchedSkills = toStringArray(payload.matchedSkills);
    const missingSkills = toStringArray(payload.missingSkills);
    const summaryBullets = toStringArray(payload.summaryBullets).slice(0, 3);

    if (summaryBullets.length < 2) {
      throw new Error('LLM response must contain at least 2 summary bullets.');
    }

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      summaryBullets
    };
  }
}

module.exports = MatchPromptBuilder;
