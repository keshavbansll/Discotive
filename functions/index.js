/* eslint-env node */

/**
 * @fileoverview Discotive OS - Razorpay Automation Webhook
 * @module Backend/Billing
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { FieldValue } = require("firebase-admin/firestore");

/**
 * GENERATE SUBSCRIPTION API (Raw HTTP / Deterministic)
 */
exports.createProSubscription = functions.https.onRequest(async (req, res) => {
  // 1. MAANG-Grade CORS Enforcement
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle browser preflight checks instantly
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // 2. Extract the Cryptographic Identity
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[SECURITY FAULT] No Bearer token provided by frontend.");
      return res.status(401).json({ error: "Unauthorized Gateway Access." });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;

    // 3. Explicit Verification (This will trap the exact error!)
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (tokenError) {
      console.error(
        "[SECURITY FAULT] Google rejected the identity token. Reason:",
        tokenError,
      );
      return res
        .status(401)
        .json({ error: "Cryptographic identity rejected." });
    }

    const uid = decodedToken.uid;

    // 4. Initialize Razorpay
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 5. Generate Blueprint
    const subscription = await rzp.subscriptions.create({
      plan_id: "plan_SWdp3DusTALjoj",
      total_count: 99,
      customer_notify: 1,
      notes: {
        firebase_uid: uid,
      },
    });

    // 6. Return Payload (Formatted exactly how your frontend expects it)
    return res
      .status(200)
      .json({ result: { subscriptionId: subscription.id } });
  } catch (error) {
    console.error("[SYSTEM FAULT] Subscription execution failed:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * RAZORPAY WEBHOOK
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // PULL SECRET HERE (At runtime)
  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

  const signature = req.headers["x-razorpay-signature"];
  const bodyString = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(bodyString)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.error("[SECURITY FAULT] Invalid Razorpay Signature.");
    return res.status(400).send("Cryptographic signature mismatch.");
  }

  const event = req.body.event;
  const payload = req.body.payload;

  try {
    const userId =
      payload.subscription?.entity?.notes?.firebase_uid ||
      payload.payment?.entity?.notes?.firebase_uid;

    if (!userId) {
      console.error("[DATA FAULT] No Firebase UID attached.");
      return res.status(400).send("Missing Identity Mapping");
    }

    const userRef = db.collection("users").doc(userId);

    switch (event) {
      case "subscription.charged":
      case "subscription.authenticated":
        await userRef.update({
          tier: "PRO",
          proSince: admin.firestore.FieldValue.serverTimestamp(),
          subscriptionId: payload.subscription.entity.id,
        });
        console.log(`[LEDGER UPDATE] User ${userId} upgraded to PRO.`);
        break;

      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.pending":
        await userRef.update({
          tier: "ESSENTIAL",
          subscriptionId: null,
        });
        console.log(`[LEDGER UPDATE] User ${userId} downgraded to ESSENTIAL.`);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event}`);
    }

    res.status(200).send("Webhook executed successfully.");
  } catch (error) {
    console.error("[SYSTEM FAULT] Webhook processing failed:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * @function dailyInactivitySweep (v2 API)
 * @description Enterprise-grade CRON job that runs daily at 11:59 PM IST.
 * Sweeps all users who haven't logged in today and deducts 10 points.
 * Implements chunked batching to bypass Firestore's 500-write limit.
 */
exports.dailyInactivitySweep = onSchedule(
  {
    schedule: "59 23 * * *",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 300,
  },
  async (event) => {
    // 1. MAANG-Grade Time Enforcement (Force IST calculation)
    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const formatter = new Intl.DateTimeFormat("en-CA", options); // en-CA yields YYYY-MM-DD
    const todayStr = formatter.format(new Date());
    const monthStr = todayStr.substring(0, 7);

    const usersRef = db.collection("users");

    // Note: Users who have never logged in (lastLoginDate is null) will NOT be caught by '<'.
    // You must ensure onboarding sets lastLoginDate, which your initGhostUserScore currently handles.
    const snapshot = await usersRef
      .where("discotiveScore.lastLoginDate", "<", todayStr)
      .where("discotiveScore.current", ">", 0)
      .get();

    if (snapshot.empty) {
      console.log("[CRON] No inactive users found for penalty.");
      return;
    }

    console.log(`[CRON] Initiating penalty sweep for ${snapshot.size} users.`);

    // 2. Batch Limit Adjustment (Max 500 writes).
    // Since we write 2 docs per user (User Doc + Log Doc), the safe user limit per batch is 250.
    const USERS_PER_BATCH = 250;
    const batches = [];
    let currentBatch = db.batch();
    let userCount = 0;

    snapshot.docs.forEach((userDoc) => {
      const data = userDoc.data();
      const currentScore = data.discotiveScore?.current || 0;

      const newScore = Math.max(0, currentScore - 10);
      const actualChange = newScore - currentScore;
      if (actualChange === 0) return;

      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Operation A: Update User Ledger
      currentBatch.update(userDoc.ref, {
        "discotiveScore.current": newScore,
        "discotiveScore.streak": 0,
        "discotiveScore.lastAmount": actualChange,
        "discotiveScore.lastReason": "System Penalty - Daily Inactivity",
        "discotiveScore.lastUpdatedAt": FieldValue.serverTimestamp(),
        [`daily_scores.${todayStr}`]: newScore,
        [`monthly_scores.${monthStr}`]: newScore,
      });

      // Operation B: Append to Immutable Audit Trail (DO NOT BYPASS THIS)
      const logRef = userDoc.ref.collection("score_log").doc();
      currentBatch.set(logRef, {
        score: newScore,
        change: actualChange,
        rawAttempt: -10,
        reason: "System Penalty - Daily Inactivity",
        date: new Date().toISOString(), // Standardized UTC for log sorting
        timestamp: FieldValue.serverTimestamp(),
        expireAt: admin.firestore.Timestamp.fromDate(expireAt),
      });

      userCount++;

      if (userCount === USERS_PER_BATCH) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        userCount = 0;
      }
    });

    if (userCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    console.log(
      `[CRON] Inactivity sweep completed. Applied to ${snapshot.size} users.`,
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOTIVE OS: NEURAL GRAPH VERIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const EXPONENTIAL_BACKOFF_MINUTES = [0, 30, 240, 1440]; // 0m, 30m, 4h, 24h

/**
 * @function submitNodeVerification
 * @description Secure HTTP Callable to process Proof-of-Work.
 * Replaces the placeholder random-number verification with a structured
 * Gemini AI evaluation. The AI receives the node's title, description,
 * and declared tasks, then evaluates whether the submitted payload
 * (e.g., a GitHub URL, a written reflection, a deployed link) constitutes
 * credible evidence of completion.
 *
 * State Machine:
 *   ACTIVE → VERIFYING (immediate)
 *   VERIFYING → VERIFIED | VERIFIED_GHOST (on AI pass)
 *   VERIFYING → FAILED_BACKOFF (on AI fail)
 */
exports.submitNodeVerification = functions
  .runWith({ secrets: ["GEMINI_API_KEY"] })
  .https.onCall(async (data, context) => {
    // ── 1. Identity Enforcement ──────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "System lock: Unauthorized access.",
      );
    }

    const uid = context.auth.uid;
    const { nodeId, payload, mapId } = data;

    if (
      !nodeId ||
      !payload ||
      typeof payload !== "string" ||
      payload.trim().length < 5
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid or insufficient payload. A minimum of 5 characters is required.",
      );
    }

    // ── 2. Fetch User Tier and Node Definition ───────────────────────────
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User ledger missing.");
    }

    const userData = userDoc.data();
    const tier = userData?.tier || "ESSENTIAL";
    const isPro = tier === "PRO" || tier === "ENTERPRISE";

    // Fetch the node definition from the user's execution map to give the AI
    // the correct evaluation context.
    const nodeDoc = await userRef.collection("execution_map").doc(nodeId).get();
    const nodeData = nodeDoc.exists ? nodeDoc.data() : null;

    // ── 3. Backoff Enforcement (Before Expensive AI Call) ────────────────
    const reqsRef = userRef.collection("verification_requests");
    const previousFailures = await reqsRef
      .where("nodeId", "==", nodeId)
      .where("status", "==", "FAILED")
      .orderBy("submittedAt", "desc")
      .get();

    const failCount = previousFailures.size;

    if (failCount > 0) {
      const lastFail = previousFailures.docs[0].data();
      const lastFailMs = lastFail.penaltyExpiresAt?.toMillis?.() || 0;
      if (Date.now() < lastFailMs) {
        const minutesLeft = Math.ceil((lastFailMs - Date.now()) / 60000);
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `Backoff active. ${minutesLeft} minutes remaining before resubmission.`,
        );
      }
    }

    // ── 4. Mark as VERIFYING in the database immediately ────────────────
    // This allows the frontend's real-time listener to show the VERIFYING
    // state while the Gemini call is in flight. The UI is now always in sync.
    const attemptDoc = reqsRef.doc();
    const serverTime = admin.firestore.FieldValue.serverTimestamp();

    await attemptDoc.set({
      nodeId,
      mapId: mapId || null,
      payload: payload.trim(),
      status: "VERIFYING",
      submittedAt: serverTime,
    });

    // ── 5. The Actual AI Verification Call ───────────────────────────────
    let isAiVerified = false;
    let aiReasoning = "";

    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Build an evaluation context from the node definition.
      // If the node is not found, the AI evaluates in a general context.
      const nodeContext = nodeData
        ? `
Node Title: "${nodeData.data?.title || "Unknown"}"
Node Description: "${nodeData.data?.desc || "No description provided."}"
Declared Tasks: ${JSON.stringify((nodeData.data?.tasks || []).map((t) => t.text))}
      `.trim()
        : "No specific node context available.";

      const evaluationPrompt = `
You are a strict, impartial technical evaluator for a career execution platform called Discotive.
Your job is to determine if a user's submitted proof of work is credible evidence that they have completed a specific node.

${nodeContext}

User's Submitted Proof:
"${payload.trim()}"

Evaluate strictly. Accept: GitHub repository URLs with relevant code, deployed application URLs, published article links, credential verification links, or a written reflection that demonstrates genuine effort (minimum 50 words with specific details).

Reject: Placeholder text, lorem ipsum, single words, irrelevant links, empty effort, or submissions that clearly do not relate to the node's declared purpose.

Respond with ONLY a valid JSON object in this exact format:
{
  "verified": true | false,
  "reasoning": "One concise sentence explaining the decision."
}
      `.trim();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      isAiVerified = parsed.verified === true;
      aiReasoning = parsed.reasoning || "";
    } catch (aiError) {
      // If Gemini fails, we fail-safe to REJECTED so the system does not
      // accidentally verify incorrect work. Log and surface.
      console.error("[VERIFICATION_AI_FAULT]", aiError);
      await attemptDoc.update({
        status: "FAILED",
        aiError: aiError.message,
        penaltyExpiresAt: null,
      });
      throw new functions.https.HttpsError(
        "internal",
        "AI verification engine unavailable. Please try again in a few minutes.",
      );
    }

    // ── 6. Apply Verdict ─────────────────────────────────────────────────
    if (!isAiVerified) {
      // Exponential backoff calculation.
      const BACKOFF_MINUTES = [0, 30, 240, 1440];
      const backoffIndex = Math.min(failCount, BACKOFF_MINUTES.length - 1);
      const penaltyMinutes = BACKOFF_MINUTES[backoffIndex];
      const penaltyExpiresAt =
        penaltyMinutes > 0
          ? admin.firestore.Timestamp.fromMillis(
              Date.now() + penaltyMinutes * 60000,
            )
          : null;

      await attemptDoc.update({
        status: "FAILED",
        reasoning: aiReasoning,
        penaltyMinutes,
        penaltyExpiresAt,
      });

      return {
        status: "FAILED_BACKOFF",
        penaltyMinutes,
        reasoning: aiReasoning,
        message:
          penaltyMinutes > 0
            ? `Verification failed. Penalty lock active for ${penaltyMinutes} minutes. ${aiReasoning}`
            : `Verification failed. Review your submission and try again. ${aiReasoning}`,
      };
    }

    // ── 7. Success: Apply Ghost State for Free Tier ──────────────────────
    const finalStatus = isPro ? "VERIFIED" : "VERIFIED_GHOST";
    const ghostUnlockTimeMs = isPro ? 0 : Date.now() + 86400000;

    await attemptDoc.update({
      status: finalStatus,
      reasoning: aiReasoning,
      ghostUnlockTimeMs,
    });

    return {
      status: finalStatus,
      ghostUnlockTimeMs,
      reasoning: aiReasoning,
      message: isPro
        ? `Verification complete. ${aiReasoning}`
        : `Verification complete. Propagating through the network (24h delay for free tier). ${aiReasoning}`,
    };
  });

/**
 * @function resolveGhostStates
 * @description Enterprise CRON daemon running hourly.
 * Sweeps the database for Free-tier users whose 24-hour verification delay has expired,
 * automatically upgrading them to fully public verified status.
 */
exports.resolveGhostStates = onSchedule(
  {
    schedule: "0 * * * *", // Runs every hour, exactly on the hour
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 300,
  },
  async (event) => {
    console.log("[CRON] Initiating sweep for expired Ghost States.");
    const nowMs = Date.now();

    // We query globally across all verification_requests using a Collection Group Query
    // NOTE: Requires a Single-Field Index in Firestore on 'status' and 'ghostUnlockTimeMs'
    const ghostSnap = await db
      .collectionGroup("verification_requests")
      .where("status", "==", "VERIFIED_GHOST")
      .where("ghostUnlockTimeMs", "<=", nowMs)
      .limit(500) // Batch limits
      .get();

    if (ghostSnap.empty) {
      console.log("[CRON] No expired ghost states found.");
      return;
    }

    const batch = db.batch();
    let count = 0;

    ghostSnap.forEach((doc) => {
      batch.update(doc.ref, {
        status: "VERIFIED",
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
    });

    await batch.commit();
    console.log(`[CRON] Successfully unlocked ${count} ghost states.`);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOTIVE OS: AI GENERATION GATEWAY (THE FINANCIAL FIREWALL)
// ═══════════════════════════════════════════════════════════════════════════════

// Shared Source of Truth (Mirror of frontend constants.js)
const MAP_LIMITS = Object.freeze({
  free: { auto_nodes: 10, regen_cooldown_days: 30 },
  pro: { auto_nodes: 25, regen_cooldown_days: 14 },
  enterprise: { auto_nodes: 50, regen_cooldown_days: 7 },
});

const getMapLimits = (tier = "free") => {
  const t = String(tier).toLowerCase();
  if (t === "pro") return MAP_LIMITS.pro;
  if (t === "enterprise") return MAP_LIMITS.enterprise;
  return MAP_LIMITS.free;
};

/**
 * @function generateNeuralMap
 * @description Secure HTTP Callable to generate an execution map via Gemini.
 * Strictly enforces Tier limits, Cooldowns, and Node Caps.
 */
exports.generateNeuralMap = functions.https.onCall(async (data, context) => {
  // 1. Absolute Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "System lock: Unauthorized access.",
    );
  }

  const uid = context.auth.uid;
  const { userPrompt, generationType } = data; // "NEW" or "EXPAND"

  if (!userPrompt || userPrompt.length < 10) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Insufficient prompt data.",
    );
  }

  const userRef = db.collection("users").doc(uid);

  // 2. Transactional Ledger Check
  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User ledger missing.");
    }

    const userData = userDoc.data();
    const tier = userData.tier || "ESSENTIAL";
    const limits = getMapLimits(tier);

    // 3. Enforce Cryptographic Cooldowns
    const mapInfo = userData.execution_map_info || {};
    const lastGeneratedMs = mapInfo.lastGeneratedAt?.toMillis() || 0;
    const cooldownMs = limits.regen_cooldown_days * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    if (generationType === "NEW" && nowMs - lastGeneratedMs < cooldownMs) {
      const daysLeft = Math.ceil(
        (cooldownMs - (nowMs - lastGeneratedMs)) / (1000 * 60 * 60 * 24),
      );
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Cooldown active. Wait ${daysLeft} days before generating a new map, or upgrade your tier.`,
      );
    }

    // 4. Enforce Node Generation Caps
    const nodesSnap = await transaction.get(
      userRef.collection("execution_map"),
    );
    const currentAutoNodes = nodesSnap.docs.filter(
      (d) =>
        ![
          "assetWidget",
          "videoWidget",
          "computeNode",
          "logicGate",
          "telemetryNode",
        ].includes(d.data().type),
    ).length;

    // Determine how many nodes the AI should generate based on their remaining capacity
    const availableNodes =
      limits.auto_nodes - (generationType === "EXPAND" ? currentAutoNodes : 0);

    if (availableNodes <= 0) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Map limit reached (${limits.auto_nodes} nodes). Complete existing nodes or upgrade tier.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // 5. THE AI COMPUTE (GEMINI INVOCATION)
    // ════════════════════════════════════════════════════════════════════
    console.log(
      `[AI_GATEWAY] Generating map for ${uid} (Tier: ${tier}). Prompt: ${userPrompt}`,
    );

    let generatedNodes = [];
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // We use gemini-1.5-flash for maximum speed and reliable JSON output
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          // Force Gemini to adhere to our React Flow structure
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: {
                  type: SchemaType.STRING,
                  description: "Unique snake_case ID (e.g., phase_1_react)",
                },
                type: {
                  type: SchemaType.STRING,
                  description:
                    "Must be 'milestoneNode', 'executionNode', or 'logicGate'",
                },
                dependsOn: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description:
                    "Array of parent node IDs that must be completed before this node unlocks.",
                },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING },
                    subtitle: { type: SchemaType.STRING },
                    desc: { type: SchemaType.STRING },
                    nodeType: {
                      type: SchemaType.STRING,
                      description: "Must be 'core' or 'branch'",
                    },
                    minimumTimeMinutes: {
                      type: SchemaType.NUMBER,
                      description:
                        "Realistic minimum time in minutes to complete this task (e.g., 30, 120).",
                    },
                    xpReward: { type: SchemaType.NUMBER },
                    logicType: {
                      type: SchemaType.STRING,
                      description:
                        "Only required if type is logicGate. Either 'AND' or 'OR'.",
                    },
                  },
                  required: ["title", "nodeType"],
                },
              },
              required: ["id", "type", "dependsOn", "data"],
            },
          },
        },
      });

      const systemPrompt = `You are an elite, MAANG-level Career Architect and CTO building a highly technical Directed Acyclic Graph (DAG) execution map. 
      The user prompt is: "${userPrompt}".
      Generate a maximum of ${Math.min(availableNodes, 10)} nodes. 
      Rules:
      1. Create a logical, progressive roadmap.
      2. Use 'milestoneNode' for major phases.
      3. Use 'executionNode' for actionable tasks.
      4. Use 'dependsOn' to create sequential links (e.g. Node B dependsOn Node A).
      5. DO NOT create circular dependencies.
      6. Be ruthlessly professional and technical.`;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();
      generatedNodes = JSON.parse(responseText);
    } catch (aiError) {
      console.error("[AI_COMPUTE_FAULT]", aiError);
      throw new functions.https.HttpsError(
        "internal",
        "Neural compilation failed. The AI engine timed out or produced an invalid sequence.",
      );
    }

    if (!generatedNodes || generatedNodes.length === 0) {
      throw new functions.https.HttpsError(
        "internal",
        "AI generated an empty roadmap. Try a more descriptive prompt.",
      );
    }

    // 6. Write the Generated Map to Firestore (Strictly using the transaction lock)

    // If it's a NEW map, clear the old execution_map subcollection first
    if (generationType === "NEW") {
      nodesSnap.docs.forEach((doc) => {
        transaction.delete(doc.ref); // ✅ CORRECT
      });
    }

    generatedNodes.forEach((nodeObj) => {
      // Ensure Dagre layout default coordinates are injected
      const finalNode = {
        ...nodeObj,
        position: { x: 0, y: 0 },
        data: {
          ...nodeObj.data,
          stateData: { isVerifiedPublic: false, isVerifying: false }, // Enforce locked states
        },
      };

      const docRef = userRef.collection("execution_map").doc(finalNode.id);
      transaction.set(docRef, finalNode); // ✅ CORRECT
    });

    // 7. Update User Telemetry (already correct, but keep it here)
    transaction.update(userRef, {
      "execution_map_info.lastGeneratedAt":
        admin.firestore.FieldValue.serverTimestamp(),
      "execution_map_info.totalNodes":
        generationType === "NEW"
          ? generatedNodes.length
          : currentAutoNodes + generatedNodes.length,
      "execution_map_info.activePrompt": userPrompt,
    });

    // 7. Return the payload to the frontend to handle layout and saving
    return {
      status: "SUCCESS",
      message: "Neural map compiled securely.",
      nodes: generatedNodes,
      edges: [], // Empty for now; frontend routing can handle edge generation if needed
    };
  });
});

/**
 * @function beginNodeExecution
 * @description Sets the startedAtMs timestamp on a node's stateData,
 * transitioning it from ACTIVE → IN_PROGRESS. This is the authoritative
 * server-side timestamp that the graph engine uses to compute the
 * minimum time lock. Using server time prevents client-side clock manipulation.
 */
exports.beginNodeExecution = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Unauthorized.");
  }

  const { nodeId } = data;
  if (!nodeId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Node ID required.",
    );
  }

  const uid = context.auth.uid;
  const nodeRef = db
    .collection("users")
    .doc(uid)
    .collection("execution_map")
    .doc(nodeId);

  const nodeSnap = await nodeRef.get();
  if (!nodeSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Node not found.");
  }

  const nodeData = nodeSnap.data();

  // Prevent re-starting a node that is already in progress or completed.
  if (nodeData?.data?.stateData?.startedAtMs) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Node execution has already been initiated.",
    );
  }

  await nodeRef.update({
    "data.stateData.startedAtMs": Date.now(),
    "data.stateData.isVerifying": false,
    "data.stateData.isVerifiedPublic": false,
    "data.stateData.isVerifiedGhost": false,
  });

  return { status: "IN_PROGRESS", startedAtMs: Date.now() };
});
