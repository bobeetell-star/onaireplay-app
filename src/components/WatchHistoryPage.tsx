import React from 'react';
import { ArrowLeft, Clock, Play, Trash2, Search } from 'lucide-react';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { MovieWithProgress } from '../types/database';

interface WatchHistoryPageProps {
  user: any;
  onBack: () => void;
  onMovieClick: (movie: MovieWithProgress) => void;
}

const WatchHistoryPage: React.FC<WatchHistoryPageProps> = ({ user, onBack, onMovieClick }) => {
  const { continueWatching, loading, error, removeFromWatchHistory } = useWatchHistory(user?.id || null);

  const getProgressPercentage = (movie: MovieWithProgress) => {
    if (!movie.progress_seconds || !movie.total_duration_seconds) {
      return 0;
    }
    return Math.min((movie.progress_seconds / movie.total_duration_seconds) * 100, 100);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRemoveFromHistory = async (movieId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this item from your watch history?')) {
      await removeFromWatchHistory(movieId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="text-white hover:text-gray-300 transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Continue Watching</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Loading your watch history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="text-white hover:text-gray-300 transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Continue Watching</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Watch History</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="text-white hover:text-gray-300 transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Continue Watching</h1>
              <p className="text-gray-400 mt-1">
                {continueWatching.length} {continueWatching.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {continueWatching.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-4">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">No Watch History</h2>
              <p className="text-gray-400 mb-4">
                Start watching movies and shows to see them here.
              </p>
              <button
                onClick={onBack}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Browse Movies
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {continueWatching.map((movie) => (
              <div
                key={movie.id}
                className="group cursor-pointer"
                onClick={() => onMovieClick(movie)}
              >
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                    <div 
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${getProgressPercentage(movie)}%` }}
                    />
                  </div>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50">
                    <Play className="w-12 h-12 text-white fill-current" />
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemoveFromHistory(movie.id, e)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  {/* Movie Info */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center text-white text-sm mb-2">
                      <Play className="w-3 h-3 mr-1 fill-current" />
                      {movie.view_count}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight">
                    {movie.title}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">{movie.genre}</p>
                  {movie.episodes && (
                    <p className="text-gray-500 text-xs">{movie.episodes} episodes</p>
                  )}
                  {movie.progress_seconds && movie.total_duration_seconds && (
                    <div className="mt-2">
                      <p className="text-gray-500 text-xs">
                        {formatTime(movie.progress_seconds)} / {formatTime(movie.total_duration_seconds)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {Math.round(getProgressPercentage(movie))}% complete
                      </p>
                    </div>
                  )}
                  {movie.last_watched_at && (
                    <p className="text-gray-500 text-xs mt-1">
                      Last watched: {formatDate(movie.last_watched_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHistoryPage;