const MockInterviewPromptBuilder = require('./mockInterviewPromptBuilder');

/**
 * MockInterviewService (Task 11.1)
 * Builds and executes the Gemini LLM prompt pipeline taking a job posting's
 * description and requirements to generate 5 structured interview questions:
 * 3 technical/role-specific and 2 behavioral (STAR method).
 */
class MockInterviewService {
  /**
   * Validate job posting input before invoking the prompt pipeline
   * @param {Object} params
   * @returns {{ title: string, companyName: string, department: string, job_description: string, requirements: string }}
   */
  static validateInput(params = {}) {
    const job = params.job && typeof params.job === 'object' ? params.job : {};
    const title = String(params.title || job.title || '').trim();
    const companyName = String(params.companyName || job.companyName || '').trim();
    const department = String(params.department || job.department || '').trim();
    const jobDescription = String(
      params.job_description || params.jobDescription || job.description || ''
    ).trim();
    const requirements = String(params.requirements || job.requirements || '').trim();

    if (!jobDescription && !requirements && !title) {
      const err = new Error('A valid job posting with a description or requirements is required to generate interview questions.');
      err.statusCode = 400;
      throw err;
    }

    return {
      title: title || 'Target Role',
      companyName: companyName || 'Hiring Company',
      department: department || 'General',
      job_description: jobDescription,
      requirements
    };
  }

  /**
   * Generate 5 tailored interview questions (3 technical/role-specific + 2 behavioral STAR)
   * using the Gemini API prompt pipeline (Task 11.1).
   *
   * @param {Object} params
   * @param {Object} [params.job]
   * @param {string} [params.job_description]
   * @param {string} [params.requirements]
   * @param {string} [params.title]
   * @param {string} [params.companyName]
   * @param {string} [params.department]
   * @returns {Promise<{ provider: string, questions: Array<Object> }>}
   */
  static async generateQuestions(params = {}) {
    const validated = this.validateInput(params);
    const prompt = MockInterviewPromptBuilder.buildInterviewPrompt(validated);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const err = new Error('GEMINI_API_KEY is not configured on the server.');
      err.statusCode = 500;
      throw err;
    }

    const llmResult = await this._callGeminiApi(prompt, apiKey);

    return {
      provider: 'gemini',
      questions: llmResult.questions
    };
  }

  /**
   * Call Google Gemini API with structured JSON output
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
          temperature: 0.4
        }
      })
    });

    if (!response.ok) {
      const err = new Error(`Gemini API responded with status ${response.status}`);
      err.statusCode = 502;
      throw err;
    }

    const payload = await response.json();
    const rawJsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      const err = new Error('Empty response from Gemini API.');
      err.statusCode = 502;
      throw err;
    }

    const parsed = JSON.parse(rawJsonText);
    return MockInterviewPromptBuilder.normalizeQuestionsPayload(parsed);
  }
}

module.exports = MockInterviewService;
