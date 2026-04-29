import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  controls: ReactNode;
  className?: string;
}
export function GameShell({ children, controls, className }: Props) {
  return (
    <div className={cn("grid h-full gap-4 lg:grid-cols-[1fr_320px]", className)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-elevated"
      >
        {children}
      </motion.div>
      <div className="space-y-4">{controls}</div>
    </div>
  );
}
