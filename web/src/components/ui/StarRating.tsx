import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  showValue?: boolean;
  count?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, max = 5, size = 14, showValue, count }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <Star key={i} size={size} className={i < Math.round(rating) ? 'text-gold-500 fill-gold-500' : 'text-mist-200 fill-mist-200'} />
    ))}
    {showValue && (
      <span className="text-sm font-medium text-ink-700 ml-1">
        {rating.toFixed(1)}
        {count !== undefined && <span className="text-mist-400 font-normal"> ({count})</span>}
      </span>
    )}
  </div>
);