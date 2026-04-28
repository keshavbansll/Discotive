import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AnimatedButton = ({
  children,
  to,
  href,
  variant = "nav",
  className,
  onMouseEnter,
  onClick,
}) => {
  // Define styles and liquid fill colors based on the variant
  const variants = {
    nav: {
      container:
        "text-slate-400 hover:text-white py-2 px-4 rounded-full transition-colors",
      liquid: "bg-white/10",
      textHover: "text-white",
    },
    outline: {
      // Hollow pill -> Fills with white
      container:
        "border border-white/20 text-white rounded-full overflow-hidden",
      liquid: "bg-white",
      textHover: "text-black",
    },
    solid: {
      // Solid white -> Fills with black
      container:
        "bg-white text-black rounded-full overflow-hidden border border-transparent hover:border-white/20",
      liquid: "bg-[#0a0a0a]",
      textHover: "text-white",
    },
  };

  const activeVariant = variants[variant];

  // Lifted event handlers out of the inner motion.div
  const content = (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      className={cn(
        "relative flex items-center justify-center font-bold text-sm tracking-wide w-full h-full",
        activeVariant.container,
        className,
      )}
    >
      {/* Liquid Fill Element (Bottom to Top) */}
      {(variant === "outline" || variant === "solid") && (
        <motion.div
          variants={{
            rest: { y: "100%", borderRadius: "100% 100% 0 0" },
            hover: { y: "0%", borderRadius: "0% 0% 0 0" },
          }}
          transition={{
            type: "tween",
            ease: [0.22, 1, 0.36, 1],
            duration: 0.4,
          }}
          className={cn("absolute inset-0 z-0", activeVariant.liquid)}
        />
      )}

      {/* Text Slot-Machine Mask */}
      <div className="relative z-10 overflow-hidden h-[1.2em] flex items-center">
        {/* Original Text (Pushes Up) */}
        <motion.span
          variants={{
            rest: { y: 0, opacity: 1 },
            hover: { y: "-100%", opacity: 0 },
          }}
          transition={{
            type: "tween",
            ease: [0.22, 1, 0.36, 1],
            duration: 0.3,
          }}
          className="flex items-center"
        >
          {children}
        </motion.span>

        {/* Hover Text (Pulls up from bottom) */}
        <motion.span
          variants={{
            rest: { y: "100%", opacity: 0 },
            hover: { y: 0, opacity: 1 },
          }}
          transition={{
            type: "tween",
            ease: [0.22, 1, 0.36, 1],
            duration: 0.3,
          }}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            activeVariant.textHover,
          )}
        >
          {children}
        </motion.span>
      </div>
    </motion.div>
  );

  // Bound handlers to the semantic interactive root
  if (to)
    return (
      <Link
        to={to}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className="block"
      >
        {content}
      </Link>
    );
  if (href)
    return (
      <a
        href={href}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className="block"
      >
        {content}
      </a>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="block w-full"
    >
      {content}
    </button>
  );
};

export default AnimatedButton;
