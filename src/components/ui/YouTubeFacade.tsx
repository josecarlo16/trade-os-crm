import { useState, useCallback } from 'react';

interface YouTubeFacadeProps {
  videoId: string;
  title: string;
}

/**
 * Lazy-loads YouTube iframe only on user click.
 * Shows a thumbnail + play button as a facade to avoid loading ~900KB of YouTube JS eagerly.
 */
export const YouTubeFacade = ({ videoId, title }: YouTubeFacadeProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleClick = useCallback(() => {
    setIsLoaded(true);
  }, []);

  if (isLoaded) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  return (
    <button
      onClick={handleClick}
      className="absolute inset-0 w-full h-full cursor-pointer group bg-foreground/5"
      aria-label={`Play video: ${title}`}
      type="button"
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-lg">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current ml-1" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
};
