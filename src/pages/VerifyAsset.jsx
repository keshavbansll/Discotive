import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { awardVaultVerification } from "../lib/scoreEngine"; // INJECT THE SCORE ENGINE

const VerifyAsset = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const verify = async () => {
      const uid = searchParams.get("uid");
      const assetId = searchParams.get("assetId");
      const strength = searchParams.get("strength"); // "Weak", "Medium", "Strong"

      if (!uid || !assetId || !strength) {
        setErrorMsg("Missing required URL parameters.");
        setStatus("error");
        return;
      }

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error("Target user does not exist in the database.");
        }

        const userData = userSnap.data();
        const vaultArray = userData.vault || [];

        // Find the exact asset in the array
        const assetIndex = vaultArray.findIndex((a) => a.id === assetId);
        if (assetIndex === -1) {
          throw new Error("Asset ID not found in user's vault array.");
        }

        if (vaultArray[assetIndex].status === "VERIFIED") {
          throw new Error(
            "Asset is already verified. Preventing duplicate score exploit.",
          );
        }

        // Mutate the specific asset
        vaultArray[assetIndex] = {
          ...vaultArray[assetIndex],
          status: "VERIFIED",
          strength: strength,
          verifiedAt: new Date().toISOString(),
        };

        // 1. Atomic array overwrite
        await updateDoc(userRef, { vault: vaultArray });

        // 2. Dispatch secure score reward based on strength
        await awardVaultVerification(uid, strength);

        setStatus("success");
      } catch (err) {
        console.error("[VerifyAsset] Fault:", err);
        setErrorMsg(err.message);
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-6">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-12 text-center max-w-md w-full shadow-2xl">
        {status === "verifying" && (
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-6" />
        )}
        {status === "success" && (
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-6" />
        )}
        {status === "error" && (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
        )}

        <h2 className="text-2xl font-extrabold mb-2">
          {status === "verifying"
            ? "Authenticating Protocol..."
            : status === "success"
              ? "Asset Verified & Score Awarded."
              : "Verification Failed."}
        </h2>
        <p className="text-[#888] text-sm mt-4">
          {status === "success"
            ? "The operator's vault array has been mutated and their score has been credited."
            : errorMsg ||
              "Ensure the URL parameters are correct and you have admin database rules."}
        </p>
      </div>
    </div>
  );
};
export default VerifyAsset;
