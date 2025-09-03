import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MovieComment } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from '../utils/errorHandling';

export const useMovieComments = (movieId: number | null) => {
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addError } = useError();

  const fetchComments = async () => {
    if (!movieId) {
      setComments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('movie_comments')
          .select('*')
          .eq('movie_id', movieId)
          .order('created_at', { ascending: false });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      setComments(data || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load comments. Please try again.',
        'error',
        () => fetchComments(),
        'Retry'
      ));
      
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (userId: string, commentText: string) => {
    if (!movieId || !userId || !commentText.trim()) return false;

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('movie_comments')
          .insert({
            movie_id: movieId,
            user_id: userId,
            comment_text: commentText.trim()
          });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh comments after successful submission
      await fetchComments();
      
      addError(createErrorMessage(
        'Comment posted successfully!',
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to post comment. Please try again.',
        'error',
        () => addComment(userId, commentText),
        'Retry'
      ));
      
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string, userId: string) => {
    if (!commentId || !userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('movie_comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', userId); // Ensure user can only delete their own comments
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh comments after successful deletion
      await fetchComments();
      
      addError(createErrorMessage(
        'Comment deleted successfully.',
        'info'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to delete comment. Please try again.',
        'error',
        () => deleteComment(commentId, userId),
        'Retry'
      ));
      
      return false;
    }
  };

  useEffect(() => {
    fetchComments();
  }, [movieId]);

  return {
    comments,
    loading,
    error,
    submitting,
    addComment,
    deleteComment,
    refreshComments: fetchComments
  };
};