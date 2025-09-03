import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserBalance } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from '../utils/errorHandling';

export const useUserCoins = (userId: string | null) => {
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();

  const fetchBalance = async () => {
    if (!userId) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      setBalance(data);
    } catch (err: any) {
      console.error('Error fetching user balance:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load your coin balance. Please try again.',
        'error',
        () => fetchBalance(),
        'Retry'
      ));
      
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (newCoins: number, newBonusCoins: number) => {
    if (!userId) return false;

    try {
      const { error } = await withRetry(async () => {
        const result = await supabase
          .from('user_balances')
          .update({
            coins: newCoins,
            bonus_coins: newBonusCoins
          })
          .eq('user_id', userId);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Update local state
      if (balance) {
        setBalance({
          ...balance,
          coins: newCoins,
          bonus_coins: newBonusCoins,
          updated_at: new Date().toISOString()
        });
      }

      return true;
    } catch (err: any) {
      console.error('Error updating balance:', err);
      
      addError(createErrorMessage(
        'Failed to update your balance. Please try again.',
        'error',
        () => updateBalance(newCoins, newBonusCoins),
        'Retry'
      ));
      
      return false;
    }
  };

  const addCoins = async (coinsToAdd: number, bonusCoinsToAdd: number = 0) => {
    if (!balance) return false;
    
    const newCoins = balance.coins + coinsToAdd;
    const newBonusCoins = balance.bonus_coins + bonusCoinsToAdd;
    
    return await updateBalance(newCoins, newBonusCoins);
  };

  const spendCoins = async (coinsToSpend: number) => {
    if (!balance) return false;
    
    const totalAvailable = balance.coins + balance.bonus_coins;
    if (totalAvailable < coinsToSpend) {
      addError(createErrorMessage(
        'Insufficient coins. Please purchase more coins to continue.',
        'warning'
      ));
      return false;
    }

    // Spend bonus coins first, then regular coins
    let newBonusCoins = balance.bonus_coins;
    let newCoins = balance.coins;
    let remaining = coinsToSpend;

    if (remaining > 0 && newBonusCoins > 0) {
      const bonusToSpend = Math.min(remaining, newBonusCoins);
      newBonusCoins -= bonusToSpend;
      remaining -= bonusToSpend;
    }

    if (remaining > 0) {
      newCoins -= remaining;
    }

    return await updateBalance(newCoins, newBonusCoins);
  };

  const canAfford = (cost: number) => {
    if (!balance) return false;
    return (balance.coins + balance.bonus_coins) >= cost;
  };
  useEffect(() => {
    fetchBalance();
  }, [userId]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
    updateBalance,
    addCoins,
    spendCoins,
    canAfford,
    totalCoins: balance ? balance.coins + balance.bonus_coins : 0
  };
};