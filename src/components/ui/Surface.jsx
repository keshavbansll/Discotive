import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

/**
 * Surface Component - Replaces Web 2.0 Bento Boxes.
 * Uses the OTT/Netflix philosophy of borderless depth and ambient light.
 */
const Surface = ({ children, className, delay = 0, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        // Borderless, relying on a subtle background difference and elevation
        "bg-[#0A0A0A] rounded-3xl p-6 relative overflow-hidden group transition-all duration-300",
        onClick &&
          "cursor-pointer hover:bg-[#0F0F0F] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] hover:ring-1 hover:ring-[rgba(191,162,100,0.1)]",
        className,
      )}
    >
      {/* Ambient OTT Edge Light (Instead of a hard border) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0" />

      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(191,162,100,0.03)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

export default Surface;
