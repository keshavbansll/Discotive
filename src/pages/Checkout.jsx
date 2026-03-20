import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, ChevronLeft, CreditCard } from "lucide-react";

const Checkout = () => {
  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      {/* Ambient Red Glow */}
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[150px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg bg-[#0a0a0a] border border-[#222] rounded-[2.5rem] p-10 md:p-14 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
          Gateway Locked.
        </h1>

        <p className="text-[#888] font-medium leading-relaxed mb-8">
          Discotive Pro checkout systems are currently offline. The payment
          infrastructure is being deployed for the next major release phase.
        </p>

        <div className="p-6 bg-[#111] border border-[#222] rounded-2xl mb-10 flex flex-col items-center justify-center opacity-50">
          <CreditCard className="w-8 h-8 text-[#555] mb-3" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
            [ Awaiting Stripe Integration ]
          </p>
        </div>

        <Link
          to="/app"
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full bg-white text-black font-extrabold text-sm uppercase tracking-widest hover:bg-[#ccc] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <ChevronLeft className="w-4 h-4" /> Return to Command Center
        </Link>
      </motion.div>
    </div>
  );
};

export default Checkout;
