const MatchPromptBuilder = require('./matchPromptBuilder');
const LocalCompatibilityAnalyzer = require('./localCompatibilityAnalyzer');
const ResumeParserService = require('./resumeParserService');

const MAX_CANDIDATE_TEXT_LENGTH = 15000;

// In-memory cache to avoid redundant LLM calls when rendering job lists
const matchCache = new Map();

class CompatibilityService {
  /**
   * Clear in-memory compatibility cache (useful for tests or profile updates)
   */
  static clearCache() {
    matchCache.clear();
  }

  /**
   * Extract plain text and skills array from a candidate profile or resume object/text
   * @param {Object} params
   * @param {Object} [params.resumeProfile]
   * @param {string} [params.resumeText]
   * @param {string[]} [params.candidateSkills]
   * @returns {{ cleanCandidateText: string, skillsList: string[] }}
   */
  static prepareCandidateInput({ resumeProfile = null, resumeText = '', candidateSkills = [] }) {
    const skillsList = Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.map((s) => String(s).trim()).filter(Boolean)
      : LocalCompatibilityAnalyzer.extractCandidateSkillsList(resumeProfile || {});

    let text = typeof resumeText === 'string' ? resumeText.trim() : '';
    if (!text && resumeProfile && typeof resumeProfile === 'object') {
      text = ResumeParserService.profileToText(resumeProfile);
      if (!text && resumeProfile.bio) {
        text = String(resumeProfile.bio);
      }
    }

    if (!text && skillsList.length > 0) {
      text = `Skills: ${skillsList.join(', ')}`;
    }

    if (!text && skillsList.length === 0) {
      const err = new Error('No candidate profile or resume found. Please upload your resume on the Dashboard to see your AI match score.');
      err.statusCode = 400;
      throw err;
    }

    return {
      cleanCandidateText: text.slice(0, MAX_CANDIDATE_TEXT_LENGTH),
      skillsList
    };
  }

  /**
   * Validate job object
   * @param {Object} job
   */
  static validateJob(job) {
    if (!job || typeof job !== 'object' || (!job.title && !job.requirements && !job.description)) {
      const err = new Error('A valid job posting with requirements or description is required.');
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Compare candidate qualifications against a job posting (Task 9.1)
   * Uses the Gemini prompt pipeline when GEMINI_API_KEY is available and useLlm !== false,
   * and falls back to LocalCompatibilityAnalyzer for instant deterministic scoring.
   *
   * @param {Object} params
   * @param {Object} [params.resumeProfile]
   * @param {string} [params.resumeText]
   * @param {string[]} [params.candidateSkills]
   * @param {Object} params.job
   * @param {boolean} [params.useLlm=true]
   * @returns {Promise<{ jobId: string, jobTitle: string, provider: string, matchScore: number, matchedSkills: string[], missingSkills: string[], summaryBullets: string[] }>}
   */
  static async analyzeCompatibility({
    resumeProfile = null,
    resumeText = '',
    candidateSkills = [],
    job,
    useLlm = true
  }) {
    this.validateJob(job);
    const { cleanCandidateText, skillsList } = this.prepareCandidateInput({
      resumeProfile,
      resumeText,
      candidateSkills
    });

    const cacheKey = `${job.id || job.title}::${skillsList.join('|')}::${cleanCandidateText.slice(0, 200)}`;
    if (matchCache.has(cacheKey)) {
      return matchCache.get(cacheKey);
    }

    const prompt = MatchPromptBuilder.buildCompatibilityPrompt({
      candidateText: cleanCandidateText,
      candidateSkills: skillsList,
      job
    });

    const apiKey = process.env.GEMINI_API_KEY;

    if (useLlm && apiKey && typeof fetch === 'function') {
      try {
        const llmResult = await this._callGeminiApi(prompt, apiKey);
        const response = {
          jobId: job.id || null,
          jobTitle: job.title || '',
          provider: 'gemini',
          ...llmResult
        };
        matchCache.set(cacheKey, response);
        return response;
      } catch (apiError) {
        console.warn('Gemini compatibility call failed, falling back to local analyzer:', apiError.message);
      }
    }

    const localResult = LocalCompatibilityAnalyzer.analyze({
      resumeProfile,
      candidateText: cleanCandidateText,
      candidateSkills: skillsList,
      job
    });

    const response = {
      jobId: job.id || null,
      jobTitle: job.title || '',
      provider: 'heuristic-analyzer',
      ...localResult
    };
    matchCache.set(cacheKey, response);
    return response;
  }

  /**
   * Call Google Gemini API with structured JSON response
   * @private
   */
  static async _callGeminiApi(prompt, apiKey) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const payload = await response.json();
    const rawJsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error('Empty response from Gemini API.');
    }

    const parsed = JSON.parse(rawJsonText);
    return MatchPromptBuilder.normalizeMatchPayload(parsed);
  }
}

module.exports = CompatibilityService;
