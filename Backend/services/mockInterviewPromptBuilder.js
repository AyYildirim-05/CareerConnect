/**
 * Prompt Pipeline Builder & Output Normalizer for Automated Mock Interview Engine (Task 11.1)
 * Ingests a target job posting's description and requirements to generate 5 structured
 * interview questions: 3 technical/role-specific and 2 behavioral (STAR method).
 */
class MockInterviewPromptBuilder {
  /**
   * Build the structured LLM prompt taking job_description (and requirements) to generate
   * 5 tailored interview questions: 3 technical/role-specific and 2 behavioral (STAR method).
   *
   * @param {Object} params
   * @param {string} [params.job_description] - Job posting description text
   * @param {string} [params.requirements] - Job posting requirements text
   * @param {string} [params.title] - Job posting title
   * @param {string} [params.companyName] - Company name
   * @param {string} [params.department] - Department name
   * @param {Object} [params.job] - Optional full job posting object
   * @returns {string}
   */
  static buildInterviewPrompt(params = {}) {
    const job = params.job && typeof params.job === 'object' ? params.job : {};
    const title = params.title || job.title || 'Target Role';
    const companyName = params.companyName || job.companyName || 'Hiring Company';
    const department = params.department || job.department || 'General';
    const jobDescription = params.job_description || params.jobDescription || job.description || '';
    const requirements = params.requirements || job.requirements || '';

    return `You are an expert technical interviewer and behavioral hiring coach.
Ingest the following target job posting's description and requirements, and generate a tailored 5-question mock interview session.

You MUST generate strictly 5 questions in exact order:
- Questions 1, 2, and 3 MUST have "category": "technical" (3 technical / role-specific questions directly testing the core technologies, architecture, tools, or domain responsibilities mentioned in the job description and requirements).
- Questions 4 and 5 MUST have "category": "behavioral" and "framework": "STAR" (2 behavioral questions designed to be answered using the STAR method: Situation, Task, Action, Result, tailored to the team and role challenges).

Return strictly valid JSON with this exact root key:
{
  "questions": [
    {
      "id": "q_1",
      "questionNumber": 1,
      "category": "technical",
      "framework": "Role-Specific",
      "focusArea": "Short 2-4 word skill/topic label",
      "question": "Detailed role-specific technical interview question...",
      "hint": "Key concepts or talking points a strong answer should cover..."
    },
    ...
    {
      "id": "q_4",
      "questionNumber": 4,
      "category": "behavioral",
      "framework": "STAR",
      "focusArea": "Short 2-4 word competency label",
      "question": "Behavioral interview question starting with 'Tell me about a time...' or 'Describe a situation where...'",
      "hint": "Structure your response using the STAR method (Situation, Task, Action, Result).",
      "starGuide": {
        "situation": "Describe the specific context or project background.",
        "task": "Explain your specific responsibility or challenge.",
        "action": "Detail the concrete steps you took to address it.",
        "result": "Share the measurable outcome or lesson learned."
      }
    }
  ]
}

Target Job Posting:
- Title: ${title}
- Company: ${companyName}
- Department: ${department}
- Job Description: ${jobDescription}
- Requirements: ${requirements}`;
  }

  /**
   * Validate and normalize raw LLM JSON output to guarantee acceptance criteria:
   * - Exactly 5 questions total
   * - Questions 1-3 are technical/role-specific ("category": "technical")
   * - Questions 4-5 are behavioral STAR method ("category": "behavioral", "framework": "STAR")
   *
   * @param {Object|Array} payload
   * @returns {{ questions: Array<Object> }}
   */
  static normalizeQuestionsPayload(payload) {
    const rawList = Array.isArray(payload)
      ? payload
      : (payload && Array.isArray(payload.questions) ? payload.questions : null);

    if (!rawList || rawList.length < 5) {
      throw new Error('LLM response must contain 5 structured interview questions.');
    }

    const technicalItems = [];
    const behavioralItems = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object' || !item.question || !String(item.question).trim()) {
        continue;
      }
      const cat = String(item.category || '').toLowerCase();
      if (cat.includes('behav') || String(item.framework || '').toUpperCase() === 'STAR') {
        behavioralItems.push(item);
      } else {
        technicalItems.push(item);
      }
    }

    // Ensure 3 technical + 2 behavioral questions
    let orderedRaw = [];
    if (technicalItems.length >= 3 && behavioralItems.length >= 2) {
      orderedRaw = [...technicalItems.slice(0, 3), ...behavioralItems.slice(0, 2)];
    } else {
      orderedRaw = rawList.slice(0, 5);
    }

    if (orderedRaw.length < 5 || orderedRaw.some((q) => !q || !String(q.question || '').trim())) {
      throw new Error('Invalid or incomplete interview questions in LLM response.');
    }

    const normalizedQuestions = orderedRaw.slice(0, 5).map((item, idx) => {
      const questionNumber = idx + 1;
      const isTechnical = questionNumber <= 3;
      const category = isTechnical ? 'technical' : 'behavioral';
      const framework = isTechnical ? 'Role-Specific' : 'STAR';

      const defaultStarGuide = {
        situation: 'Set the scene and provide relevant context from a past project or team environment.',
        task: 'Describe your specific responsibility, goal, or obstacle that needed to be resolved.',
        action: 'Explain the concrete steps, technical decisions, or communication actions you personally took.',
        result: 'Highlight the outcome, measurable impact, and what you learned from the experience.'
      };

      const starGuide = !isTechnical
        ? {
            situation: String(item.starGuide?.situation || defaultStarGuide.situation).trim(),
            task: String(item.starGuide?.task || defaultStarGuide.task).trim(),
            action: String(item.starGuide?.action || defaultStarGuide.action).trim(),
            result: String(item.starGuide?.result || defaultStarGuide.result).trim()
          }
        : null;

      return {
        id: `q_${questionNumber}`,
        questionNumber,
        category,
        framework,
        focusArea: String(
          item.focusArea || (isTechnical ? `Technical Competency #${questionNumber}` : 'Behavioral (STAR Method)')
        ).trim(),
        question: String(item.question).trim(),
        hint: String(
          item.hint ||
            (isTechnical
              ? 'Walk through your technical reasoning, trade-offs, and practical implementation details.'
              : 'Use the STAR method (Situation, Task, Action, Result) to structure a clear, concrete example.')
        ).trim(),
        starGuide
      };
    });

    return {
      questions: normalizedQuestions
    };
  }
}

module.exports = MockInterviewPromptBuilder;
