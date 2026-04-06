import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ShieldCheck, Loader2, AlertCircle, Lock } from "lucide-react";
import { awardVaultVerification } from "../lib/scoreEngine";

const VerifyAsset = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking_auth");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const verify = async () => {
      // SECURITY GATE: Verify current user is an admin
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setStatus("unauthorized");
        setErrorMsg(
          "You must be authenticated as an admin to use this endpoint.",
        );
        return;
      }

      try {
        const adminSnap = await getDocs(
          query(
            collection(db, "admins"),
            where("uid", "==", currentUser.uid), // Check by UID, not email
          ),
        );
        if (adminSnap.empty) {
          setStatus("unauthorized");
          setErrorMsg("Admin clearance required.");
          return;
        }
      } catch {
        setStatus("unauthorized");
        setErrorMsg("Failed to verify admin status.");
        return;
      }

      setStatus("verifying");

      const uid = searchParams.get("uid");
      const assetId = searchParams.get("assetId");
      const strength = searchParams.get("strength");

      const validStrengths = ["Weak", "Medium", "Strong"];
      if (!uid || !assetId || !validStrengths.includes(strength)) {
        setErrorMsg("Invalid or missing URL parameters.");
        setStatus("error");
        return;
      }

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) throw new Error("Target user not found.");

        const userData = userSnap.data();
        const vaultArray = userData.vault || [];
        const assetIndex = vaultArray.findIndex((a) => a.id === assetId);

        if (assetIndex === -1) throw new Error("Asset ID not found in vault.");
        if (vaultArray[assetIndex].status === "VERIFIED") {
          throw new Error("Asset already verified — duplicate prevention.");
        }

        vaultArray[assetIndex] = {
          ...vaultArray[assetIndex],
          status: "VERIFIED",
          strength,
          verifiedAt: new Date().toISOString(),
          verifiedBy: currentUser.uid,
        };

        await updateDoc(userRef, { vault: vaultArray });
        await awardVaultVerification(uid, strength);

        setStatus("success");
      } catch (err) {
        setErrorMsg(err.message);
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6">
        <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-12 text-center max-w-md w-full">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-extrabold text-white mb-2">
            Access Denied
          </h2>
          <p className="text-[#888] text-sm mt-4">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-6">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-12 text-center max-w-md w-full shadow-2xl">
        {(status === "checking_auth" || status === "verifying") && (
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-6" />
        )}
        {status === "success" && (
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-6" />
        )}
        {status === "error" && (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
        )}
        <h2 className="text-2xl font-extrabold mb-2">
          {status === "checking_auth"
            ? "Verifying Admin Status..."
            : status === "verifying"
              ? "Authenticating Protocol..."
              : status === "success"
                ? "Asset Verified & Score Awarded."
                : "Verification Failed."}
        </h2>
        <p className="text-[#888] text-sm mt-4">
          {status === "success"
            ? "Vault updated and Discotive Score credited."
            : errorMsg}
        </p>
      </div>
    </div>
  );
};

export default VerifyAsset;
