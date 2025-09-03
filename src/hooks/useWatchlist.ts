import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MovieWithProgress, UserWatchlistItem, UserWatchlistCategory } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, isNetworkError, createErrorMessage } from '../utils/errorHandling';

export const useWatchlist = (userId: string | null) => {
  const [watchlist, setWatchlist] = useState<MovieWithProgress[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();

  const fetchWatchlist = async () => {
    if (!userId) {
      setWatchlist([]);
      setWatchlistIds(new Set());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist')
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
            ),
            category:user_watchlist_categories (
              id,
              name,
              color
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      const moviesInWatchlist: MovieWithProgress[] = (data as (UserWatchlistItem & { movie: any })[])
        .filter(item => item.movie) // Filter out any items without movie data
        .map(item => {
          // Debug log to check movie data from watchlist
          console.log('Movie from watchlist:', item.movie.title, 'series_id:', item.movie.series_id);
          
          return {
            ...item.movie,
          is_in_watchlist: true,
          category_id: item.category_id,
          category: item.category,
          poster: item.movie.poster_url, // Map to frontend format
          landscapePoster: item.movie.landscape_poster_url, // Map to frontend format
          viewCount: item.movie.view_count // Map to frontend format
          };
        });

      const movieIds = new Set(moviesInWatchlist.map(movie => movie.id));

      setWatchlist(moviesInWatchlist);
      setWatchlistIds(movieIds);
    } catch (err: any) {
      console.error('Error fetching watchlist:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load your watchlist. Please check your connection and try again.',
        'error',
        () => fetchWatchlist(),
        'Retry'
      ));
      
      setWatchlist([]);
      setWatchlistIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (movieId: number) => {
    return addToWatchlistWithCategory(movieId, null);
  };

  const addToWatchlistWithCategory = async (movieId: number, categoryId: string | null) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist')
          .insert({
            user_id: userId,
            movie_id: movieId,
            category_id: categoryId
          });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Update local state
      setWatchlistIds(prev => new Set([...prev, movieId]));
      
      // Refresh the watchlist
      await fetchWatchlist();
      
      addError(createErrorMessage(
        'Movie added to your watchlist!',
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error adding to watchlist:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to add movie to watchlist. Please try again.',
        'error',
        () => addToWatchlist(movieId),
        'Retry'
      ));
      
      return false;
    }
  };

  const moveToCategory = async (movieId: number, categoryId: string | null) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist')
          .update({ category_id: categoryId })
          .eq('user_id', userId)
          .eq('movie_id', movieId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh the watchlist
      await fetchWatchlist();
      
      const categoryName = categoryId ? 'category' : 'uncategorized';
      addError(createErrorMessage(
        `Movie moved to ${categoryName} successfully!`,
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error moving to category:', err);
      
      addError(createErrorMessage(
        'Failed to move movie to category. Please try again.',
        'error',
        () => moveToCategory(movieId, categoryId),
        'Retry'
      ));
      
      return false;
    }
  };

  const removeFromWatchlist = async (movieId: number) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist')
          .delete()
          .eq('user_id', userId)
          .eq('movie_id', movieId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Update local state
      setWatchlistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(movieId);
        return newSet;
      });

      // Refresh the watchlist
      await fetchWatchlist();
      
      addError(createErrorMessage(
        'Movie removed from your watchlist.',
        'info'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error removing from watchlist:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to remove movie from watchlist. Please try again.',
        'error',
        () => removeFromWatchlist(movieId),
        'Retry'
      ));
      
      return false;
    }
  };

  const isInWatchlist = (movieId: number) => {
    return watchlistIds.has(movieId);
  };

  useEffect(() => {
    fetchWatchlist();
  }, [userId]);

  return {
    watchlist,
    loading,
    error,
    addToWatchlist,
    addToWatchlistWithCategory,
    moveToCategory,
    removeFromWatchlist,
    isInWatchlist,
    refreshWatchlist: fetchWatchlist
  };
};