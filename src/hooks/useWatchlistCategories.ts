import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserWatchlistCategory } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from '../utils/errorHandling';

export const useWatchlistCategories = (userId: string | null) => {
  const [categories, setCategories] = useState<UserWatchlistCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();

  const fetchCategories = async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist_categories')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load watchlist categories. Please try again.',
        'error',
        () => fetchCategories(),
        'Retry'
      ));
      
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (name: string, color: string = '#3B82F6') => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist_categories')
          .insert({
            user_id: userId,
            name: name.trim(),
            color
          });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh categories
      await fetchCategories();
      
      addError(createErrorMessage(
        `Category "${name}" created successfully!`,
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error creating category:', err);
      const errorMessage = getErrorMessage(err);
      
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        addError(createErrorMessage(
          `A category named "${name}" already exists.`,
          'warning'
        ));
      } else {
        addError(createErrorMessage(
          'Failed to create category. Please try again.',
          'error',
          () => createCategory(name, color),
          'Retry'
        ));
      }
      
      return false;
    }
  };

  const updateCategory = async (categoryId: string, name: string, color: string) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist_categories')
          .update({
            name: name.trim(),
            color
          })
          .eq('id', categoryId)
          .eq('user_id', userId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh categories
      await fetchCategories();
      
      addError(createErrorMessage(
        'Category updated successfully!',
        'success'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error updating category:', err);
      const errorMessage = getErrorMessage(err);
      
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        addError(createErrorMessage(
          `A category named "${name}" already exists.`,
          'warning'
        ));
      } else {
        addError(createErrorMessage(
          'Failed to update category. Please try again.',
          'error',
          () => updateCategory(categoryId, name, color),
          'Retry'
        ));
      }
      
      return false;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_watchlist_categories')
          .delete()
          .eq('id', categoryId)
          .eq('user_id', userId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Refresh categories
      await fetchCategories();
      
      addError(createErrorMessage(
        'Category deleted successfully.',
        'info'
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error deleting category:', err);
      
      addError(createErrorMessage(
        'Failed to delete category. Please try again.',
        'error',
        () => deleteCategory(categoryId),
        'Retry'
      ));
      
      return false;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: fetchCategories
  };
};