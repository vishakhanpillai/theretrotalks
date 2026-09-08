import React, { useState } from "react";
import { Star } from "lucide-react";

export interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  showValue?: boolean;
  valueClassName?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onChange,
  readonly = false,
  size = "md",
  showValue = true,
  valueClassName,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4 sm:w-5 sm:h-5",
    lg: "w-6 h-6",
  };

  const valueSizes = {
    xs: "text-[11px] min-w-[2rem]",
    sm: "text-xs min-w-[2.25rem]",
    md: "text-sm sm:text-base min-w-[3rem]",
    lg: "text-base sm:text-lg min-w-[3.5rem]",
  };

  const maxValSizes = {
    xs: "text-[9px]",
    sm: "text-[10px]",
    md: "text-xs sm:text-sm",
    lg: "text-sm sm:text-base",
  };

  const current = hoverRating !== null ? hoverRating : rating;
  const isInteractive = !readonly && typeof onChange === "function";

  const handleSelect = (val: number) => {
    if (isInteractive && onChange) {
      onChange(val);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 select-none"
      onMouseLeave={() => isInteractive && setHoverRating(null)}
    >
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const starIndex = i; // 0 to 4
          const fullValue = starIndex + 1;
          const halfValue = starIndex + 0.5;

          const isFull = current >= fullValue;
          const isHalf = !isFull && current >= halfValue;

          return (
            <div
              key={starIndex}
              className={`relative inline-flex items-center justify-center ${
                isInteractive ? "cursor-pointer group" : ""
              }`}
            >
              {/* Star Graphic: Empty or Full or True Half */}
              {isFull ? (
                <Star
                  className={`${starSizes[size]} fill-[#ff5500] text-[#ff5500] transition-colors`}
                />
              ) : isHalf ? (
                <div className="relative inline-flex items-center justify-center">
                  {/* Empty star outline in background */}
                  <Star
                    className={`${starSizes[size]} text-zinc-700 fill-transparent transition-colors`}
                  />
                  {/* Left half filled with precision clip */}
                  <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden pointer-events-none">
                    <Star
                      className={`${starSizes[size]} fill-[#ff5500] text-[#ff5500] max-w-none transition-colors`}
                    />
                  </div>
                </div>
              ) : (
                <Star
                  className={`${starSizes[size]} text-zinc-700 fill-transparent transition-colors`}
                />
              )}

              {/* Interactive Hitboxes: Left Half (.5) & Right Half (1.0) */}
              {isInteractive && (
                <>
                  {/* Left half hitbox for X.5 */}
                  <button
                    type="button"
                    title={`${halfValue} stars`}
                    aria-label={`${halfValue} stars`}
                    className="absolute inset-y-0 left-0 w-1/2 z-20 cursor-pointer focus:outline-none bg-transparent"
                    onMouseEnter={() => setHoverRating(halfValue)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(halfValue);
                    }}
                  />
                  {/* Right half hitbox for X.0 */}
                  <button
                    type="button"
                    title={`${fullValue} stars`}
                    aria-label={`${fullValue} stars`}
                    className="absolute inset-y-0 right-0 w-1/2 z-20 cursor-pointer focus:outline-none bg-transparent"
                    onMouseEnter={() => setHoverRating(fullValue)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(fullValue);
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {showValue && (
        <span
          className={`font-mono font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ml-2 inline-flex items-baseline ${
            valueClassName || valueSizes[size]
          }`}
        >
          <span>{current > 0 ? `${current.toFixed(1)}` : "—"}</span>
          {size !== "xs" && size !== "sm" && current > 0 && (
            <span
              className={`text-zinc-300 font-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ml-1 ${
                maxValSizes[size]
              }`}
            >
              / 5.0
            </span>
          )}
        </span>
      )}
    </div>
  );
};
