import { motion } from "framer-motion";
import { useMemo } from "react";

/** Background particle field for splash and decorative areas. */
export function ParticleField({ count = 36 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 8,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/60"
          style={{
            left: `${p.x}%`,
            bottom: `-${p.size}px`,
            width: p.size,
            height: p.size,
            boxShadow: `0 0 ${p.size * 2}px hsl(var(--primary) / 0.7)`,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: "-110vh", opacity: [0, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
