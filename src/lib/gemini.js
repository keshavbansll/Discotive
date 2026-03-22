import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API (Ensure VITE_GEMINI_API_KEY is in your .env)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Use Gemini 1.5 Flash for the fastest, cheapest, JSON-optimized responses
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * CALL 1: Generate Calibration Questions
 */
export const generateCalibrationQuestions = async (userData) => {
  try {
    const profile = {
      domain: userData?.vision?.passion || "General",
      niche: userData?.vision?.niche || "Career Growth",
      skills: userData?.skills?.alignedSkills || [],
      baseline: userData?.baseline || "Student",
    };

    const prompt = `
      You are an elite MAANG career strategist. A user is starting their journey.
      User Profile: ${JSON.stringify(profile)}
      
      Generate exactly 3 highly probing, personalized questions to calibrate their roadmap.
      - Question 1 must be 'text' type (asking for specific 90-day goal).
      - Question 2 must be 'mcq' type (asking about their biggest bottleneck, provide 4 options).
      - Question 3 must be 'mcq' type (asking about weekly time commitment, provide 4 options).

      Return ONLY a valid JSON array of objects. No markdown formatting, no backticks.
      Format: [{"id": "q1", "type": "text", "question": "..."}, {"id": "q2", "type": "mcq", "question": "...", "options": ["A","B"]}]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Question Generation Failed:", error);
    throw new Error("Calibration failed.");
  }
};

/**
 * CALL 2: Synthesize the Execution Map
 */
export const generateExecutionMap = async (
  userData,
  qaAnswers,
  subscriptionTier,
) => {
  try {
    const profile = {
      domain: userData?.vision?.passion || "General",
      niche: userData?.vision?.niche || "Career Growth",
      skills: userData?.skills?.alignedSkills || [],
      location: userData?.footprint?.location || "Unknown",
    };

    const maxNodes = subscriptionTier === "free" ? 10 : 25;

    const prompt = `
      You are an elite MAANG career strategist. Build a highly tactical, sequential career roadmap.
      User Profile: ${JSON.stringify(profile)}
      User Answers to Calibration: ${JSON.stringify(qaAnswers)}
      
      CRITICAL CONSTRAINT: You must generate a MAXIMUM of ${maxNodes} total nodes/phases.

      Return ONLY a valid JSON object representing the roadmap. No markdown, no backticks.
      Format strictly like this:
      {
        "phases": [
          {
            "title": "Phase 1: Foundation",
            "subtitle": "Weeks 1-4",
            "desc": "Tactical advice here...",
            "nodeType": "core", 
            "tasks": ["Task 1", "Task 2", "Task 3"]
          },
          {
            "title": "Side Quest: Portfolio",
            "subtitle": "Parallel",
            "desc": "Build something.",
            "nodeType": "branch",
            "tasks": ["Task A", "Task B"]
          }
        ]
      }
      Rule: Alternating 'core' and 'branch' nodeTypes looks best visually.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Roadmap Generation Failed:", error);
    throw new Error("Synthesis failed.");
  }
};
