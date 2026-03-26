/**
 * @fileoverview Razorpay Client Initialization
 * @description Loads the Razorpay SDK and triggers the subscription checkout overlay.
 */

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initiateProUpgrade = async (userData) => {
  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    alert("System fault: Payment gateway failed to load.");
    return;
  }

  // NOTE: You must generate a Subscription ID from your server first,
  // but for a pure client-side initiation using Razorpay Payment Links/Pages:

  const options = {
    key: "YOUR_RAZORPAY_KEY_ID",
    // If using subscriptions, pass the generated subscription_id here.
    // If using a standard payment, pass amount and currency.
    name: "Discotive OS",
    description: "Upgrade to Discotive Pro",
    image: "/logo.png", // Path to your OS logo
    theme: {
      color: "#f59e0b", // Matches your Amber OS theme
    },
    prefill: {
      name: userData.identity?.username || "",
      email: userData.email || "",
    },
    notes: {
      // CRITICAL: This is how the webhook identifies the user
      firebase_uid: userData.uid,
    },
    handler: function (response) {
      // The payment succeeded on the client.
      // Do NOT manually update the database here.
      // Wait for the Webhook to fire and the Firestore listener to update the UI automatically.
      console.log("Transaction ID:", response.razorpay_payment_id);
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
