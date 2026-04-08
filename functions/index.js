/* eslint-env node */

/**
 * @fileoverview Discotive OS — Cloud Functions (Gen 2)
 * @description Full migration from GCF Gen 1 → Gen 2.
 *
 * KEY CHANGES vs Gen 1:
 *   - onRequest/onCall imported from firebase-functions/v2/https
 *   - onCall handler signature: (request) not (data, context)
 *     → request.data  (was: data)
 *     → request.auth  (was: context.auth)
 *   - Secrets declared in options object, not runWith()
 *   - HttpsError imported directly, not from functions.https
 *   - CORS handled via options.cors on onRequest
 */

const {
  onRequest,
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = require("firebase-admin/firestore");

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE PRO SUBSCRIPTION (HTTP endpoint, called from frontend)
// ─────────────────────────────────────────────────────────────────────────────

exports.createProSubscription = onRequest(
  { cors: true, secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("[SECURITY FAULT] No Bearer token.");
        return res.status(401).json({ error: "Unauthorized Gateway Access." });
      }

      const token = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (tokenError) {
        console.error("[SECURITY FAULT] Token rejected:", tokenError);
        return res
          .status(401)
          .json({ error: "Cryptographic identity rejected." });
      }

      const uid = decodedToken.uid;

      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const subscription = await rzp.subscriptions.create({
        plan_id: "plan_SWdp3DusTALjoj",
        total_count: 99,
        customer_notify: 1,
        notes: { firebase_uid: uid },
      });

      return res
        .status(200)
        .json({ result: { subscriptionId: subscription.id } });
    } catch (error) {
      console.error("[SYSTEM FAULT] Subscription failed:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. RAZORPAY WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

exports.razorpayWebhook = onRequest(
  { cors: false, secrets: ["RAZORPAY_WEBHOOK_SECRET"] },
  async (req, res) => {
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

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
          console.log(`[LEDGER UPDATE] User ${userId} → PRO.`);
          break;

        case "subscription.halted":
        case "subscription.cancelled":
        case "subscription.pending":
          await userRef.update({
            tier: "ESSENTIAL",
            subscriptionId: null,
          });
          console.log(`[LEDGER UPDATE] User ${userId} → ESSENTIAL.`);
          break;

        default:
          console.log(`[WEBHOOK] Unhandled event: ${event}`);
      }

      res.status(200).send("Webhook executed successfully.");
    } catch (error) {
      console.error("[SYSTEM FAULT] Webhook processing failed:", error);
      res.status(500).send("Internal Server Error");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. DAILY INACTIVITY SWEEP (Scheduled, already v2)
// ─────────────────────────────────────────────────────────────────────────────

exports.dailyInactivitySweep = onSchedule(
  {
    schedule: "59 23 * * *",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 300,
  },
  async (event) => {
    // --- 🔴 MAANG-GRADE FIX: FREEZE TIME ---
    // If batch processing crosses midnight, dynamic Date() calls will corrupt the query.
    // We bind the time strictly to the CRON's scheduled invocation.
    const executionTime = event.scheduleTime
      ? new Date(event.scheduleTime)
      : new Date();

    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const todayStr = formatter.format(executionTime);
    const monthStr = todayStr.substring(0, 7);

    const usersRef = db.collection("users");
    // --- 🔴 MAANG-GRADE FIX: ILLEGAL FIRESTORE QUERY ---
    // You cannot have inequalities on both lastLoginDate AND current score.
    const snapshot = await usersRef
      .where("discotiveScore.lastLoginDate", "<", todayStr)
      .get();

    if (snapshot.empty) {
      console.log("[CRON] No inactive users found.");
      return;
    }

    // Filter the > 0 constraint in memory
    const validDocs = snapshot.docs.filter(
      (doc) => (doc.data().discotiveScore?.current || 0) > 0,
    );

    if (validDocs.length === 0) return;

    console.log(`[CRON] Penalty sweep for ${snapshot.size} users.`);

    const USERS_PER_BATCH = 250;
    // --- 🔴 MAANG-GRADE FIX: STAGNANT ECONOMY ---
    // Penalty must outweigh the standard +10 login bonus to enforce consistency.
    const PENALTY_AMOUNT = 15;

    const batches = [];
    let currentBatch = db.batch();
    let userCount = 0;

    snapshot.docs.forEach((userDoc) => {
      const data = userDoc.data();
      const currentScore = data.discotiveScore?.current || 0;
      const newScore = Math.max(0, currentScore - PENALTY_AMOUNT);
      const actualChange = newScore - currentScore;
      if (actualChange === 0) return;

      const expireAt = new Date(executionTime.getTime() + 24 * 60 * 60 * 1000);

      currentBatch.update(userDoc.ref, {
        "discotiveScore.current": newScore,
        "discotiveScore.streak": 0, // Wipe the streak
        "discotiveScore.lastAmount": actualChange,
        "discotiveScore.lastReason": "System Penalty - Inconsistency",
        "discotiveScore.lastUpdatedAt": FieldValue.serverTimestamp(),
        [`daily_scores.${todayStr}`]: newScore,
        [`monthly_scores.${monthStr}`]: newScore,
      });

      const logRef = userDoc.ref.collection("score_log").doc();
      currentBatch.set(logRef, {
        score: newScore,
        change: actualChange,
        rawAttempt: -PENALTY_AMOUNT,
        reason: "System Penalty - Inconsistency",
        date: executionTime.toISOString(),
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

    if (userCount > 0) batches.push(currentBatch.commit());
    await Promise.all(batches);
    console.log(
      `[CRON] Inactivity sweep complete. ${snapshot.size} users penalised.`,
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUBMIT NODE VERIFICATION (Callable → V2)
//    BREAKING CHANGE: handler now receives (request) not (data, context)
// ─────────────────────────────────────────────────────────────────────────────

const EXPONENTIAL_BACKOFF_MINUTES = [0, 30, 240, 1440];

exports.submitNodeVerification = onCall(
  { secrets: ["GEMINI_API_KEY"] },
  async (request) => {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "System lock: Unauthorized access.",
      );
    }

    const uid = request.auth.uid;
    // V2: request.data replaces the old (data) param
    const { nodeId, payload, mapId } = request.data;

    if (
      !nodeId ||
      !payload ||
      typeof payload !== "string" ||
      payload.trim().length < 5
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid or insufficient payload. Minimum 5 characters required.",
      );
    }

    // ── 2. Fetch user + node ─────────────────────────────────────────────────
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User ledger missing.");
    }

    const userData = userDoc.data();
    const tier = userData?.tier || "ESSENTIAL";
    const isPro = tier === "PRO" || tier === "ENTERPRISE";

    const nodeDoc = await userRef.collection("execution_map").doc(nodeId).get();
    const nodeData = nodeDoc.exists ? nodeDoc.data() : null;

    // ── 3. Backoff enforcement ───────────────────────────────────────────────
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
        throw new HttpsError(
          "resource-exhausted",
          `Backoff active. ${minutesLeft} minutes remaining.`,
        );
      }
    }

    // ── 4. Mark as VERIFYING ─────────────────────────────────────────────────
    const attemptDoc = reqsRef.doc();
    await attemptDoc.set({
      nodeId,
      mapId: mapId || null,
      payload: payload.trim(),
      status: "VERIFYING",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── 5. Gemini AI verification ────────────────────────────────────────────
    let isAiVerified = false;
    let aiReasoning = "";

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const nodeContext = nodeData
        ? `
Node Title: "${nodeData.data?.title || "Unknown"}"
Node Description: "${nodeData.data?.desc || "No description."}"
Declared Tasks: ${JSON.stringify((nodeData.data?.tasks || []).map((t) => t.text))}
        `.trim()
        : "No specific node context available.";

      const evaluationPrompt = `
You are a strict, impartial technical evaluator for Discotive career platform.
Determine if the user's submitted proof credibly demonstrates completion of a specific node.

${nodeContext}

User's Proof: "${payload.trim()}"

Accept: GitHub URLs, deployed app URLs, published articles, credential links, or reflections (50+ words with specific details).
Reject: Placeholder text, lorem ipsum, single words, irrelevant links, empty effort.

Respond ONLY with valid JSON:
{ "verified": true | false, "reasoning": "One concise sentence." }
      `.trim();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const parsed = JSON.parse(result.response.text());
      isAiVerified = parsed.verified === true;
      aiReasoning = parsed.reasoning || "";
    } catch (aiError) {
      console.error("[VERIFICATION_AI_FAULT]", aiError);
      await attemptDoc.update({
        status: "FAILED",
        aiError: aiError.message,
        penaltyExpiresAt: null,
      });
      throw new HttpsError(
        "internal",
        "AI verification engine unavailable. Try again in a few minutes.",
      );
    }

    // ── 6. Apply verdict ─────────────────────────────────────────────────────
    if (!isAiVerified) {
      const backoffIndex = Math.min(
        failCount,
        EXPONENTIAL_BACKOFF_MINUTES.length - 1,
      );
      const penaltyMinutes = EXPONENTIAL_BACKOFF_MINUTES[backoffIndex];
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
            ? `Verification failed. Penalty lock ${penaltyMinutes} minutes. ${aiReasoning}`
            : `Verification failed. Review and retry. ${aiReasoning}`,
      };
    }

    // ── 7. Success: ghost state for free tier ────────────────────────────────
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
        : `Verification complete. Propagating (24h delay for free tier). ${aiReasoning}`,
    };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. RESOLVE GHOST STATES (Scheduled, already v2 — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

exports.resolveGhostStates = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 300,
  },
  async (event) => {
    console.log("[CRON] Sweeping expired Ghost States.");
    const nowMs = Date.now();

    const ghostSnap = await db
      .collectionGroup("verification_requests")
      .where("status", "==", "VERIFIED_GHOST")
      .where("ghostUnlockTimeMs", "<=", nowMs)
      .limit(500)
      .get();

    if (ghostSnap.empty) {
      console.log("[CRON] No expired ghost states.");
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
    console.log(`[CRON] Unlocked ${count} ghost states.`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. GENERATE NEURAL MAP (Callable → V2)
// ─────────────────────────────────────────────────────────────────────────────

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

exports.generateNeuralMap = onCall(
  { secrets: ["GEMINI_API_KEY"], timeoutSeconds: 120, memory: "512MiB" },
  async (request) => {
    // ── 1. Auth & Input Validation ───────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "System lock: Unauthorized access.",
      );
    }

    const uid = request.auth.uid;
    const { userPrompt, generationType } = request.data;

    if (!userPrompt || userPrompt.length < 10) {
      throw new HttpsError("invalid-argument", "Insufficient prompt data.");
    }

    const userRef = db.collection("users").doc(uid);
    const mapRef = userRef.collection("execution_map");

    // ── 2. Optimistic State Validation (OUTSIDE Transaction) ──────────────────
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User ledger missing.");
    }

    const userData = userDoc.data();
    const tier = userData.tier || "ESSENTIAL";
    const isAdmin =
      userData.role === "admin" || String(tier).toUpperCase() === "ADMIN";
    const limits = getMapLimits(tier);

    if (!isAdmin && generationType === "EXPAND" && tier === "ESSENTIAL") {
      throw new HttpsError(
        "permission-denied",
        "System Lock: Expansion requires Pro clearance.",
      );
    }

    const mapInfo = userData.execution_map_info || {};
    const lastGeneratedMs = mapInfo.lastGeneratedAt?.toMillis() || 0;
    const cooldownMs = limits.regen_cooldown_days * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    if (
      !isAdmin &&
      generationType === "NEW" &&
      nowMs - lastGeneratedMs < cooldownMs
    ) {
      const daysLeft = Math.ceil(
        (cooldownMs - (nowMs - lastGeneratedMs)) / (1000 * 60 * 60 * 24),
      );
      throw new HttpsError(
        "resource-exhausted",
        `Cooldown active. Wait ${daysLeft} days.`,
      );
    }

    const nodesSnap = await mapRef.get();
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

    const availableNodes =
      limits.auto_nodes - (generationType === "EXPAND" ? currentAutoNodes : 0);

    if (!isAdmin && availableNodes <= 0) {
      throw new HttpsError(
        "resource-exhausted",
        `Map limit reached (${limits.auto_nodes} nodes).`,
      );
    }

    // ── 3. External AI Compute (OUTSIDE Transaction) ──────────────────────────
    console.log(`[AI_GATEWAY] Generating map for ${uid} (Tier: ${tier}).`);
    let generatedNodes = [];

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                dependsOn: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING },
                    subtitle: { type: SchemaType.STRING },
                    desc: { type: SchemaType.STRING },
                    nodeType: { type: SchemaType.STRING },
                    minimumTimeMinutes: { type: SchemaType.NUMBER },
                    xpReward: { type: SchemaType.NUMBER },
                    logicType: { type: SchemaType.STRING },
                  },
                  required: ["title", "nodeType"],
                },
              },
              required: ["id", "type", "dependsOn", "data"],
            },
          },
        },
      });

      const systemPrompt = `You are an elite MAANG-level Career Architect building a DAG execution map.
User prompt: "${userPrompt}".
Generate maximum ${Math.min(availableNodes, 10)} nodes.
Rules: 1) Create logical progressive roadmap. 2) Use milestoneNode for phases, executionNode for tasks. 3) Use dependsOn for sequential links. 4) NO circular dependencies. 5) Be technically precise.`;

      const result = await model.generateContent(systemPrompt);

      // CRITICAL FIX: Use regex extraction to bypass Markdown wrapping crashes
      generatedNodes = extractJSON(result.response.text());
    } catch (aiError) {
      console.error("[AI_COMPUTE_FAULT]", aiError);
      throw new HttpsError(
        "internal",
        `Neural compilation failed: ${aiError.message || "Unknown Engine Fault"}`,
      );
    }

    if (
      !generatedNodes ||
      !Array.isArray(generatedNodes) ||
      generatedNodes.length === 0
    ) {
      throw new HttpsError(
        "internal",
        "AI generated an empty or malformed roadmap DAG.",
      );
    }

    // ── 4. ACID Database Commit (Fast, local IO only) ─────────────────────────
    await db.runTransaction(async (transaction) => {
      // Re-verify cooldown in case of concurrent execution
      const freshDoc = await transaction.get(userRef);
      const freshInfo = freshDoc.data().execution_map_info || {};
      if (
        generationType === "NEW" &&
        Date.now() - (freshInfo.lastGeneratedAt?.toMillis() || 0) < cooldownMs
      ) {
        throw new HttpsError(
          "aborted",
          "Race condition prevented: Cooldown lock triggered.",
        );
      }

      // Wipe old nodes if generating anew
      if (generationType === "NEW") {
        nodesSnap.docs.forEach((doc) => transaction.delete(doc.ref));
      }

      // Inject new nodes into transaction
      generatedNodes.forEach((nodeObj) => {
        const finalNode = {
          ...nodeObj,
          position: { x: 0, y: 0 },
          data: {
            ...nodeObj.data,
            stateData: { isVerifiedPublic: false, isVerifying: false },
          },
        };
        transaction.set(mapRef.doc(finalNode.id), finalNode);
      });

      // Update Ledger
      transaction.update(userRef, {
        "execution_map_info.lastGeneratedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        "execution_map_info.totalNodes":
          generationType === "NEW"
            ? generatedNodes.length
            : currentAutoNodes + generatedNodes.length,
        "execution_map_info.activePrompt": userPrompt,
      });
    });

    return {
      status: "SUCCESS",
      message: "Neural map compiled securely.",
      nodes: generatedNodes,
      edges: [],
    };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. BEGIN NODE EXECUTION (Callable → V2)
// ─────────────────────────────────────────────────────────────────────────────

exports.beginNodeExecution = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Unauthorized.");
  }

  const { nodeId } = request.data; // V2: request.data

  if (!nodeId) {
    throw new HttpsError("invalid-argument", "Node ID required.");
  }

  const uid = request.auth.uid; // V2: request.auth
  const nodeRef = db
    .collection("users")
    .doc(uid)
    .collection("execution_map")
    .doc(nodeId);

  const nodeSnap = await nodeRef.get();
  if (!nodeSnap.exists) {
    throw new HttpsError("not-found", "Node not found.");
  }

  const nodeData = nodeSnap.data();

  if (nodeData?.data?.stateData?.startedAtMs) {
    throw new HttpsError("already-exists", "Node execution already initiated.");
  }

  const startedAtMs = Date.now();

  await nodeRef.update({
    "data.stateData.startedAtMs": startedAtMs,
    "data.stateData.isVerifying": false,
    "data.stateData.isVerifiedPublic": false,
    "data.stateData.isVerifiedGhost": false,
  });

  return { status: "IN_PROGRESS", startedAtMs };
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DAILY CLOSED TICKET SWEEP — Auto-deletes tickets 48h after closing
//    Zero user-visible cost. Runs at 12:30 AM IST daily.
// ─────────────────────────────────────────────────────────────────────────────

exports.dailyClosedTicketSweep = onSchedule(
  {
    schedule: "30 0 * * *",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 120,
  },
  async (event) => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const snap = await db
      .collection("support_tickets")
      .where("status", "==", "closed")
      .where("deleteAt.seconds", "<=", nowSeconds)
      .limit(500)
      .get();

    if (snap.empty) {
      console.log("[CRON] No expired closed tickets.");
      return;
    }

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`[CRON] Auto-deleted ${snap.size} closed support tickets.`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// DAILY PERCENTILE COMPUTE — Prevents $60/day client-side read catastrophe
// ─────────────────────────────────────────────────────────────────────────────
exports.dailyPercentileCompute = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    memory: "1GiB", // CRITICAL: Allocate memory for array sorting
    timeoutSeconds: 540, // Max execution time for large datasets
  },
  async () => {
    // Only fetch exactly what we need to sort to save memory
    const usersSnap = await db
      .collection("users")
      .where("onboardingComplete", "==", true)
      .select("discotiveScore.current")
      .get();

    if (usersSnap.empty) return;

    // Sort users by score descending
    const scores = usersSnap.docs
      .map((d) => ({
        uid: d.id,
        score: d.data().discotiveScore?.current || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const totalUsers = scores.length;

    // MAANG-GRADE: Firestore batches fail at 500. We chunk at 450 to be safe.
    const BATCH_SIZE = 450;

    for (let i = 0; i < totalUsers; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = scores.slice(i, i + BATCH_SIZE);

      chunk.forEach((user, chunkIdx) => {
        const globalRank = i + chunkIdx + 1;
        // Top 1%, Top 5%, etc. (Math.max prevents 0%)
        const globalPercentile = Math.max(
          1,
          Math.ceil((globalRank / totalUsers) * 100),
        );

        batch.update(db.collection("users").doc(user.uid), {
          "precomputed.globalRank": globalRank,
          "precomputed.globalPercentile": globalPercentile,
          "precomputed.totalNetwork": totalUsers,
          "precomputed.rankUpdatedAt":
            admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Await each chunk to prevent overwhelming the Firebase connection pool
      await batch.commit();
    }

    console.log(
      `[CRON] Percentiles successfully precomputed for ${totalUsers} operators.`,
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. SECURE FORM INGESTION GATEWAY (Sanitized Writes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enterprise-grade server-side string sanitizer.
 * Strips HTML tags and executable script attributes.
 */
const sanitizePayload = (raw) => {
  if (typeof raw !== "string") return raw;
  return raw
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, 5000) // Hard cap to prevent database bloat attacks
    .trim();
};

exports.submitSupportTicket = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized.");

  const { category, subject, message, priority } = request.data;
  if (!subject || !message)
    throw new HttpsError("invalid-argument", "Missing required fields.");

  const ticketData = {
    uid: request.auth.uid,
    category: sanitizePayload(category),
    subject: sanitizePayload(subject),
    message: sanitizePayload(message),
    priority: sanitizePayload(priority || "normal"),
    status: "open",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("support_tickets").add(ticketData);
  return { status: "SUCCESS", id: docRef.id };
});

exports.submitUserReport = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized.");

  const { targetType, targetId, reason, description } = request.data;

  const reportData = {
    reporterUid: request.auth.uid,
    targetType: sanitizePayload(targetType),
    targetId: sanitizePayload(targetId),
    reason: sanitizePayload(reason),
    description: sanitizePayload(description),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("reports").add(reportData);
  return { status: "SUCCESS", id: docRef.id };
});

exports.submitFeedback = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized.");

  const { rating, recommendation, comments } = request.data;

  const feedbackData = {
    uid: request.auth.uid,
    rating: typeof rating === "number" ? rating : 0,
    recommendation: sanitizePayload(recommendation),
    comments: sanitizePayload(comments),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Feedback uses setDoc with merge to ensure only 1 doc per user
  await db
    .collection("feedback")
    .doc(request.auth.uid)
    .set(feedbackData, { merge: true });
  return { status: "SUCCESS" };
});
// ─────────────────────────────────────────────────────────────────────────────
// 11. SECURE AI GATEWAY (Gemini 2.5 Flash)
// ─────────────────────────────────────────────────────────────────────────────

// Utility functions moved from frontend
const extractJSON = (text) => {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no parseable JSON.");
  return JSON.parse(match[0]);
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

exports.discotiveAIGateway = onCall(
  {
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 540,
    memory: "1GB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Unauthorized AI access.");
    }

    const { action, payload } = request.data;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
      let prompt = "";
      let result;

      switch (action) {
        // ---------------------------------------------------------------------
        case "CALIBRATE": {
          prompt = `
SYSTEM: You are an elite Agentic Workflow Architect building a career execution map.
OPERATOR CONTEXT:
- Domain: ${payload.userData?.vision?.passion || payload.userData?.identity?.domain || "General"}
- Niche: ${payload.userData?.vision?.niche || payload.userData?.identity?.niche || "Career Growth"}
- Skills: ${JSON.stringify(payload.userData?.skills?.alignedSkills || [])}
- Goal: ${payload.userData?.vision?.goal3Months || "Not specified"}

Generate EXACTLY 3 calibration questions to personalise their 30-day execution map.
Q1 (text): Ask for their single most important 30-day target.
Q2 (mcq):  Ask what their biggest blocker is right now (4 options).
Q3 (mcq):  Ask their current execution style (4 options).

RETURN ONLY a JSON array. Format: [{"id":"q1","type":"text","question":"..."},{"id":"q2","type":"mcq","question":"...","options":["A","B","C","D"]}]
          `.trim();
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });
          return extractJSON(result.response.text());
        }

        // ---------------------------------------------------------------------
        case "GENERATE_MAP": {
          const {
            userData,
            qaAnswers,
            subscriptionTier,
            learnInventory,
            mapRange,
          } = payload;
          const limits = getMapLimits(subscriptionTier || "free"); // Uses the helper already defined in your index.js
          const maxNodes = limits.auto_nodes;
          const rangeStr = mapRange
            ? `${fmtDate(mapRange.from)} → ${fmtDate(mapRange.to)}`
            : "Next 30 days";

          prompt = `
SYSTEM: You are a Graph Database Compiler for the Discotive Career Engine.
Output a visual execution DAG (Directed Acyclic Graph) for exactly the period: ${rangeStr}.

STRICT RULES:
1. Generate EXACTLY ${Math.floor(maxNodes * 0.7)}–${maxNodes} execution/milestone nodes total.
2. ALL deadlines MUST fall within: ${rangeStr}. No exceptions.
3. ZERO floating nodes — every node must be connected.
4. Chronological spine: core nodes = sequential milestones across the 30 days.

OPERATOR CONTEXT:
Domain:  ${userData?.vision?.passion || userData?.identity?.domain || "General"}
Niche:   ${userData?.vision?.niche || userData?.identity?.niche || "General"}
Skills:  ${JSON.stringify((userData?.skills?.alignedSkills || []).slice(0, 8))}
Goal30d: ${qaAnswers?.[0] || userData?.vision?.goal3Months || "Not specified"}
Blocker: ${qaAnswers?.[1] || "Not specified"}
Style:   ${qaAnswers?.[2] || "Not specified"}

DISCOTIVE LEARN INVENTORY:
Videos:       ${JSON.stringify((learnInventory?.videos || []).slice(0, 6))}
Certificates: ${JSON.stringify((learnInventory?.certificates || []).slice(0, 6))}

NODE SCHEMA:
executionNode: { id, type:"executionNode", position:{x,y}, data: { title, subtitle, desc, deadline, priorityStatus:"READY"|"FUTURE", nodeType:"core"|"branch"|"milestone", accentColor:"amber", tags:[], tasks:[{id,text,completed:false,points:10}], isCompleted:false, linkedAssets:[], delegates:[], collapsed:false } }
milestoneNode: { id, type:"milestoneNode", position:{x,y}, data:{ title, subtitle, xpReward:50, isUnlocked:false } }
edges: [{ id, source, target, type:"neuralEdge", data:{connType:"core-core"|"core-branch"|"branch-sub"} }]

RETURN FORMAT: JSON ONLY { "nodes": [...], "edges": [...] }
          `.trim();
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });
          const parsed = extractJSON(result.response.text());
          return Array.isArray(parsed)
            ? { nodes: parsed, edges: [] }
            : { nodes: parsed.nodes || [], edges: parsed.edges || [] };
        }

        // ---------------------------------------------------------------------
        case "EXPANSION_QUESTIONS": {
          const { userData, existingNodes } = payload;
          const completedTitles = (existingNodes || [])
            .filter((n) => n.data?.isCompleted)
            .map((n) => n.data?.title)
            .filter(Boolean)
            .slice(0, 5);
          const pendingTitles = (existingNodes || [])
            .filter((n) => !n.data?.isCompleted && n.type === "executionNode")
            .map((n) => n.data?.title)
            .filter(Boolean)
            .slice(0, 5);

          prompt = `
SYSTEM: You are a career coach extending an operator's 30-day execution map.
Domain:    ${userData?.vision?.passion || userData?.identity?.domain || "General"}
Completed: ${completedTitles.join(", ") || "Nothing yet"}
Pending:   ${pendingTitles.join(", ") || "None"}

Generate EXACTLY 3 questions for expanding their map.
Q1 (mcq): What should the next phase focus on? (4 options)
Q2 (mcq): What's the biggest challenge going into the next phase? (4 options)
Q3 (text): What specific outcome do you want from the next batch of nodes?

RETURN ONLY a JSON array. Format: [{"id":"eq1","type":"mcq","question":"...","options":["A","B","C","D"]},{"id":"eq3","type":"text","question":"..."}]
          `.trim();
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });
          return extractJSON(result.response.text());
        }

        // ---------------------------------------------------------------------
        case "EXPAND": {
          const {
            userData,
            expansionAnswers,
            existingNodes,
            subscriptionTier,
            expansionRange,
            lastNodeId,
          } = payload;
          const limits = getMapLimits(subscriptionTier || "free");
          const maxNew = Math.floor(limits.auto_nodes * 0.5);
          const rangeStr = expansionRange
            ? `${fmtDate(expansionRange.from)} → ${fmtDate(expansionRange.to)}`
            : "Next 30 days";
          const existingSummary = (existingNodes || [])
            .filter(
              (n) => n.type === "executionNode" || n.type === "milestoneNode",
            )
            .map(
              (n) =>
                `${n.data?.title || "?"} (${n.data?.isCompleted ? "done" : "pending"})`,
            )
            .join(", ");

          prompt = `
SYSTEM: You are extending an existing execution map DAG with continuation nodes.
PERIOD FOR NEW NODES: ${rangeStr}
EXISTING MAP SUMMARY: ${existingSummary || "None"}
LAST NODE ID TO CONNECT FROM: ${lastNodeId}

EXPANSION CONTEXT:
Next focus: ${expansionAnswers?.[0] || "Not specified"}
Challenge:  ${expansionAnswers?.[1] || "Not specified"}
Target:     ${expansionAnswers?.[2] || "Not specified"}

Generate EXACTLY ${Math.floor(maxNew * 0.7)}–${maxNew} NEW execution/milestone nodes.
The FIRST new node MUST connect FROM: ${lastNodeId}. Do NOT modify existing nodes.
Use standard JSON return format { "nodes": [...], "edges": [...] }
          `.trim();
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });
          const parsed = extractJSON(result.response.text());
          return Array.isArray(parsed)
            ? { nodes: parsed, edges: [] }
            : { nodes: parsed.nodes || [], edges: parsed.edges || [] };
        }

        // ---------------------------------------------------------------------
        case "REGENERATE": {
          const {
            userData,
            calibrationAnswers,
            specificInstruction,
            preservedNodes,
            preservedEdges,
            subscriptionTier,
            mapRange,
            learnInventory,
          } = payload;
          const limits = getMapLimits(subscriptionTier || "free");
          const maxNodes = limits.auto_nodes;
          const rangeStr = mapRange
            ? `${fmtDate(mapRange.from)} → ${fmtDate(mapRange.to)}`
            : "Next 30 days";

          const safePreserved = preservedNodes || [];
          const preservedSummary = safePreserved
            .map(
              (n) => `"${n.data?.title || "?"}" (ID: ${n.id}, type: ${n.type})`,
            )
            .join("\n");
          const preservedIds = safePreserved.map((n) => n.id).join(", ");

          prompt = `
SYSTEM: You are regenerating a Discotive execution map DAG for the period: ${rangeStr}.

STRICT RULES:
1. Do NOT include or modify these PRESERVED nodes:
   ${preservedSummary || "None"}
2. Generate ${Math.floor(maxNodes * 0.7)}–${maxNodes} NEW nodes. ALL new node deadlines MUST be within: ${rangeStr}.
3. Connect your new nodes to the preserved nodes where logical. Do NOT use IDs: ${preservedIds || "none"}

OPERATOR CONTEXT:
Domain:  ${userData?.vision?.passion || userData?.identity?.domain || "General"}
Goal:    ${calibrationAnswers?.[0] || "Not specified"}
Blocker: ${calibrationAnswers?.[1] || "Not specified"}
Style:   ${calibrationAnswers?.[2] || "Not specified"}
Specific instruction: ${specificInstruction || "None"}

RETURN FORMAT: JSON ONLY { "nodes": [...NEW nodes only], "edges": [...edges for new nodes] }
          `.trim();
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });
          const parsed = extractJSON(result.response.text());
          const newNodes = Array.isArray(parsed) ? parsed : parsed.nodes || [];
          const newEdges = Array.isArray(parsed) ? [] : parsed.edges || [];
          return {
            nodes: [...safePreserved, ...newNodes],
            edges: [...(preservedEdges || []), ...newEdges],
          };
        }

        // ---------------------------------------------------------------------
        case "GRACE_CHAT": {
          const { name, userData, text } = payload;
          const systemContext = `You are Grace, Discotive's AI career assistant. Discotive is a unified career engine for students and young professionals — it has an Execution Map (ReactFlow DAG), a Vault for credential proof-of-work, a Leaderboard with scoring, and a Pro tier.
User: ${name || "Operator"}
Domain: ${userData?.identity?.domain || userData?.vision?.passion || "Not set"}
Score: ${userData?.discotiveScore?.current || 0}
Answer concisely (max 3 sentences). Be direct, helpful, and encouraging. Don't make up features that don't exist. If unsure, suggest contacting support at discotive@gmail.com.`;

          result = await model.generateContent(
            `${systemContext}\n\nUser question: ${text}`,
          );
          // Grace expects a raw text string back, not JSON
          return { text: result.response.text() };
        }

        default:
          throw new HttpsError(
            "invalid-argument",
            "Unknown AI action requested.",
          );
      }
    } catch (err) {
      console.error("[AIGateway] Engine fault:", err);
      throw new HttpsError("internal", "AI Engine failed to process request.");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 12. EDGE INJECTION PROXY (SEO & OpenGraph for Vercel/Social Bots)
// ─────────────────────────────────────────────────────────────────────────────

exports.renderPublicProfile = onRequest(
  { timeoutSeconds: 15, memory: "256MiB" },
  async (req, res) => {
    try {
      const handle = req.query.handle;
      if (!handle) return res.status(400).send("Missing handle parameter");

      // 1. Fetch the live frontend shell to guarantee correct Vite asset hashes
      // Replace this URL with your actual production Vercel domain once deployed
      const frontendUrl =
        process.env.FRONTEND_URL || "https://www.discotive.in";
      const shellResponse = await fetch(`${frontendUrl}/index.html`);
      let html = await shellResponse.text();

      // 2. Query the user via Admin SDK (bypasses Firestore client rules safely)
      const usersSnap = await db
        .collection("users")
        .where("identity.username", "==", handle)
        .limit(1)
        .get();

      if (usersSnap.empty) {
        html = html.replace(
          /<title>.*?<\/title>/i,
          "<title>Operator Not Found | Discotive</title>",
        );
        return res.status(200).send(html);
      }

      const userData = usersSnap.docs[0].data();

      // 3. Privacy Gate
      if (userData.settings?.publicProfile === false) {
        html = html.replace(
          /<title>.*?<\/title>/i,
          "<title>Profile Private | Discotive</title>",
        );
        return res.status(200).send(html);
      }

      // 4. Construct dynamic metadata
      const name =
        `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
        handle;
      const score = userData.discotiveScore?.current || 0;
      const title = `${name} | Discotive Verified Operator`;
      const desc = `View ${name}'s verified career execution map, vault proofs, and Discotive score (${score.toLocaleString()} pts).`;

      // 5. Inject into the HTML string payload
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(
        /<meta name="title" content=".*?"\s*\/>/gi,
        `<meta name="title" content="${title}" />`,
      );
      html = html.replace(
        /<meta name="description" content=".*?"\s*\/>/gi,
        `<meta name="description" content="${desc}" />`,
      );
      html = html.replace(
        /<meta property="og:title" content=".*?"\s*\/>/gi,
        `<meta property="og:title" content="${title}" />`,
      );
      html = html.replace(
        /<meta property="og:description" content=".*?"\s*\/>/gi,
        `<meta property="og:description" content="${desc}" />`,
      );
      html = html.replace(
        /<meta property="twitter:title" content=".*?"\s*\/>/gi,
        `<meta property="twitter:title" content="${title}" />`,
      );
      html = html.replace(
        /<meta property="twitter:description" content=".*?"\s*\/>/gi,
        `<meta property="twitter:description" content="${desc}" />`,
      );

      // Serve the fully hydrated app shell. Cache it heavily at the edge CDN.
      res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
      res.status(200).send(html);
    } catch (err) {
      console.error("[SEO Proxy Fault]", err);
      res.status(500).send("System Fault");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. SECURE PUBLIC PROFILE FETCH (Bypasses Auth Rules safely)
// ─────────────────────────────────────────────────────────────────────────────

exports.getPublicProfileData = onCall(async (request) => {
  const { handle } = request.data;
  if (!handle) throw new HttpsError("invalid-argument", "Handle required.");

  try {
    // 1. Query the user
    const usersSnap = await db
      .collection("users")
      .where("identity.username", "==", handle)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      throw new HttpsError("not-found", "Operator not found.");
    }

    const targetDoc = usersSnap.docs[0];
    const userData = targetDoc.data();

    // 2. Enforce Privacy Gate
    if (userData.settings?.publicProfile === false) {
      throw new HttpsError("permission-denied", "This profile is private.");
    }

    // 3. Compute Rank Server-Side
    const score = userData.discotiveScore?.current || 0;
    const rankSnap = await db
      .collection("users")
      .where("discotiveScore.current", ">", score)
      .count()
      .get();

    const rank = rankSnap.data().count + 1;

    // 4. Strip sensitive data (email, exact DOB, billing info)
    return {
      id: targetDoc.id,
      identity: {
        firstName: userData.identity?.firstName,
        lastName: userData.identity?.lastName,
        username: userData.identity?.username,
        domain: userData.identity?.domain,
        niche: userData.identity?.niche,
        country: userData.identity?.country,
        gender: userData.identity?.gender,
      },
      vision: userData.vision || {},
      skills: userData.skills || {},
      baseline: userData.baseline || {},
      footprint: userData.footprint || {},
      links: userData.links || {},
      discotiveScore: userData.discotiveScore || {},
      // Only return strictly verified assets
      vault: (userData.vault || []).filter((a) => a.status === "VERIFIED"),
      profileViews: userData.profileViews || 0,
      tier: userData.tier || "ESSENTIAL",
      alliesCount: (userData.allies || []).length,
      rank: rank,
    };
  } catch (err) {
    console.error("[getPublicProfileData] Fault:", err);
    throw new HttpsError("internal", err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. GDPR DATA EXPORT (Complete Payload)
// ─────────────────────────────────────────────────────────────────────────────

exports.exportUserData = onCall(
  { timeoutSeconds: 120, memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Unauthorized.");
    }
    const uid = request.auth.uid;

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User ledger missing.");
      }

      // Initialize the compliance payload
      const exportData = {
        account: userDoc.data(),
        execution_map: [],
        journal_entries: [],
        score_log: [],
        verification_requests: [],
        support_tickets: [],
        feedback: null,
        reports: [],
      };

      // Fetch Subcollections concurrently
      const [mapSnap, journalSnap, scoreSnap, verifySnap] = await Promise.all([
        userRef.collection("execution_map").get(),
        userRef.collection("journal_entries").get(),
        userRef.collection("score_log").get(),
        userRef.collection("verification_requests").get(),
      ]);

      mapSnap.forEach((doc) =>
        exportData.execution_map.push({ id: doc.id, ...doc.data() }),
      );
      journalSnap.forEach((doc) =>
        exportData.journal_entries.push({ id: doc.id, ...doc.data() }),
      );
      scoreSnap.forEach((doc) =>
        exportData.score_log.push({ id: doc.id, ...doc.data() }),
      );
      verifySnap.forEach((doc) =>
        exportData.verification_requests.push({ id: doc.id, ...doc.data() }),
      );

      // Fetch external collections tied to the user concurrently
      const [ticketsSnap, feedbackDoc, reportsSnap] = await Promise.all([
        db.collection("support_tickets").where("uid", "==", uid).get(),
        db.collection("feedback").doc(uid).get(),
        db.collection("reports").where("reporterUid", "==", uid).get(),
      ]);

      ticketsSnap.forEach((doc) =>
        exportData.support_tickets.push({ id: doc.id, ...doc.data() }),
      );
      if (feedbackDoc.exists) {
        exportData.feedback = { id: feedbackDoc.id, ...feedbackDoc.data() };
      }
      reportsSnap.forEach((doc) =>
        exportData.reports.push({ id: doc.id, ...doc.data() }),
      );

      return exportData;
    } catch (error) {
      console.error(
        "[GDPR Export] Compilation failed for operator:",
        uid,
        error,
      );
      throw new HttpsError("internal", "Failed to compile compliance payload.");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 15. EMAIL VERIFICATION SYSTEM (Resend)
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require("resend");

exports.sendVerificationEmail = onCall(
  { secrets: ["RESEND_API_KEY"], timeoutSeconds: 30 },
  async (request) => {
    const { email, firstName } = request.data;
    if (!email) throw new HttpsError("invalid-argument", "Email required.");

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Firestore using the EMAIL as the document ID
    await db.collection("email_verifications").doc(email).set({
      otp,
      email,
      expiresAt,
      verified: false,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Discotive OS <onboarding@discotive.in>",
      reply_to: "discotive@gmail.com",
      to: email,
      subject: "Verify your identity — Discotive OS",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your identity</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Poppins:wght@400;500;600&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #030303;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #F5F0E8;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030303; font-family: 'Poppins', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: #F5F0E8;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030303; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%; background-color: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6);">
          
          <tr>
            <td align="center" style="padding: 40px 30px 10px 30px;">
              <span style="font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: 0.15em; color: #F5F0E8;">DISCOTIVE</span>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 20px 40px;">
              <h1 style="margin: 0 0 16px 0; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 24px; color: #F5F0E8; letter-spacing: -0.02em;">Identity Verification</h1>
              <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: rgba(245,240,232,0.6); font-weight: 400;">
                Welcome to the system, ${firstName || "Operator"}. To initialize your OS and secure your account, please enter the following 6-digit code.
              </p>

              <table border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; border: 1px solid rgba(191,162,100,0.28); border-radius: 16px; padding: 20px 32px;">
                <tr>
                  <td align="center">
                    <span style="font-family: 'Montserrat', monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #D4AF78;">${otp}</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0 0; font-size: 12px; color: rgba(245,240,232,0.4);">
                This code expires in 10 minutes.<br>If you didn't request this, you can safely ignore this transmission.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 40px;">
              <div style="height: 1px; width: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);"></div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 24px 40px 40px 40px;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(191,162,100,0.5); font-weight: 600;">
                Built by operators. For operators.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 10px; color: rgba(245,240,232,0.3);">
                © 2026 Discotive. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    return { status: "SENT" };
  },
);

exports.verifyEmailOTP = onCall(async (request) => {
  // Now expecting email to be passed from the frontend
  const { otp, email } = request.data;

  if (!otp) throw new HttpsError("invalid-argument", "OTP required.");
  if (!email) throw new HttpsError("invalid-argument", "Email required.");

  // Look up by email instead of UID
  const verRef = db.collection("email_verifications").doc(email);
  const verDoc = await verRef.get();

  if (!verDoc.exists) {
    throw new HttpsError(
      "not-found",
      "No verification request found. Request a new code.",
    );
  }

  const data = verDoc.data();

  // Check attempts (max 5)
  if (data.attempts >= 5) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many attempts. Request a new code.",
    );
  }

  // Check expiry
  if (Date.now() > data.expiresAt) {
    throw new HttpsError(
      "deadline-exceeded",
      "Code expired. Request a new one.",
    );
  }

  // Increment attempts first (anti-brute-force)
  await verRef.update({ attempts: admin.firestore.FieldValue.increment(1) });

  if (data.otp !== otp) {
    throw new HttpsError(
      "unauthenticated",
      "Invalid code. Check and try again.",
    );
  }

  // Mark verified
  await verRef.update({ verified: true });

  return { status: "VERIFIED" };
});
