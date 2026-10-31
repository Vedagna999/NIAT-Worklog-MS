import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number; // 0.5 to 5.0
  onChange?: (val: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showSelfAssessedTag?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  interactive = false,
  size = 'md',
  showLabel = true,
  showSelfAssessedTag = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizes = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const activeValue = hoverValue !== null ? hoverValue : value;

  const handleStarClick = (rating: number) => {
    if (interactive && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <div
        className={`flex items-center ${containerSizes[size]}`}
        onMouseLeave={() => interactive && setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFull = activeValue >= starIndex;
          const isHalf = activeValue >= starIndex - 0.5 && activeValue < starIndex;

          return (
            <div
              key={starIndex}
              className={`relative inline-block ${starSizeClasses[size]} ${
                interactive ? 'cursor-pointer select-none' : ''
              }`}
            >
              {/* Background empty star */}
              <Star
                className={`${starSizeClasses[size]} text-slate-300 dark:text-slate-600 transition-colors`}
              />

              {/* Half star overlay */}
              {isHalf && (
                <div className="absolute top-0 left-0 w-[50%] h-full overflow-hidden pointer-events-none">
                  <Star
                    className={`${starSizeClasses[size]} text-amber-400 fill-amber-400 transition-colors`}
                  />
                </div>
              )}

              {/* Full star overlay */}
              {isFull && (
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  <Star
                    className={`${starSizeClasses[size]} text-amber-400 fill-amber-400 transition-colors`}
                  />
                </div>
              )}

              {/* Interactive click / hover targets: left half (index - 0.5) and right half (index) */}
              {interactive && (
                <div className="absolute inset-0 flex z-10">
                  <button
                    type="button"
                    className="w-1/2 h-full opacity-0 cursor-pointer focus:outline-none"
                    aria-label={`${starIndex - 0.5} stars`}
                    onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                    onClick={() => handleStarClick(starIndex - 0.5)}
                  />
                  <button
                    type="button"
                    className="w-1/2 h-full opacity-0 cursor-pointer focus:outline-none"
                    aria-label={`${starIndex} stars`}
                    onMouseEnter={() => setHoverValue(starIndex)}
                    onClick={() => handleStarClick(starIndex)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold text-slate-700 font-mono tracking-tight bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
          {activeValue.toFixed(1)} / 5.0
        </span>
      )}

      {showSelfAssessedTag && (
        <span className="text-[11px] text-slate-500 italic">
          (Self-Assessed Confidence)
        </span>
      )}
    </div>
  );
};
