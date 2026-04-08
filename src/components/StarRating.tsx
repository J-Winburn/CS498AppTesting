"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface StarRatingProps {
  spotifyId: string;
  type: "track" | "album" | "artist";
  name?: string;
  imageUrl?: string;
  subtitle?: string;
  initialRating?: number;
  onRatingChange?: (newRating: number) => void;
}

export default function StarRating({
  spotifyId,
  type,
  name,
  imageUrl,
  subtitle,
  initialRating = 0,
  onRatingChange,
}: StarRatingProps) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial rating if we're logged in and don't have one passed down
    if (session?.user && initialRating === 0) {
      fetch(`/api/ratings?spotifyId=${spotifyId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.rating !== undefined) {
            setRating(data.rating);
          }
        })
        .catch(console.error);
    }
  }, [session, spotifyId, initialRating]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // If hovering over the left half of the star, it's a half star (0.5), otherwise full star (1.0)
    const isHalf = x < rect.width / 2;
    setHoverRating(index + (isHalf ? 0.5 : 1));
  };

  const handleClick = async (newRating: number) => {
    if (!session?.user || loading) return;
    
    // If clicking the same rating, toggle it off (set to 0)
    const finalRating = rating === newRating ? 0 : newRating;
    
    setRating(finalRating);
    if (onRatingChange) onRatingChange(finalRating);
    setLoading(true);

    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyId,
          type,
          rating: finalRating,
          name,
          imageUrl,
          subtitle,
        }),
      });
    } catch (error) {
      console.error("Failed to save rating:", error);
      // Revert on error
      setRating(rating);
    } finally {
      setLoading(false);
    }
  };

  const displayRating = isHovering ? hoverRating : rating;

  return (
    <div 
      className="flex items-center gap-1"
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverRating(0);
      }}
      onMouseEnter={() => setIsHovering(true)}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fillAmount = Math.max(0, Math.min(1, displayRating - index));
        
        return (
          <div
            key={index}
            className="relative cursor-pointer"
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={() => handleClick(hoverRating)}
            style={{ width: "24px", height: "24px" }}
          >
            {/* Empty Star Background */}
            <svg
              className="absolute top-0 left-0 w-full h-full text-zinc-600 transition-colors"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            
            {/* Filled Star Foreground (clipped based on fillAmount) */}
            <div 
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillAmount * 100}%` }}
            >
              <svg
                className="w-[24px] h-[24px] text-[#fb3d93] drop-shadow-[0_0_8px_rgba(251,61,147,0.5)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>
        );
      })}
      
      {/* Optional: Show numeric rating */}
      <span className="ml-2 text-sm font-medium text-zinc-400 w-6">
        {displayRating > 0 ? displayRating.toFixed(1) : ""}
      </span>
    </div>
  );
}
