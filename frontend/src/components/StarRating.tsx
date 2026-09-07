import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onChange,
  readonly = false,
  size = "md"
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const current = hoverRating !== null ? hoverRating : rating;

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = current >= starValue;
        const isHalf = current >= starValue - 0.5 && current < starValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !readonly && setHoverRating(starValue)}
            onMouseLeave={() => !readonly && setHoverRating(null)}
            className={`transition-transform ${!readonly ? "hover:scale-125 cursor-pointer" : "cursor-default"}`}
          >
            <Star
              className={`${starSizes[size]} transition-colors ${
                isFilled
                  ? "fill-[#ff5500] text-[#ff5500] drop-shadow-[0_0_8px_rgba(255,85,0,0.6)]"
                  : isHalf
                  ? "fill-[#ff5500]/50 text-[#ff5500]"
                  : "text-zinc-700"
              }`}
            />
          </button>
        );
      })}

      <span className="text-xs font-mono font-bold text-white ml-1.5">
        {current > 0 ? `${current.toFixed(1)} / 5.0` : "Unrated"}
      </span>
    </div>
  );
};
