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
    if (apiKey) {
      try {
        const llmResult = await this._callGeminiApi(prompt, apiKey);
        return {
          provider: 'gemini',
          questions: llmResult.questions
        };
      } catch (err) {
        console.warn('Gemini interview generation failed, falling back to heuristic generator:', err.message);
      }
    }

    return {
      provider: 'heuristic-generator',
      questions: this._buildHeuristicQuestions(validated)
    };
  }

  /**
   * Generate 1 additional tailored interview question (technical or behavioral STAR)
   * to append to an existing mock interview questionnaire.
   *
   * @param {Object} params
   * @param {Object} [params.job]
   * @param {string} [params.category='technical'] - 'technical' | 'behavioral'
   * @param {Array<Object>} [params.existingQuestions=[]]
   * @returns {Promise<{ provider: string, question: Object }>}
   */
  static async generateAdditionalQuestion(params = {}) {
    const validated = this.validateInput({
      ...params,
      title: params.title || params.job?.title || 'Target Role'
    });
    const category = String(params.category || 'technical').toLowerCase() === 'behavioral'
      ? 'behavioral'
      : 'technical';
    const existingQuestions = Array.isArray(params.existingQuestions) ? params.existingQuestions : [];
    const nextNumber = existingQuestions.length + 1;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && typeof fetch === 'function') {
      try {
        const existingList = existingQuestions
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join('\n');
        const singlePrompt = `You are an expert technical interviewer and career coach.
Generate ONE new ${category === 'behavioral' ? 'behavioral (STAR method)' : 'technical / role-specific'} interview question for the role below.
Do NOT repeat any of these existing questions:
${existingList || '(none)'}

Job Posting:
- Title: ${validated.title}
- Company: ${validated.companyName}
- Description: ${validated.job_description}
- Requirements: ${validated.requirements}

Return strictly valid JSON with this shape:
{
  "category": "${category}",
  "framework": "${category === 'behavioral' ? 'STAR' : 'Role-Specific'}",
  "focusArea": "Short 2-4 word skill or competency label",
  "question": "The interview question text...",
  "hint": "Coaching tip on what a strong answer should cover..."
}`;
        const raw = await this._callGeminiRawJson(singlePrompt, apiKey);
        if (raw && raw.question && String(raw.question).trim()) {
          return {
            provider: 'gemini',
            question: this._normalizeSingleQuestion(raw, nextNumber, category)
          };
        }
      } catch (err) {
        console.warn('Gemini single question generation failed, using heuristic generator:', err.message);
      }
    }

    const fallback = this._buildAdditionalHeuristicQuestion(validated, existingQuestions, category, nextNumber);
    return {
      provider: 'heuristic-generator',
      question: fallback
    };
  }

  /**
   * Normalize a single question object (custom or generated)
   */
  static _normalizeSingleQuestion(item = {}, questionNumber = 1, defaultCategory = 'technical') {
    const cat = String(item.category || defaultCategory).toLowerCase();
    const isBehavioral = cat === 'behavioral' || String(item.framework || '').toUpperCase() === 'STAR';
    const category = isBehavioral ? 'behavioral' : 'technical';
    const framework = isBehavioral ? 'STAR' : 'Role-Specific';

    const defaultStarGuide = {
      situation: 'Set the scene and provide relevant context from a past project or team environment.',
      task: 'Describe your specific responsibility, goal, or obstacle that needed to be resolved.',
      action: 'Explain the concrete steps, technical decisions, or communication actions you personally took.',
      result: 'Highlight the outcome, measurable impact, and what you learned from the experience.'
    };

    return {
      id: `q_${questionNumber}`,
      questionNumber,
      category,
      framework,
      focusArea: String(
        item.focusArea || (isBehavioral ? 'Behavioral (STAR Method)' : `Technical Competency #${questionNumber}`)
      ).trim(),
      question: String(item.question || '').trim(),
      hint: String(
        item.hint ||
          (isBehavioral
            ? 'Use the STAR method (Situation, Task, Action, Result) to structure a clear, concrete example with measurable impact.'
            : 'Walk through your technical reasoning, trade-offs, and practical implementation details.')
      ).trim(),
      starGuide: isBehavioral
        ? {
            situation: String(item.starGuide?.situation || defaultStarGuide.situation).trim(),
            task: String(item.starGuide?.task || defaultStarGuide.task).trim(),
            action: String(item.starGuide?.action || defaultStarGuide.action).trim(),
            result: String(item.starGuide?.result || defaultStarGuide.result).trim()
          }
        : null
    };
  }

  /**
   * Build 5 deterministic role-tailored questions when Gemini is unavailable
   * @private
   */
  static _buildHeuristicQuestions(validated) {
    const role = validated.title || 'Target Role';
    const company = validated.companyName || 'the organization';
    const text = `${validated.job_description} ${validated.requirements}`;
    const detectedSkills = this._extractKeySkills(text);
    const s1 = detectedSkills[0] || 'system architecture and API design';
    const s2 = detectedSkills[1] || 'application performance and state management';
    const s3 = detectedSkills[2] || 'data modeling, testing, and reliability';

    const rawQuestions = [
      {
        category: 'technical',
        framework: 'Role-Specific',
        focusArea: `${s1} Architecture`,
        question: `For the ${role} role at ${company}, how would you design, structure, and scale a production workflow involving ${s1}?`,
        hint: `Discuss core design patterns, error handling, trade-offs, and how you measure reliability or latency with ${s1}.`
      },
      {
        category: 'technical',
        framework: 'Role-Specific',
        focusArea: `${s2} Optimization`,
        question: `When working with ${s2}, what strategies do you use to diagnose bottlenecks, optimize performance, and maintain clean code?`,
        hint: `Mention specific profiling tools, caching or optimization techniques, trade-offs, and a concrete metric improvement.`
      },
      {
        category: 'technical',
        framework: 'Role-Specific',
        focusArea: `${s3} & Quality`,
        question: `How do you ensure data integrity, automated test coverage, and safe deployments when building features around ${s3}?`,
        hint: `Explain your testing pyramid, edge-case validation, observability/monitoring, and rollback strategies.`
      },
      {
        category: 'behavioral',
        framework: 'STAR',
        focusArea: 'Problem Solving Under Pressure',
        question: `Tell me about a time when you faced an unexpected technical roadblock or tight deadline on a project relevant to ${role} and how you delivered a solution.`,
        hint: 'Use the STAR method (Situation, Task, Action, Result) and include a quantifiable outcome.'
      },
      {
        category: 'behavioral',
        framework: 'STAR',
        focusArea: 'Cross-Functional Collaboration',
        question: `Describe a situation where you had to align with teammates or stakeholders on a challenging design decision and how you reached consensus.`,
        hint: 'Use the STAR method (Situation, Task, Action, Result) to highlight your communication and impact.'
      }
    ];

    return MockInterviewPromptBuilder.normalizeQuestionsPayload({ questions: rawQuestions }).questions;
  }

  /**
   * Build 1 additional heuristic question that avoids repeating existing questions
   * @private
   */
  static _buildAdditionalHeuristicQuestion(validated, existingQuestions, category, nextNumber) {
    const role = validated.title || 'Target Role';
    const skills = this._extractKeySkills(`${validated.job_description} ${validated.requirements}`);
    const existingTexts = new Set(existingQuestions.map((q) => String(q.question || '').toLowerCase().trim()));

    const techPool = [
      {
        focusArea: 'Security & Access Control',
        question: `In the ${role} position, how would you secure endpoints, validate untrusted input, and enforce authentication/authorization best practices?`,
        hint: 'Discuss JWT/OAuth, least-privilege access control, input sanitization, rate limiting, and trade-offs.'
      },
      {
        focusArea: 'Scalability & Caching',
        question: `Suppose traffic to a core ${role} service increases 10x overnight. How would you use caching, indexing, or async queues to keep latency low?`,
        hint: 'Name specific tools (e.g., Redis, database indexes, message queues), cache invalidation trade-offs, and target latency metrics.'
      },
      {
        focusArea: 'Debugging & Observability',
        question: `Walk through how you would instrument, monitor, and debug an intermittent production failure in a ${skills[0] || 'distributed'} service.`,
        hint: 'Cover structured logging, metrics, tracing, reproduction steps, and root-cause isolation.'
      },
      {
        focusArea: 'Code Maintainability & Trade-offs',
        question: `When refactoring a legacy module in ${skills[1] || 'your stack'}, how do you balance delivery speed against technical debt and test coverage?`,
        hint: 'Explain incremental refactoring, regression testing, trade-offs, and measurable improvements.'
      },
      {
        focusArea: 'API & Schema Evolution',
        question: `How do you design backward-compatible API or database schema changes so zero-downtime deployments remain safe?`,
        hint: 'Mention expand-and-contract migrations, versioning, feature flags, and rollback plans.'
      }
    ];

    const behavioralPool = [
      {
        focusArea: 'Ownership & Initiative',
        question: `Tell me about a time when you identified a gap in a system, process, or user experience without being asked and took initiative to fix it.`,
        hint: 'Structure with STAR (Situation, Task, Action, Result) and quantify the time saved or quality improvement.'
      },
      {
        focusArea: 'Learning New Technology Rapidly',
        question: `Describe a situation where you had to quickly learn an unfamiliar tool, framework, or domain to deliver a critical milestone.`,
        hint: 'Use the STAR method to explain your learning strategy, concrete implementation steps, and final project result.'
      },
      {
        focusArea: 'Handling Constructive Feedback',
        question: `Tell me about a time when a code review or design critique uncovered a flaw in your approach and how you responded.`,
        hint: 'Use the STAR method (Situation, Task, Action, Result) and share what changed in your engineering workflow.'
      },
      {
        focusArea: 'Prioritization & Trade-offs',
        question: `Describe a time when you had competing high-priority deliverables and had to negotiate scope or trade-offs with stakeholders.`,
        hint: 'Use the STAR method and highlight how you communicated priorities and measured success.'
      }
    ];

    const pool = category === 'behavioral' ? behavioralPool : techPool;
    const chosen = pool.find((item) => !existingTexts.has(item.question.toLowerCase())) || {
      focusArea: category === 'behavioral' ? `Behavioral Competency #${nextNumber}` : `Technical Deep Dive #${nextNumber}`,
      question:
        category === 'behavioral'
          ? `Tell me about a complex challenge you solved in a team environment that prepared you for the ${role} role (Question #${nextNumber}).`
          : `For the ${role} role, how would you architect, test, and monitor a high-reliability feature end-to-end (Question #${nextNumber})?`,
      hint:
        category === 'behavioral'
          ? 'Use the STAR method (Situation, Task, Action, Result) with measurable impact.'
          : 'Cover architecture, trade-offs, tools, and measurable performance indicators.'
    };

    return this._normalizeSingleQuestion(
      { ...chosen, category },
      nextNumber,
      category
    );
  }

  /** @private */
  static _extractKeySkills(text = '') {
    const candidates = [
      'React', 'Node.js', 'Express', 'PostgreSQL', 'Python', 'TypeScript', 'JavaScript',
      'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'REST APIs', 'Redis', 'CI/CD', 'SQL',
      'Java', 'Spring', 'MongoDB', 'Firestore', 'Microservices', 'Machine Learning'
    ];
    const lower = String(text).toLowerCase();
    return candidates.filter((skill) => lower.includes(skill.toLowerCase()));
  }

  /** @private */
  static async _callGeminiRawJson(prompt, apiKey) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5
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

    return JSON.parse(rawJsonText);
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
