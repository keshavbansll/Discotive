import { cn } from "../../lib/cn";

export const Skeleton = ({ className }) => {
  return (
    <div className={cn("animate-pulse bg-white/5 rounded-2xl", className)} />
  );
};
