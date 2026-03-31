import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateCalibrationQuestions = async (userData) => {
  try {
    const prompt = `
      SYSTEM DIRECTIVE: Act as an elite Agentic Workflow Architect.
      OPERATOR CONTEXT:
      - Domain: ${userData?.vision?.passion || "General"}
      - Niche: ${userData?.vision?.niche || "Career Growth"}
      - Baseline: ${userData?.baseline || "Starting out"}
      - Location: ${userData?.footprint?.location || "Global"}
      - Skills: ${JSON.stringify(userData?.skills?.alignedSkills || [])}
      
      Generate 3 highly probing, personalized calibration questions to map their neural execution graph.
      DO NOT ask generic questions. Use their specific niche and skills.
      - Q1 (text): Ask for a highly specific, measurable 90-day objective.
      - Q2 (mcq): Ask to identify their most critical operational bottleneck (4 hyper-specific options).
      - Q3 (mcq): Ask about their resource allocation (time/capital) strategy (4 options).

      Return ONLY a JSON array. Format: [{"id": "q1", "type": "text", "question": "..."}, {"id": "q2", "type": "mcq", "question": "...", "options": ["A","B"]}]
    `;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("[Gemini] Calibration Error:", error);
    throw new Error("Calibration failed.");
  }
};

export const generateExecutionMap = async (
  userData,
  qaAnswers,
  subscriptionTier,
  learnInventory = { videos: [], certificates: [] },
) => {
  try {
    const isPro = subscriptionTier?.toLowerCase() === "pro";
    const minExecutionNodes = isPro ? 30 : 15;
    const maxExecutionNodes = isPro ? 45 : 20;

    const prompt = `
      SYSTEM DIRECTIVE: Act as a Graph Database Compiler for the Discotive Career Engine.
      Output a visual execution DAG (Directed Acyclic Graph) — NO cycles, NO bidirectional edges.

      OPERATOR CONTEXT:
        Domain: ${userData?.vision?.passion || "General"}
        Niche:  ${userData?.vision?.niche || "General"}
        Skills: ${JSON.stringify(userData?.skills?.alignedSkills || []).slice(0, 200)}

      CALIBRATION DATA: ${JSON.stringify(qaAnswers)}

      DISCOTIVE LEARN INVENTORY (STRICT USAGE - USE THESE EXACT IDs):
      Videos: ${JSON.stringify(learnInventory.videos)}
      Certificates: ${JSON.stringify(learnInventory.certificates)}

      ═══════════════════════════════════════════════════════════
      TOPOLOGY RULES (MANDATORY)
      ═══════════════════════════════════════════════════════════
      1. Generate EXACTLY ${minExecutionNodes}–${maxExecutionNodes} "core" + "branch" nodes total.
      2. ZERO floating nodes.
      3. CHRONOLOGICAL SPINE: Core nodes represent sequential milestones (n1→n2→n3).
      4. DISCOTIVE LEARN ATTACHMENTS (CRITICAL):
         - If a task requires learning a concept, attach a "videoWidget" using a "learnId" and "youtubeId" strictly from the Videos inventory provided.
         - If a task requires proving a skill, attach an "assetWidget" and set "requiredLearnId" strictly from the Certificates inventory.
         - NEVER hallucinate IDs. If no match exists, use generic nodes without IDs.

      ═══════════════════════════════════════════════════════════
      NODE TYPES
      ═══════════════════════════════════════════════════════════
      - "core"          → Main spine milestone.
      - "branch"        → Parallel task.
      - "assetWidget"   → { "id":"...", "type":"assetWidget", "label":"...", "requiredLearnId":"discotive_certificate_XXXXXX" }
      - "videoWidget"   → { "id":"...", "type":"videoWidget", "title":"...", "youtubeId":"...", "learnId":"discotive_video_XXXXXX", "baseScore": 10 }
      ${isPro ? `- "radarWidget"   → Skills radar. Exactly 1, attached to first core.` : ""}

      RETURN ONLY RAW JSON. DO NOT WRAP IN MARKDOWN OR EXPLANATIONS.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    const textResponse = result.response.text();
    // ROBUST EXTRACTION: Finds the first [ or { and parses to the end, ignoring AI conversational text
    const jsonMatch = textResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("AI returned malformed topology data.");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[Gemini] Synthesis Error:", error);
    throw new Error("Execution Map Synthesis failed.");
  }
};