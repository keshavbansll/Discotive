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

      Return ONLY a JSON array: [{"id": "q1", "type": "text", "question": "..."}, {"id": "q2", "type": "mcq", "question": "...", "options": ["A","B"]}]
    `;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return JSON.parse(result.response.text());
  } catch (error) {
    throw new Error("Calibration failed.");
  }
};

export const generateExecutionMap = async (
  userData,
  qaAnswers,
  subscriptionTier,
) => {
  try {
    const isPro = subscriptionTier.toLowerCase() === "pro";
    const minExecutionNodes = isPro ? 30 : 15;
    const maxExecutionNodes = isPro ? 45 : 20;

    const prompt = `
      SYSTEM DIRECTIVE: Act as a Graph Database Compiler for an Agentic AI OS.
      OPERATOR CONTEXT: Domain: ${userData?.vision?.passion || "General"} | Niche: ${userData?.vision?.niche || "General"}
      CALIBRATION DATA: ${JSON.stringify(qaAnswers)}
      
      CRITICAL MATH CONSTRAINTS:
      1. You MUST generate between ${minExecutionNodes} and ${maxExecutionNodes} total "core" and "branch" nodes.
      2. NO FLOATING NODES. Every single node MUST be connected via an edge.
      3. Create deep, asymmetrical complexity. Cores should branch into 2-3 sub-routines. Some sub-routines should branch again.

      NODE TYPES (nodeType):
      1. "core" - Chronological main-spine milestones.
      2. "branch" - Parallel execution tasks.
      3. "assetWidget" - Generate 2-3 of these ONLY attached to nodes that logically require a document/proof (e.g., "Business Plan", "Resume").
      4. "videoWidget" - Generate 1-2 of these ONLY attached to nodes that require deep learning/research.
      ${isPro ? '5. "radarWidget" - Attach exactly 1 to the first core node to establish baseline telemetry.' : ""}

      HANDLES & EDGES:
      - All edges MUST specify a valid "source", "target", "sourceHandle" (right, bottom, top, left), and "targetHandle".
      - "connType" MUST be one of: "core-core", "core-branch", "branch-sub".

      Return ONLY raw JSON strictly matching this schema. NO MARKDOWN.
      {
        "nodes": [
          { "id": "n1", "type": "core", "title": "...", "subtitle": "...", "desc": "...", "deadline_offset_days": 7, "tasks": ["T1", "T2"] },
          { "id": "n2", "type": "branch", "title": "...", "subtitle": "...", "desc": "...", "deadline_offset_days": 14, "tasks": ["T1"] },
          { "id": "n3", "type": "assetWidget", "label": "...", "assetType": "Template" },
          { "id": "n4", "type": "videoWidget", "title": "...", "platform": "YouTube" }
        ],
        "edges": [
          { "source": "n1", "target": "n2", "sourceHandle": "right", "targetHandle": "left", "connType": "core-branch" },
          { "source": "n2", "target": "n3", "sourceHandle": "bottom", "targetHandle": "top", "connType": "branch-sub" }
        ]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const cleanJson = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    throw new Error("Synthesis failed.");
  }
};
