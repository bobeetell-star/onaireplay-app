import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserEpisodeUnlock } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from '../utils/errorHandling';

export const useEpisodeUnlocks = (userId: string | null) => {
  const [unlockedEpisodes, setUnlockedEpisodes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();

  const fetchUnlockedEpisodes = async () => {
    if (!userId) {
      setUnlockedEpisodes(new Set());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('user_episode_unlocks')
          .select('movie_id')
          .eq('user_id', userId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      const unlockedIds = new Set(data?.map(unlock => unlock.movie_id) || []);
      setUnlockedEpisodes(unlockedIds);
    } catch (err: any) {
      console.error('Error fetching unlocked episodes:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load your unlocked episodes. Please try again.',
        'error',
        () => fetchUnlockedEpisodes(),
        'Retry'
      ));
      
      setUnlockedEpisodes(new Set());
    } finally {
      setLoading(false);
    }
  };

  const unlockEpisode = async (movieId: number, unlockCost: number) => {
    if (!userId) {
      addError(createErrorMessage(
        'Please sign in to unlock episodes.',
        'warning'
      ));
      return false;
    }

    try {
      // Check if episode is already unlocked
      if (unlockedEpisodes.has(movieId)) {
        addError(createErrorMessage(
          'This episode is already unlocked!',
          'info'
        ));
        return true;
      }

      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_episode_unlocks')
          .insert({
            user_id: userId,
            movie_id: movieId
          });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Update local state
      setUnlockedEpisodes(prev => new Set([...prev, movieId]));
      
      addError(createErrorMessage(
        `Episode unlocked successfully! ${unlockCost} coins deducted.`,
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error unlocking episode:', err);
      const errorMessage = getErrorMessage(err);
      
      // Handle specific error cases
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        // Episode was already unlocked (race condition)
        setUnlockedEpisodes(prev => new Set([...prev, movieId]));
        addError(createErrorMessage(
          'Episode is already unlocked!',
          'info'
        ));
        return true;
      }
      
      addError(createErrorMessage(
        'Failed to unlock episode. Please try again.',
        'error',
        () => unlockEpisode(movieId, unlockCost),
        'Retry'
      ));
      
      return false;
    }
  };

  const isEpisodeUnlocked = useCallback((movieId: number) => {
    return unlockedEpisodes.has(movieId);
  }, [unlockedEpisodes]);

  const getUnlockedEpisodesForSeries = (seriesId: string, allEpisodes: any[]) => {
    return allEpisodes.filter(episode => 
      episode.series_id === seriesId && unlockedEpisodes.has(episode.id)
    );
  };

  const getLockedEpisodesForSeries = (seriesId: string, allEpisodes: any[]) => {
    return allEpisodes.filter(episode => 
      episode.series_id === seriesId && 
      episode.is_locked && 
      !unlockedEpisodes.has(episode.id)
    );
  };

  const getTotalUnlockedCount = () => {
    return unlockedEpisodes.size;
  };

  useEffect(() => {
    fetchUnlockedEpisodes();
  }, [userId]);

  return {
    unlockedEpisodes,
    loading,
    error,
    unlockEpisode,
    isEpisodeUnlocked,
    getUnlockedEpisodesForSeries,
    getLockedEpisodesForSeries,
    getTotalUnlockedCount,
    refreshUnlockedEpisodes: fetchUnlockedEpisodes
  };
};