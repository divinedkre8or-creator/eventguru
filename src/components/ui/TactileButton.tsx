import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TactileButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  className = "",
  disabled = false,
  ...props
}) => {
  const baseStyles =
    "relative inline-flex items-center justify-center font-bold tracking-tight rounded-xl select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:outline-none";

  const sizeStyles = {
    sm: "h-9 px-3.5 text-xs gap-1.5 min-h-[36px]",
    md: "h-11 px-5 text-xs sm:text-sm gap-2 min-h-[44px]",
    lg: "h-12 px-6 text-sm sm:text-base gap-2.5 min-h-[48px]",
  };

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground shadow-xs hover:bg-primary/95 focus-visible:ring-primary border border-primary/20",
    secondary:
      "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/90 focus-visible:ring-secondary border border-secondary/20",
    outline:
      "bg-background text-foreground border border-border/80 hover:bg-muted/70 hover:border-border focus-visible:ring-foreground/20",
    danger:
      "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive",
    ghost:
      "bg-transparent text-foreground hover:bg-muted/60 focus-visible:ring-foreground/20",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { y: -1, transition: { duration: 0.15 } }}
      whileTap={isDisabled ? undefined : { scale: 0.96, transition: { duration: 0.1 } }}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

