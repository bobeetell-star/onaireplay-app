import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MovieWithProgress, UserWatchHistory } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, isNetworkError, createErrorMessage } from '../utils/errorHandling';

export const useWatchHistory = (userId: string | null) => {
  const [continueWatching, setContinueWatching] = useState<MovieWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();

  const fetchWatchHistory = async () => {
    if (!userId) {
      setContinueWatching([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watch_history')
          .select(`
            *,
            movie:movies (
              id,
              title,
              genre,
              view_count,
              poster_url,
              landscape_poster_url,
              badge,
              episodes,
              duration_seconds,
              created_at,
              series_id,
              episode_number
            )
          `)
          .eq('user_id', userId)
          .order('last_watched_at', { ascending: false })
          .limit(10);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      const moviesWithProgress: MovieWithProgress[] = (data as (UserWatchHistory & { movie: any })[])
        .filter(item => item.movie) // Filter out any items without movie data
        .map(item => ({
          ...item.movie,
          progress_seconds: item.progress_seconds,
          total_duration_seconds: item.total_duration_seconds,
          last_watched_at: item.last_watched_at,
          poster: item.movie.poster_url, // Map to frontend format
          landscapePoster: item.movie.landscape_poster_url, // Map to frontend format
          viewCount: item.movie.view_count // Map to frontend format
        }));

      setContinueWatching(moviesWithProgress);
    } catch (err: any) {
      console.error('Error fetching watch history:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Show user-friendly error with retry option
      addError(createErrorMessage(
        'Failed to load your watch history. Please check your connection and try again.',
        'error',
        () => fetchWatchHistory(),
        'Retry'
      ));
      
      setContinueWatching([]);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchHistory = async (movieId: number, progressSeconds: number, totalDurationSeconds: number) => {
    if (!userId) return;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watch_history')
          .upsert({
            user_id: userId,
            movie_id: movieId,
            progress_seconds: Math.floor(progressSeconds),
            total_duration_seconds: Math.floor(totalDurationSeconds),
            last_watched_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,movie_id'
          });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh the watch history after adding
      await fetchWatchHistory();
    } catch (err: any) {
      console.error('Error adding to watch history:', err);
      
      // Only show error to user if it's a network issue or critical error
      if (isNetworkError(err)) {
        addError(createErrorMessage(
          'Failed to save your progress. Your viewing progress may not be saved.',
          'warning'
        ));
      }
    }
  };

  const removeFromWatchHistory = async (movieId: number) => {
    if (!userId) return;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watch_history')
          .delete()
          .eq('user_id', userId)
          .eq('movie_id', movieId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh the watch history after removing
      await fetchWatchHistory();
    } catch (err: any) {
      console.error('Error removing from watch history:', err);
      
      addError(createErrorMessage(
        'Failed to remove item from watch history. Please try again.',
        'error',
        () => removeFromWatchHistory(movieId),
        'Retry'
      ));
    }
  };

  useEffect(() => {
    fetchWatchHistory();
  }, [userId]);

  return {
    continueWatching,
    loading,
    error,
    addToWatchHistory,
    removeFromWatchHistory,
    refreshWatchHistory: fetchWatchHistory
  };
};