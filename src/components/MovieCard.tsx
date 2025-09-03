import React from 'react';
import { Play } from 'lucide-react';
import { MovieWithProgress } from '../types/database';

interface MovieCardProps {
  movie: MovieWithProgress;
  showEpisodes?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  showEpisodes = false, 
  showProgress = false,
  onClick 
}) => {
  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case 'Hot':
        return 'bg-red-500 text-white';
      case 'New':
        return 'bg-blue-500 text-white';
      case 'Exclusive':
        return 'bg-yellow-500 text-black';
      case 'Discount':
        return 'bg-pink-500 text-white';
      default:
        return '';
    }
  };

  const getProgressPercentage = () => {
    if (!showProgress || !movie.progress_seconds || !movie.total_duration_seconds) {
      return 0;
    }
    return Math.min((movie.progress_seconds / movie.total_duration_seconds) * 100, 100);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Use poster_url from database or fallback to poster property for compatibility
  const posterUrl = movie.poster_url || movie.poster || '';
  const viewCount = movie.view_count || movie.viewCount || '0';

  return (
    <div className="flex-shrink-0 w-48 group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {movie.badge && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${getBadgeStyles(movie.badge)}`}>
            {movie.badge}
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 flex items-center text-white text-sm">
          <Play className="w-3 h-3 mr-1 fill-current" />
          {viewCount}
        </div>

        {/* Progress bar for continue watching */}
        {showProgress && movie.progress_seconds && movie.total_duration_seconds && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight">
          {movie.title}
        </h3>
        <p className="text-gray-400 text-xs mt-1">{movie.genre}</p>
        {showEpisodes && movie.episodes && (
          <p className="text-gray-500 text-xs">{movie.episodes} episodes</p>
        )}
        {showProgress && movie.progress_seconds && movie.total_duration_seconds && (
          <p className="text-gray-500 text-xs">
            {formatTime(movie.progress_seconds)} / {formatTime(movie.total_duration_seconds)}
          </p>
        )}
      </div>
    </div>
  );
};

export default MovieCard;