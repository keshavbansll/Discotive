import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Terminal, ShieldAlert } from "lucide-react";

// ============================================================================
// ADMIN ROUTE GUARD
// ============================================================================
const AdminRoute = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // "checking" | "admin" | "denied"

  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser?.email) {
        setStatus("denied");
        return;
      }
      try {
        const q = query(
          collection(db, "admins"),
          where("email", "==", currentUser.email),
        );
        const snap = await getDocs(q);
        setStatus(snap.empty ? "denied" : "admin");
      } catch (err) {
        console.error("[AdminRoute] Clearance verification failed:", err);
        setStatus("denied");
      }
    };
    checkAdmin();
  }, [currentUser]);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="font-mono text-center space-y-4">
          <div className="text-[10px] text-amber-500 uppercase tracking-[0.4em]">
            Verifying Clearance Level
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
                className="w-1 h-4 bg-amber-500 rounded-full"
              />
            ))}
          </div>
          <div className="text-[9px] text-[#333] uppercase tracking-[0.3em]">
            Querying Admin Registry...
          </div>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <AccessDeniedScreen
        onGoBack={() => navigate("/app")}
        email={currentUser?.email}
      />
    );
  }

  return <Outlet />;
};

// ============================================================================
// TERMINAL-STYLE ACCESS DENIED
// ============================================================================
const AccessDeniedScreen = ({ onGoBack, email }) => {
  const terminalLines = [
    {
      text: "DISCOTIVE OS v5.0 // SECTOR OMEGA BREACH ATTEMPT",
      delay: 0.1,
      color: "text-amber-500",
    },
    {
      text: "─────────────────────────────────────────────────────────────",
      delay: 0.2,
      color: "text-[#222]",
    },
    {
      text: `> Scanning neural credentials for: ${email || "UNKNOWN"}`,
      delay: 0.4,
      color: "text-[#555]",
    },
    {
      text: "> Verifying clearance level.......................DONE",
      delay: 0.8,
      color: "text-[#555]",
    },
    {
      text: "> Checking admin registry.........................DONE",
      delay: 1.2,
      color: "text-[#555]",
    },
    {
      text: "> Cross-referencing Sector Omega permissions......DONE",
      delay: 1.6,
      color: "text-[#555]",
    },
    {
      text: "> Validating cryptographic signature..............DONE",
      delay: 2.0,
      color: "text-[#555]",
    },
    {
      text: "─────────────────────────────────────────────────────────────",
      delay: 2.2,
      color: "text-[#222]",
    },
    {
      text: "STATUS .............. [ 403 FORBIDDEN ]",
      delay: 2.4,
      color: "text-red-500",
    },
    {
      text: "CLEARANCE ........... [ INSUFFICIENT ]",
      delay: 2.6,
      color: "text-red-500",
    },
    {
      text: "ENTRY POINT ......... [ DENIED ]",
      delay: 2.8,
      color: "text-red-500",
    },
    {
      text: "─────────────────────────────────────────────────────────────",
      delay: 3.0,
      color: "text-[#222]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Terminal Window */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#080808] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.04)]"
        >
          {/* Window Chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#050505] border-b border-[#111]">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="flex-1 flex items-center justify-center gap-2">
              <Terminal className="w-3 h-3 text-[#444]" />
              <span className="text-[9px] font-mono text-[#333] uppercase tracking-widest">
                discotive_admin_shell — bash — 80×24
              </span>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-6 md:p-8 font-mono space-y-1.5 min-h-[360px]">
            {terminalLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: line.delay, duration: 0.05 }}
                className={`text-[10px] md:text-[11px] leading-relaxed ${line.color}`}
              >
                {line.text}
              </motion.div>
            ))}

            {/* Main Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2 }}
              className="pt-4 space-y-1.5"
            >
              <p className="text-[11px] text-[#666] leading-relaxed">
                It seems like you do not have access to this area.
              </p>
              <p className="text-[10px] text-[#3a3a3a] leading-relaxed">
                Your operator credentials are not registered in the Discotive
                admin registry. If you believe this is an error, contact the
                engineering team at discotive@gmail.com
              </p>
            </motion.div>

            {/* Blinking cursor */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.5 }}
              className="flex items-center gap-1.5 pt-3"
            >
              <span className="text-[11px] text-amber-500 font-mono">$</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-4 bg-amber-500/70 rounded-sm"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Alert Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.0 }}
          className="mt-5 flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/10 rounded-xl"
        >
          <ShieldAlert className="w-4 h-4 text-red-500/60 shrink-0" />
          <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">
            This breach attempt has been logged to the security audit trail.
          </p>
        </motion.div>

        {/* Return Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4 }}
          onClick={onGoBack}
          className="mt-4 w-full py-4 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#e5e5e5] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Command Center
        </motion.button>
      </div>
    </div>
  );
};

export default AdminRoute;
