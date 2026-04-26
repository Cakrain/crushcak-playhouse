import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  animated?: boolean;
}

/** CrushCak brand mark — neon "CC" in a hex shield. */
export function Logo({ size = 64, animated = false }: LogoProps) {
  const Wrapper = animated ? motion.svg : "svg";
  const props = animated
    ? {
        animate: { rotate: [0, 0, 360] },
        transition: { duration: 8, repeat: Infinity, ease: "linear" as const },
      }
    : {};

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {animated && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-primary blur-2xl opacity-50 animate-pulse-glow"
          aria-hidden
        />
      )}
      <Wrapper
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <defs>
          <linearGradient id="cc-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
          </linearGradient>
        </defs>
        {/* Hex shield */}
        <polygon
          points="32,4 56,18 56,46 32,60 8,46 8,18"
          fill="none"
          stroke="url(#cc-stroke)"
          strokeWidth="2.5"
        />
        {/* Stylised double C */}
        <path
          d="M40 22 a14 14 0 1 0 0 20"
          fill="none"
          stroke="url(#cc-stroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M44 26 a10 10 0 1 0 0 12"
          fill="none"
          stroke="url(#cc-stroke)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
        />
      </Wrapper>
    </div>
  );
}
