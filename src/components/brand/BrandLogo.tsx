import React from "react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  variant?: "full" | "icon";
  className?: string;
  imgClassName?: string;
  alt?: string;
  priority?: boolean;
}

/**
 * Official Theme-Aware EventRally Brand Logo Component.
 * Automatically displays the dark/blue logo on light surfaces
 * and the clean white logo on dark surfaces or dark mode.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  className,
  imgClassName,
  alt = "EventRally — Event Management & Ticketing Platform",
}) => {
  if (variant === "icon") {
    return (
      <div className={cn("inline-flex items-center justify-center shrink-0", className)}>
        <img
          src="/ER APP ICON.png"
          alt={alt}
          className={cn("h-8 w-8 object-contain rounded-lg shadow-2xs", imgClassName)}
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center shrink-0", className)}>
      {/* Light Mode Logo (Dark/Blue) */}
      <img
        src="/ER full logo.png"
        alt={alt}
        className={cn("h-7 sm:h-8 w-auto object-contain dark:hidden", imgClassName)}
        loading="eager"
        decoding="async"
      />
      {/* Dark Mode Logo (White) */}
      <img
        src="/ER full logo white.png"
        alt={alt}
        className={cn("h-7 sm:h-8 w-auto object-contain hidden dark:block", imgClassName)}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
