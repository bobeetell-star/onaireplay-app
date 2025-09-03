import React from 'react';
import { Play, X, Clock, Eye, Calendar, Star, Plus, Check, MessageCircle, Send, Trash2, Lock, Unlock } from 'lucide-react';
import { MovieWithProgress } from '../types/database';
import { useMovieComments } from '../hooks/useMovieComments';
import { useWatchlistCategories } from '../hooks/useWatchlistCategories';
import { useEpisodeUnlocks } from '../hooks/useEpisodeUnlocks';
import { useUserCoins } from '../hooks/useUserCoins';
import { supabase } from '../lib/supabase';

interface MovieDetailPageProps {
  movie: MovieWithProgress;
  onClose: () => void;
  onWatchNow: () => void;
  isLoggedIn: boolean;
  user?: any;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onAddToWatchlistWithCategory?: (categoryId: string | null) => void;
  watchlistLoading?: boolean;
  onPlayEpisode?: (episode: MovieWithProgress) => void;
}

const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ 
  movie, 
  onClose, 
  onWatchNow,
  isLoggedIn,
  user,
  isInWatchlist,
  onToggleWatchlist,
  onAddToWatchlistWithCategory,
  watchlistLoading,
  onPlayEpisode
}) => {
  // Debug log to check if component is rendering and what movie data we have
  console.log('MovieDetailPage rendered with movie:', movie);
  
  const [commentText, setCommentText] = React.useState('');
  const [showCategoryMenu, setShowCategoryMenu] = React.useState(false);
  const [seriesEpisodes, setSeriesEpisodes] = React.useState<MovieWithProgress[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = React.useState(false);
  const [episodeError, setEpisodeError] = React.useState<string | null>(null);
  const { comments, loading: commentsLoading, error: commentsError, submitting, addComment, deleteComment } = useMovieComments(movie.id);
  const { categories } = useWatchlistCategories(user?.id || null);
  const { isEpisodeUnlocked, unlockEpisode } = useEpisodeUnlocks(user?.id || null);
  const { spendCoins, canAfford, totalCoins } = useUserCoins(user?.id || null);

  // Fetch all episodes for the series if this movie is part of a series
  React.useEffect(() => {
    const fetchSeriesEpisodes = async () => {
      if (!movie.series_id) {
        setSeriesEpisodes([]);
        return;
      }

      setLoadingEpisodes(true);
      setEpisodeError(null);

      try {
        const { data, error } = await supabase
          .from('movies')
          .select('id, title, episode_number, poster_url, is_locked, unlock_cost, duration_seconds, view_count, genre, created_at, landscape_poster_url, badge, synopsis, episodes, video_url, video_url_720p, video_url_1080p, video_url_4k, subtitle_url_en, subtitle_url_es, series_id')
          .eq('series_id', movie.series_id)
          .order('episode_number', { ascending: true });

        if (error) throw error;

        // Enrich episodes with unlock status
        const enrichedEpisodes: MovieWithProgress[] = (data || []).map(episode => ({
          ...episode,
          is_unlocked: !episode.is_locked || isEpisodeUnlocked(episode.id),
          poster: episode.poster_url,
          landscapePoster: episode.landscape_poster_url,
          viewCount: episode.view_count
        }));

        setSeriesEpisodes(enrichedEpisodes);
      } catch (err: any) {
        console.error('Error fetching series episodes:', err);
        setEpisodeError('Failed to load episodes');
        setSeriesEpisodes([]);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchSeriesEpisodes();
  }, [movie.series_id, movie.id, isEpisodeUnlocked]);

  const handleUnlockEpisode = async (episode: MovieWithProgress) => {
    if (!user?.id || !episode.unlock_cost) return;

    // Check if user can afford the unlock cost
    if (!canAfford(episode.unlock_cost)) {
      alert(`You need ${episode.unlock_cost} coins to unlock this episode. You currently have ${totalCoins} coins. Please purchase more coins to continue.`);
      return;
    }

    // Confirm unlock
    const confirmed = window.confirm(
      `Unlock Episode ${episode.episode_number} for ${episode.unlock_cost} coins?`
    );
    
    if (!confirmed) return;

    try {
      // First deduct coins
      const coinsDeducted = await spendCoins(episode.unlock_cost);
      
      if (coinsDeducted) {
        // Then unlock the episode
        const unlocked = await unlockEpisode(episode.id, episode.unlock_cost);
        
        if (unlocked) {
          // Update local episode state
          setSeriesEpisodes(prev => 
            prev.map(ep => 
              ep.id === episode.id 
                ? { ...ep, is_unlocked: true }
                : ep
            )
          );
        }
      }
    } catch (error) {
      console.error('Error unlocking episode:', error);
      alert('Failed to unlock episode. Please try again.');
    }
  };

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgressPercentage = () => {
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !commentText.trim()) return;

    const success = await addComment(user.id, commentText);
    if (success) {
      setCommentText('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(commentId, user.id);
    }
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Background Image */}
      <div className="relative min-h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${movie.landscape_poster_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="container mx-auto px-6 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Movie Poster */}
              <div className="lg:col-span-1">
                <div className="relative aspect-[9/16] max-w-sm mx-auto lg:mx-0 rounded-xl overflow-hidden shadow-2xl">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  {movie.badge && (
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold ${getBadgeStyles(movie.badge)}`}>
                      {movie.badge}
                    </div>
                  )}
                </div>
              </div>

              {/* Movie Details */}
              <div className="lg:col-span-2 text-white">
                <div className="max-w-3xl">
                  
                  {/* Title and Genre */}
                  <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                    {movie.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <span className="bg-gray-700 text-white px-4 py-2 rounded-full text-lg font-medium">
                      {movie.genre}
                    </span>
                    <div className="flex items-center text-gray-300">
                      <Eye className="w-5 h-5 mr-2" />
                      <span className="text-lg">{movie.view_count} views</span>
                    </div>
                    {movie.episodes && (
                      <div className="flex items-center text-gray-300">
                        <Calendar className="w-5 h-5 mr-2" />
                        <span className="text-lg">{movie.episodes} episodes</span>
                      </div>
                    )}
                    {movie.duration_seconds && (
                      <div className="flex items-center text-gray-300">
                        <Clock className="w-5 h-5 mr-2" />
                        <span className="text-lg">{formatDuration(movie.duration_seconds)}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar (if user has watched) */}
                  {isLoggedIn && movie.progress_seconds && movie.total_duration_seconds && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300">Continue watching</span>
                        <span className="text-gray-300 text-sm">
                          {formatTime(movie.progress_seconds)} / {formatTime(movie.total_duration_seconds)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage()}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Synopsis */}
                  {movie.synopsis && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold mb-4">Synopsis</h2>
                      <p className="text-gray-200 text-lg leading-relaxed">
                        {movie.synopsis}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={onWatchNow}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center"
                    >
                      <Play className="w-6 h-6 mr-3 fill-current" />
                      {movie.progress_seconds ? 'Continue Watching' : 'Watch Now'}
                    </button>
                    
                    {isLoggedIn && onToggleWatchlist && (
                      <div className="relative">
                        {isInWatchlist ? (
                          <button 
                            onClick={onToggleWatchlist}
                            disabled={watchlistLoading}
                            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center bg-green-600 hover:bg-green-700 text-white ${watchlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {watchlistLoading ? (
                              <div className="w-6 h-6 mr-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="w-6 h-6 mr-3" />
                            )}
                            In Watchlist
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                              disabled={watchlistLoading}
                              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white ${watchlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {watchlistLoading ? (
                                <div className="w-6 h-6 mr-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Plus className="w-6 h-6 mr-3" />
                              )}
                              Add to Watchlist
                            </button>
                            
                            {/* Category Selection Menu */}
                            {showCategoryMenu && onAddToWatchlistWithCategory && (
                              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
                                <div className="py-2">
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    Choose Category
                                  </div>
                                  <button
                                    onClick={() => {
                                      onAddToWatchlistWithCategory(null);
                                      setShowCategoryMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center"
                                  >
                                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                                    Uncategorized
                                  </button>
                                  {categories.map((category) => (
                                    <button
                                      key={category.id}
                                      onClick={() => {
                                        onAddToWatchlistWithCategory(category.id);
                                        setShowCategoryMenu(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center"
                                    >
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: category.color }}
                                      />
                                      {category.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {!isLoggedIn && (
                      <button 
                        disabled
                        className="bg-gray-700/50 text-gray-400 px-8 py-4 rounded-lg font-semibold text-lg cursor-not-allowed flex items-center justify-center"
                      >
                        <Star className="w-6 h-6 mr-3" />
                        Login to Add to Watchlist
                      </button>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="mt-8 pt-8 border-t border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                      <div>
                        <h3 className="text-gray-400 font-medium mb-2">Release Date</h3>
                        <p className="text-white">
                          {new Date(movie.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-gray-400 font-medium mb-2">Genre</h3>
                        <p className="text-white">{movie.genre}</p>
                      </div>
                      {movie.episodes && (
                        <div>
                          <h3 className="text-gray-400 font-medium mb-2">Episodes</h3>
                          <p className="text-white">{movie.episodes}</p>
                        </div>
                      )}
                      {movie.duration_seconds && (
                        <div>
                          <h3 className="text-gray-400 font-medium mb-2">Duration</h3>
                          <p className="text-white">{formatDuration(movie.duration_seconds)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Episodes Section - Only show if this is part of a series */}
                  {movie.series_id && (
                    <div className="mt-12 pt-8 border-t border-gray-700">
                      <h2 className="text-2xl font-semibold mb-6">Episodes</h2>
                      
                      {loadingEpisodes ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Loading episodes...</p>
                          </div>
                        </div>
                      ) : episodeError ? (
                        <div className="text-center py-8">
                          <p className="text-red-400 mb-4">{episodeError}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : seriesEpisodes.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                          {seriesEpisodes.map((episode) => (
                            <div
                              key={episode.id}
                              className={`relative aspect-square rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                episode.id === movie.id
                                  ? 'border-red-500 bg-red-500/20'
                                  : episode.is_unlocked
                                  ? 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700'
                                  : 'border-gray-700 bg-gray-900 hover:border-yellow-500'
                              }`}
                              onClick={() => {
                                if (episode.is_unlocked) {
                                 console.log('Attempting to play episode:', episode.id, 'unlocked:', episode.is_unlocked, 'episode data:', episode);
                                  // Play this episode
                                  if (onPlayEpisode) {
                                    onPlayEpisode(episode);
                                  }
                                } else if (episode.is_locked) {
                                  handleUnlockEpisode(episode);
                                }
                              }}
                            >
                              {/* Episode Number */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-lg font-bold ${
                                  episode.id === movie.id
                                    ? 'text-red-400'
                                    : episode.is_unlocked
                                    ? 'text-white'
                                    : 'text-gray-500'
                                }`}>
                                  {episode.episode_number}
                                </span>
                              </div>

                              {/* Lock Icon for Locked Episodes */}
                              {episode.is_locked && !episode.is_unlocked && (
                                <div className="absolute top-1 right-1">
                                  <Lock className="w-4 h-4 text-yellow-400" />
                                </div>
                              )}

                              {/* Unlock Cost for Locked Episodes */}
                              {episode.is_locked && !episode.is_unlocked && episode.unlock_cost && (
                                <div className="absolute bottom-1 left-1 right-1">
                                  <div className="bg-black/80 rounded px-1 py-0.5 text-xs text-yellow-400 text-center">
                                    {episode.unlock_cost} coins
                                  </div>
                                </div>
                              )}

                              {/* Current Episode Indicator */}
                              {episode.id === movie.id && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="bg-red-500 rounded-full w-3 h-3"></div>
                                </div>
                              )}

                              {/* Play Icon for Unlocked Episodes */}
                              {episode.is_unlocked && episode.id !== movie.id && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                                  <Play className="w-6 h-6 text-white fill-current" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">No episodes found for this series.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="mt-12 pt-8 border-t border-gray-700">
                    <div className="flex items-center mb-6">
                      <MessageCircle className="w-6 h-6 mr-3 text-blue-400" />
                      <h2 className="text-2xl font-semibold">Comments ({comments.length})</h2>
                    </div>

                    {/* Comment Form - Only show if logged in */}
                    {isLoggedIn && user ? (
                      <form onSubmit={handleSubmitComment} className="mb-8">
                        <div className="flex items-start space-x-4">
                          <div className="bg-blue-600 rounded-full p-2 flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Share your thoughts about this movie..."
                              className="w-full bg-gray-800 text-white rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 resize-none"
                              rows={3}
                              maxLength={500}
                            />
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-gray-400 text-sm">
                                {commentText.length}/500 characters
                              </span>
                              <button
                                type="submit"
                                disabled={!commentText.trim() || submitting}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center"
                              >
                                {submitting ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                ) : (
                                  <Send className="w-4 h-4 mr-2" />
                                )}
                                {submitting ? 'Posting...' : 'Post Comment'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center">
                        <p className="text-gray-400">
                          <MessageCircle className="w-5 h-5 inline mr-2" />
                          Sign in to join the conversation and share your thoughts about this movie.
                        </p>
                      </div>
                    )}

                    {/* Comments Error */}
                    {commentsError && (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        {commentsError}
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                      {commentsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Loading comments...</p>
                          </div>
                        </div>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                            <div className="bg-gray-600 rounded-full p-2 flex-shrink-0">
                              <MessageCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-white">
                                    {comment.user_id === user?.id ? 'You' : 'User'}
                                  </span>
                                  <span className="text-gray-400 text-sm">
                                    {formatCommentDate(comment.created_at)}
                                  </span>
                                </div>
                                {comment.user_id === user?.id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-200 leading-relaxed">
                                {comment.comment_text}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 text-lg">No comments yet</p>
                          <p className="text-gray-500 text-sm">
                            Be the first to share your thoughts about this movie!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Click outside to close category menu */}
      {showCategoryMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowCategoryMenu(false)}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;