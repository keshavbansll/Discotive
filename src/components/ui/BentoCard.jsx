import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

const BentoCard = ({ children, className, delay = 0, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        "bg-[#121212] border border-white/5 rounded-3xl p-6 relative overflow-hidden group transition-all duration-300",
        onClick &&
          "cursor-pointer hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

export default BentoCard;
