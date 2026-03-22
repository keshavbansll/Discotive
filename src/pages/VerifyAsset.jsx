import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

const VerifyAsset = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const verify = async () => {
      const uid = searchParams.get("uid");
      const assetId = searchParams.get("assetId");
      const strength = searchParams.get("strength"); // "Weak", "Medium", "Strong"

      if (!uid || !assetId || !strength) {
        setStatus("error");
        return;
      }

      try {
        await updateDoc(doc(db, "users", uid, "vault", assetId), {
          status: "Verified",
          strength: strength,
          verifiedAt: new Date().toISOString(),
        });
        setStatus("success");
      } catch (err) {
        console.error(err);
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
              ? "Asset Verified."
              : "Verification Failed."}
        </h2>
        <p className="text-[#888] text-sm">
          {status === "success"
            ? "The operator's vault has been updated on the chain. You can close this window."
            : "Ensure the URL parameters are correct and you have admin database rules."}
        </p>
      </div>
    </div>
  );
};
export default VerifyAsset;
