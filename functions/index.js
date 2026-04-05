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
// 3. DAILY INACTIVITY SWEEP (Scheduled, already v2 — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

exports.dailyInactivitySweep = onSchedule(
  {
    schedule: "59 23 * * *",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 300,
  },
  async (event) => {
    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const todayStr = formatter.format(new Date());
    const monthStr = todayStr.substring(0, 7);

    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("discotiveScore.lastLoginDate", "<", todayStr)
      .where("discotiveScore.current", ">", 0)
      .get();

    if (snapshot.empty) {
      console.log("[CRON] No inactive users found.");
      return;
    }

    console.log(`[CRON] Penalty sweep for ${snapshot.size} users.`);

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

      currentBatch.update(userDoc.ref, {
        "discotiveScore.current": newScore,
        "discotiveScore.streak": 0,
        "discotiveScore.lastAmount": actualChange,
        "discotiveScore.lastReason": "System Penalty - Daily Inactivity",
        "discotiveScore.lastUpdatedAt": FieldValue.serverTimestamp(),
        [`daily_scores.${todayStr}`]: newScore,
        [`monthly_scores.${monthStr}`]: newScore,
      });

      const logRef = userDoc.ref.collection("score_log").doc();
      currentBatch.set(logRef, {
        score: newScore,
        change: actualChange,
        rawAttempt: -10,
        reason: "System Penalty - Daily Inactivity",
        date: new Date().toISOString(),
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
  { secrets: ["GEMINI_API_KEY"] },
  async (request) => {
    // V2: request.auth and request.data
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

    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User ledger missing.");
      }

      const userData = userDoc.data();
      const tier = userData.tier || "ESSENTIAL";
      const limits = getMapLimits(tier);

      // Cooldown enforcement
      const mapInfo = userData.execution_map_info || {};
      const lastGeneratedMs = mapInfo.lastGeneratedAt?.toMillis() || 0;
      const cooldownMs = limits.regen_cooldown_days * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      if (generationType === "NEW" && nowMs - lastGeneratedMs < cooldownMs) {
        const daysLeft = Math.ceil(
          (cooldownMs - (nowMs - lastGeneratedMs)) / (1000 * 60 * 60 * 24),
        );
        throw new HttpsError(
          "resource-exhausted",
          `Cooldown active. Wait ${daysLeft} days or upgrade tier.`,
        );
      }

      // Node cap enforcement
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

      const availableNodes =
        limits.auto_nodes -
        (generationType === "EXPAND" ? currentAutoNodes : 0);

      if (availableNodes <= 0) {
        throw new HttpsError(
          "resource-exhausted",
          `Map limit reached (${limits.auto_nodes} nodes). Complete existing or upgrade.`,
        );
      }

      // Gemini AI call
      console.log(`[AI_GATEWAY] Generating map for ${uid} (Tier: ${tier}).`);
      let generatedNodes = [];

      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
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
        generatedNodes = JSON.parse(result.response.text());
      } catch (aiError) {
        console.error("[AI_COMPUTE_FAULT]", aiError);
        throw new HttpsError(
          "internal",
          "Neural compilation failed. Try again.",
        );
      }

      if (!generatedNodes || generatedNodes.length === 0) {
        throw new HttpsError(
          "internal",
          "AI generated empty roadmap. Use a more descriptive prompt.",
        );
      }

      // Write to Firestore
      if (generationType === "NEW") {
        nodesSnap.docs.forEach((doc) => transaction.delete(doc.ref));
      }

      generatedNodes.forEach((nodeObj) => {
        const finalNode = {
          ...nodeObj,
          position: { x: 0, y: 0 },
          data: {
            ...nodeObj.data,
            stateData: { isVerifiedPublic: false, isVerifying: false },
          },
        };
        transaction.set(
          userRef.collection("execution_map").doc(finalNode.id),
          finalNode,
        );
      });

      transaction.update(userRef, {
        "execution_map_info.lastGeneratedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        "execution_map_info.totalNodes":
          generationType === "NEW"
            ? generatedNodes.length
            : currentAutoNodes + generatedNodes.length,
        "execution_map_info.activePrompt": userPrompt,
      });

      return {
        status: "SUCCESS",
        message: "Neural map compiled securely.",
        nodes: generatedNodes,
        edges: [],
      };
    });
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
