/**
 * @fileoverview Discotive OS - Razorpay Automation Webhook
 * @module Backend/Billing
 * @description
 * Cryptographically verifies Razorpay subscription events.
 * Automates Tier upgrades (PRO) and downgrades (ESSENTIAL) without human intervention.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Store this secret in Firebase environment variables:
// firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
const WEBHOOK_SECRET = functions.config().razorpay.webhook_secret;

exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // 1. CRYPTOGRAPHIC SIGNATURE VERIFICATION
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

  // 2. EVENT ROUTING
  const event = req.body.event;
  const payload = req.body.payload;

  try {
    // The notes object MUST be passed from your React frontend when creating the subscription
    const userId =
      payload.subscription?.entity?.notes?.firebase_uid ||
      payload.payment?.entity?.notes?.firebase_uid;

    if (!userId) {
      console.error(
        "[DATA FAULT] No Firebase UID attached to Razorpay payload.",
      );
      return res.status(400).send("Missing Identity Mapping");
    }

    const userRef = db.collection("users").doc(userId);

    // 3. TIER STATE MACHINE
    switch (event) {
      case "subscription.charged":
      case "subscription.authenticated":
        // Upgrade to God-Mode
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
        // Downgrade to Essential (Failed payment or cancellation)
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
