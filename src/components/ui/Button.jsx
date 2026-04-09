import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled = false,
  children,
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    "relative flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all duration-300 overflow-hidden";

  const variants = {
    primary:
      "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78] shadow-[0_0_16px_rgba(191,162,100,0.2)] border border-transparent",
    secondary:
      "bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.25)] text-[#D4AF78] hover:bg-[rgba(191,162,100,0.15)]",
    hollow:
      "bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.60)] hover:text-[#F5F0E8] hover:border-[rgba(255,255,255,0.15)]",
    ghost:
      "bg-transparent text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)]",
    danger:
      "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[9px] rounded-lg",
    md: "px-4 py-2 text-[10px] rounded-xl",
    lg: "px-6 py-3 text-[11px] rounded-2xl",
    icon: "w-8 h-8 rounded-xl",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || loading) &&
          "opacity-50 cursor-not-allowed hover:shadow-none hover:bg-inherit",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin absolute" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5" />
      ) : null}
      <span className={cn(loading && "opacity-0")}>{children}</span>
    </motion.button>
  );
};
