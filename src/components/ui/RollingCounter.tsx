import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RollingDigitProps {
  digit: string;
  height?: number;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const RollingDigit: React.FC<RollingDigitProps> = ({ digit }) => {
  const isNumber = !isNaN(parseInt(digit, 10));

  if (!isNumber) {
    return <span className="inline-block select-none">{digit}</span>;
  }

  const num = parseInt(digit, 10);

  return (
    <span
      className="inline-block relative overflow-hidden align-baseline"
      style={{ height: "1.15em", lineHeight: "1.15em" }}
      aria-hidden="true"
    >
      <motion.span
        className="flex flex-col text-center"
        initial={{ y: 0 }}
        animate={{ y: `-${num * 10}%` }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 24,
          mass: 0.8,
        }}
        style={{ position: "relative" }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="inline-block h-[1.15em] leading-[1.15em]">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
};

interface RollingCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const RollingCounter: React.FC<RollingCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) => {
  const formatted = value.toLocaleString("en-NG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const chars = formatted.split("");

  return (
    <span
      className={`inline-flex items-baseline tabular-nums font-mono font-bold tracking-tight select-none ${className}`}
      aria-label={`${prefix}${formatted}${suffix}`}
    >
      {prefix && <span className="mr-0.5 select-none">{prefix}</span>}
      <span className="inline-flex items-baseline">
        {chars.map((ch, idx) => (
          <RollingDigit key={`${idx}-${chars.length}`} digit={ch} />
        ))}
      </span>
      {suffix && <span className="ml-0.5 select-none">{suffix}</span>}
    </span>
  );
};

