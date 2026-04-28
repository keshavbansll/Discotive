/**
 * @fileoverview Razorpay Client Initialization
 * @description Loads the Razorpay SDK and triggers the subscription checkout overlay.
 */

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true); // Already loaded

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initiateProUpgrade = async (userData, subscriptionId) => {
  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    alert("System fault: Payment gateway failed to load.");
    return;
  }

  // NOTE: You must generate a Subscription ID from your server first,
  // but for a pure client-side initiation using Razorpay Payment Links/Pages:

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use your public key here
    subscription_id: subscriptionId, // <-- The ID from your backend
    name: "Discotive OS",
    description: "Upgrade to Discotive Pro",
    prefill: {
      name: userData.username || "",
      email: userData.email || "",
    },
    // We don't need notes here, because we securely attached them on the backend
    handler: function (response) {
      console.log(
        "Gateway Success. Awaiting Webhook sync...",
        response.razorpay_payment_id,
      );
      // Optional: You can show a success toast here telling the user "Activating God Mode..."
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
