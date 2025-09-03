import React, { useState, useEffect } from 'react';
import { ArrowLeft, History, CreditCard, Calendar, Coins, Star, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types/database';
import { useError } from '../contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from '../utils/errorHandling';

interface TransactionHistoryPageProps {
  user: any;
  onBack: () => void;
}

const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ user, onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const { addError } = useError();

  const fetchTransactions = async () => {
    if (!user?.id) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      addError(createErrorMessage(
        'Failed to load transaction history. Please try again.',
        'error',
        () => fetchTransactions(),
        'Retry'
      ));
      
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
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

  const getPaymentMethodIcon = (method: string) => {
    if (method.toLowerCase().includes('card') || method.toLowerCase().includes('credit')) {
      return <CreditCard className="w-4 h-4" />;
    }
    return <CreditCard className="w-4 h-4" />;
  };

  // Filter transactions based on search and status
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.package_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.payment_method.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || transaction.status === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const getTotalSpent = () => {
    return transactions
      .filter(t => t.status === 'completed')
      .reduce((total, t) => total + Number(t.amount_paid), 0);
  };

  const getTotalCoinsEarned = () => {
    return transactions
      .filter(t => t.status === 'completed')
      .reduce((total, t) => total + t.coins_granted + t.bonus_granted, 0);
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
            <h1 className="text-3xl font-bold">Transaction History</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Loading transaction history...</p>
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
            <h1 className="text-3xl font-bold">Transaction History</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <XCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Transactions</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchTransactions}
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
              <h1 className="text-3xl font-bold">Transaction History</h1>
              <p className="text-gray-400 mt-1">
                {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-green-600 rounded-full p-3 mr-4">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Spent</p>
                  <p className="text-white text-2xl font-bold">
                    {formatPrice(getTotalSpent(), 'USD')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-yellow-600 rounded-full p-3 mr-4">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Coins Earned</p>
                  <p className="text-white text-2xl font-bold">
                    {getTotalCoinsEarned().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-blue-600 rounded-full p-3 mr-4">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Completed Purchases</p>
                  <p className="text-white text-2xl font-bold">
                    {transactions.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        {transactions.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 text-white rounded-lg py-2 pl-10 pr-4 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Status:</span>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors"
              >
                <option value="All" className="bg-gray-800">All Status</option>
                <option value="Completed" className="bg-gray-800">Completed</option>
                <option value="Pending" className="bg-gray-800">Pending</option>
                <option value="Failed" className="bg-gray-800">Failed</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Info */}
        {transactions.length > 0 && searchQuery && (
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'result' : 'results'} 
              {searchQuery && ` for "${searchQuery}"`}
              {statusFilter !== 'All' && ` with status "${statusFilter}"`}
            </p>
          </div>
        )}

        {/* Content */}
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-4">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">No Transactions Yet</h2>
              <p className="text-gray-400 mb-4">
                Your purchase history will appear here once you make your first coin purchase.
              </p>
              <button
                onClick={onBack}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Purchase Coins
              </button>
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">No Results Found</h2>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or filter criteria.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-800 rounded-full p-3">
                      {getPaymentMethodIcon(transaction.payment_method)}
                    </div>
                    
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {transaction.package_name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-yellow-400">
                          <Coins className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">
                            {transaction.coins_granted.toLocaleString()} coins
                          </span>
                        </div>
                        {transaction.bonus_granted > 0 && (
                          <div className="flex items-center text-purple-400">
                            <Star className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              +{transaction.bonus_granted.toLocaleString()} bonus
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-gray-400 text-sm">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(transaction.created_at)}
                        </div>
                        <span>•</span>
                        <span>{transaction.payment_method}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-white text-xl font-bold mb-2">
                      {formatPrice(Number(transaction.amount_paid), transaction.currency)}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span className="ml-2 capitalize">{transaction.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryPage;