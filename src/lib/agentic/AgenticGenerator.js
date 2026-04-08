/**
 * @fileoverview AgenticGenerator.js — MAANG-Grade Agentic Workflow Compiler
 * @description
 * This is NOT a to-do list generator. This produces executable n8n-style
 * state machine JSON. Every node has a defined execution contract:
 * - trigger conditions (what must be true BEFORE execution begins)
 * - verification contracts (what API/admin action UNLOCKS the node)
 * - output bindings (what state the node emits to downstream edges)
 * - score payloads (atomic Discotive Score mutations on completion)
 *
 * The JSON schema is strict. The LLM is given no creative freedom over
 * the structure — only the content (titles, descriptions, tasks).
 *
 * Node taxonomy:
 * EXECUTION    — Human-in-the-loop action node. Tasks, deadlines, proof-of-work.
 * MILESTONE    — DAG convergence gate. All inbound edges must be VERIFIED.
 * LOGIC_AND    — Requires ALL parent nodes VERIFIED to unlock children.
 * LOGIC_OR     — Requires ANY ONE parent node VERIFIED to unlock children.
 * APP_CONNECTOR— External service integration (GitHub, LinkedIn, etc.)
 * VAULT_TARGET — Locks until a specific discotiveLearnId is verified in vault.
 * VIDEO_WIDGET — Unlocked by watching N% of a linked YouTube video.
 * JOURNAL      — Daily reflection gate. Unlocked by submitting journal entry.
 *
 * All execution goes through Firebase Cloud Functions (zero client-side secrets).
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

// ── Agentic node type constants ──────────────────────────────────────────────
export const AGENTIC_NODE_TYPES = Object.freeze({
  EXECUTION: "executionNode",
  MILESTONE: "milestoneNode",
  LOGIC_AND: "logicGate",
  LOGIC_OR: "logicGate",
  APP_CONNECTOR: "connectorNode",
  VAULT_TARGET: "assetWidget",
  VIDEO_WIDGET: "videoWidget",
  JOURNAL: "journalNode",
  COMPUTE: "computeNode",
  GROUP: "groupNode",
});

// ── The absolute master JSON schema injected into Gemini ────────────────────
const AGENTIC_JSON_SCHEMA = `
{
  "nodes": [
    {
      "id": "string (unique, e.g. node_001)",
      "type": "executionNode | milestoneNode | logicGate | connectorNode | assetWidget | videoWidget | journalNode | computeNode",
      "position": { "x": 0, "y": 0 },
      "data": {
        "title": "string",
        "subtitle": "string (optional)",
        "desc": "string (1-2 sentences, actionable)",
        "nodeType": "core | branch | sub | milestone",
        "accentColor": "amber | emerald | violet | cyan | rose | orange | sky | white",
        "priorityStatus": "READY | FUTURE | BLOCKED",
        "deadline": "ISO date string (YYYY-MM-DD, must be within mapRange)",
        "xpReward": 0,
        "minimumTimeMinutes": 0,
        "tasks": [
          {
            "id": "string (unique)",
            "text": "string (specific, actionable sub-task)",
            "completed": false,
            "points": 10
          }
        ],
        "tags": ["string"],
        "isCompleted": false,
        "collapsed": false,
        "linkedAssets": [],
        "delegates": [],

        "verificationContract": {
          "type": "HUMAN_PROOF | ADMIN_VAULT | LEARN_ID | APP_WEBHOOK | AUTO_TIME",
          "requiredLearnId": "string | null (only for LEARN_ID type)",
          "minimumWatchPercent": 80,
          "appName": "GitHub | LinkedIn | Calendly | null",
          "webhookPayload": "string | null",
          "scoreReward": 25
        },

        "outputBindings": {
          "onVerified": "UNLOCK_CHILDREN | AWARD_SCORE | TRIGGER_WEBHOOK",
          "onFailed": "BACKOFF_30M | BACKOFF_4H | NOTIFY_ONLY"
        },

        "isUnlocked": false,
        "sprintPhase": "string (e.g. Week 1 | Foundation | Growth)"
      }
    }
  ],
  "edges": [
    {
      "id": "string (unique, e.g. edge_001)",
      "source": "node_id",
      "target": "node_id",
      "type": "neuralEdge",
      "data": {
        "connType": "core-core | core-branch | branch-sub | open",
        "accent": "#hex_color",
        "isRequired": true,
        "logicGateType": "AND | OR | null"
      }
    }
  ]
}
`;

// ── The master system prompt ─────────────────────────────────────────────────
const buildMasterSystemPrompt = (
  userData,
  qaAnswers,
  subscriptionTier,
  learnInventory,
  mapRange,
) => {
  const tier = String(subscriptionTier || "free").toLowerCase();
  const maxNodes = tier === "enterprise" ? 50 : tier === "pro" ? 25 : 10;
  const from = mapRange?.from
    ? new Date(mapRange.from).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Today";
  const to = mapRange?.to
    ? new Date(mapRange.to).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "30 days from now";

  const certInventory = (learnInventory?.certificates || [])
    .slice(0, 8)
    .map(
      (c) =>
        `{ id: "${c.discotiveLearnId}", title: "${c.title}", provider: "${c.provider}", scoreReward: ${c.scoreReward} }`,
    )
    .join("\n    ");

  const videoInventory = (learnInventory?.videos || [])
    .slice(0, 5)
    .map(
      (v) =>
        `{ id: "${v.discotiveLearnId}", title: "${v.title}", youtubeId: "${v.youtubeId}", scoreReward: ${v.scoreReward} }`,
    )
    .join("\n    ");

  return `
SYSTEM IDENTITY: You are an Agentic Workflow Compiler for Discotive. You do NOT generate
to-do lists. You generate executable state machines with strict dependency enforcement,
cryptographic verification contracts, and atomic score mutations.

OPERATOR PROFILE:
  - Domain: ${userData?.identity?.domain || userData?.vision?.passion || "General"}
  - Niche: ${userData?.identity?.niche || userData?.vision?.niche || "Career Growth"}
  - Goal (30d): ${qaAnswers?.[0] || userData?.vision?.goal3Months || "Not specified"}
  - Biggest Blocker: ${qaAnswers?.[1] || "Not specified"}
  - Execution Style: ${qaAnswers?.[2] || "Not specified"}
  - Tier: ${subscriptionTier}
  - Long-term Goal: ${userData?.vision?.longTermGoal || "Not specified"}

SPRINT WINDOW: ${from} → ${to}
MAX NODES: ${maxNodes}
MIN NODES: ${Math.floor(maxNodes * 0.7)}

DISCOTIVE LEARN INVENTORY (VERIFIED CERTIFICATES — use these for LEARN_ID contracts):
    ${certInventory || "None available"}

DISCOTIVE LEARN INVENTORY (CURATED VIDEOS — use these for VIDEO_WIDGET nodes):
    ${videoInventory || "None available"}

ABSOLUTE RULES (violating ANY rule produces an invalid workflow):
1. EVERY node must have a verificationContract. No exceptions.
   - EXECUTION nodes: use "HUMAN_PROOF" (user submits URL/text via Proof of Work panel)
   - MILESTONE nodes: use "AUTO_TIME" (auto-verified when ALL parent edges are VERIFIED)
   - VAULT_TARGET nodes: use "LEARN_ID" with the exact discotiveLearnId from inventory
   - VIDEO_WIDGET nodes: must include minimumWatchPercent: 80
   - APP_CONNECTOR nodes: use "APP_WEBHOOK" with appName set
   - JOURNAL nodes: use "HUMAN_PROOF" (triggered by journal submission)

2. EVERY dependency MUST be modeled as a directed edge. Node B cannot even be
   VISIBLE to the user until Node A is VERIFIED. This is not optional.

3. ZERO floating nodes. Every non-root node must have at least one inbound edge.

4. ALL deadlines MUST fall within the sprint window: ${from} → ${to}

5. Use logicGate nodes (type: "logicGate") to model AND/OR convergences where
   multiple parallel tasks must complete before a milestone unlocks.

6. Use at least 1 VAULT_TARGET or VIDEO_WIDGET node if the Discotive Learn
   Inventory has matching items. Connect it to a relevant EXECUTION branch.

7. xpReward values: EXECUTION=15-30, MILESTONE=50-100, VAULT_TARGET=50,
   VIDEO_WIDGET=25, APP_CONNECTOR=20, JOURNAL=10

8. Group related nodes by sprintPhase (e.g., "Week 1 Foundation", "Week 2 Momentum",
   "Week 3 Proof", "Week 4 Launch")

9. The output MUST be valid parseable JSON. No markdown fences. No commentary.
   Return ONLY the JSON object.

10. positions: x/y values must be reasonable for a left-to-right DAG layout.
    Root nodes at x=0, sequential phases at x=500, x=1000, x=1500, etc.
    Parallel branches offset vertically by 250px per branch.

OUTPUT FORMAT (STRICT — return ONLY this JSON, nothing else):
${AGENTIC_JSON_SCHEMA}
`.trim();
};

// ── Public API: Generate full agentic map ────────────────────────────────────
export const generateAgenticMap = async (
  userData,
  qaAnswers,
  subscriptionTier = "free",
  learnInventory = { certificates: [], videos: [] },
  mapRange = null,
) => {
  const aiGateway = httpsCallable(functions, "discotiveAIGateway");

  const compiledPrompt = Object.entries(qaAnswers)
    .map(([idx, ans]) => `Q${parseInt(idx) + 1}: ${ans}`)
    .join(" | ");

  const res = await aiGateway({
    action: "GENERATE_AGENTIC_MAP",
    payload: {
      userData,
      qaAnswers,
      compiledPrompt,
      subscriptionTier,
      learnInventory,
      mapRange,
      masterSystemPrompt: buildMasterSystemPrompt(
        userData,
        qaAnswers,
        subscriptionTier,
        learnInventory,
        mapRange,
      ),
    },
  });

  const raw = res.data;
  return {
    nodes: raw.nodes || [],
    edges: raw.edges || [],
  };
};

export const generateCalibrationQuestions = async (userData) => {
  const aiGateway = httpsCallable(functions, "discotiveAIGateway");
  const res = await aiGateway({ action: "CALIBRATE", payload: { userData } });
  return res.data;
};

export const generateExpansionQuestions = async (
  userData,
  existingNodes = [],
) => {
  const aiGateway = httpsCallable(functions, "discotiveAIGateway");
  const res = await aiGateway({
    action: "EXPANSION_QUESTIONS",
    payload: { userData, existingNodes },
  });
  return res.data;
};

export const expandAgenticMap = async (payloadArgs) => {
  const aiGateway = httpsCallable(functions, "discotiveAIGateway");
  const res = await aiGateway({ action: "EXPAND", payload: payloadArgs });
  return res.data;
};

export const regenerateAgenticMap = async (payloadArgs) => {
  const aiGateway = httpsCallable(functions, "discotiveAIGateway");
  const res = await aiGateway({ action: "REGENERATE", payload: payloadArgs });
  return res.data;
};

export const validateAgenticWorkflow = (nodes = [], edges = []) => {
  const errors = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => {
    if (!n.data?.verificationContract?.type) {
      errors.push(
        `Node "${n.id}" (${n.data?.title}) missing verificationContract.type`,
      );
    }
  });

  const inboundCounts = {};
  edges.forEach((e) => {
    inboundCounts[e.target] = (inboundCounts[e.target] || 0) + 1;
    if (!nodeIds.has(e.source)) {
      errors.push(
        `Edge "${e.id}" references unknown source node "${e.source}"`,
      );
    }
    if (!nodeIds.has(e.target)) {
      errors.push(
        `Edge "${e.id}" references unknown target node "${e.target}"`,
      );
    }
  });

  const rootNodes = nodes.filter((n) => !inboundCounts[n.id]);
  if (rootNodes.length === 0 && nodes.length > 0) {
    errors.push(
      "Workflow has no root nodes (DAG has a cycle or all nodes have inbound edges)",
    );
  }

  return { valid: errors.length === 0, errors };
};
