import React, { useState } from 'react';
import { Coins, CreditCard, Smartphone, ShoppingCart, Star, History, Zap } from 'lucide-react';
import { useUserCoins } from '../hooks/useUserCoins';
import { CoinPackage } from '../types/database';

interface CoinPurchaseSectionProps {
  userId: string;
  userEmail?: string;
  onNavigateToTransactionHistory?: () => void;
}

const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'new-user-special',
    name: '500 Coins',
    coins: 500,
    bonus: 0,
    price: 4.99,
    currency: 'USD',
    isNewUserOffer: true
  },
  {
    id: 'package-1000',
    name: '1000 Coins + 150 Bonus',
    coins: 1000,
    bonus: 150,
    price: 9.99,
    currency: 'USD',
    bonusPercentage: 15
  },
  {
    id: 'package-1500',
    name: '1500 Coins + 300 Bonus',
    coins: 1500,
    bonus: 300,
    price: 14.99,
    currency: 'USD',
    bonusPercentage: 20
  },
  {
    id: 'package-2500',
    name: '2500 Coins + 875 Bonus',
    coins: 2500,
    bonus: 875,
    price: 24.99,
    currency: 'USD',
    bonusPercentage: 35,
    isPopular: true
  },
  {
    id: 'package-5000',
    name: '5000 Coins + 2500 Bonus',
    coins: 5000,
    bonus: 2500,
    price: 49.99,
    currency: 'USD',
    bonusPercentage: 50
  },
  {
    id: 'package-10000',
    name: '10000 Coins + 10000 Bonus',
    coins: 10000,
    bonus: 10000,
    price: 99.99,
    currency: 'USD',
    bonusPercentage: 100
  }
];

const PAYMENT_METHODS = [
  {
    id: 'credit_card',
    name: 'Credit Card',
    icon: CreditCard,
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: Smartphone,
    description: 'Pay with your PayPal account'
  }
];

const CoinPurchaseSection: React.FC<CoinPurchaseSectionProps> = ({ userId, userEmail, onNavigateToTransactionHistory }) => {
  const { balance, loading, error } = useUserCoins(userId);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedPaymentMethod) return;

    setPurchasing(true);
    
    try {
      // TODO: Integrate with Stripe
      // This is where we'll create a Stripe checkout session
      console.log('Initiating purchase:', {
        package: selectedPackage,
        paymentMethod: selectedPaymentMethod,
        userId,
        userEmail
      });
      
      // Placeholder for Stripe integration
      alert('Stripe integration coming soon! This will redirect to secure checkout.');
      
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 mb-6">
      <div className="flex items-center mb-6">
        <div className="bg-yellow-600 rounded-full p-3 mr-4">
          <Coins className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Account Balance</h2>
          <p className="text-gray-400">Purchase coins to unlock premium content</p>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Coins className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-white font-semibold text-lg">
                {balance?.coins || 0} Coins
              </span>
            </div>
            <div className="flex items-center">
              <Star className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-white font-semibold text-lg">
                {balance?.bonus_coins || 0} Bonus
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToTransactionHistory}
            className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"
          >
            <History className="w-4 h-4 mr-1" />
            History
          </button>
        </div>
      </div>

      {/* Coin Packages */}
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Choose a Package
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COIN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:scale-105 ${
                selectedPackage?.id === pkg.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              } ${
                pkg.isNewUserOffer
                  ? 'ring-2 ring-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'
                  : ''
              }`}
            >
              {/* Special Badges */}
              {pkg.isNewUserOffer && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                  NEW USER
                </div>
              )}
              {pkg.isPopular && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  POPULAR
                </div>
              )}
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="w-6 h-6 text-yellow-400 mr-2" />
                  <span className="text-white font-bold text-xl">{pkg.coins.toLocaleString()}</span>
                </div>
                
                {pkg.bonus > 0 && (
                  <div className="flex items-center justify-center mb-2">
                    <Star className="w-4 h-4 text-purple-400 mr-1" />
                    <span className="text-purple-400 font-medium">
                      +{pkg.bonus.toLocaleString()} Bonus
                    </span>
                    {pkg.bonusPercentage && (
                      <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        +{pkg.bonusPercentage}%
                      </span>
                    )}
                  </div>
                )}
                
                <div className="text-2xl font-bold text-white mb-2">
                  {formatPrice(pkg.price, pkg.currency)}
                </div>
                
                {pkg.bonus > 0 && (
                  <div className="text-gray-400 text-sm">
                    Total: {(pkg.coins + pkg.bonus).toLocaleString()} coins
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Method
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAYMENT_METHODS.map((method) => {
            const IconComponent = method.icon;
            return (
              <div
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:scale-105 ${
                  selectedPaymentMethod === method.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center">
                  <IconComponent className="w-6 h-6 text-blue-400 mr-3" />
                  <div>
                    <div className="text-white font-semibold">{method.name}</div>
                    <div className="text-gray-400 text-sm">{method.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!selectedPackage || !selectedPaymentMethod || purchasing}
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center ${
          selectedPackage && selectedPaymentMethod && !purchasing
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {purchasing ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        ) : (
          <Zap className="w-6 h-6 mr-2" />
        )}
        {purchasing ? 'Processing...' : selectedPackage ? `Pay ${formatPrice(selectedPackage.price, selectedPackage.currency)}` : 'Select Package & Payment Method'}
      </button>

      {/* Transaction History Placeholder */}
      {showTransactionHistory && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h4 className="text-white font-semibold mb-3">Recent Transactions</h4>
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-500 text-sm">Your purchase history will appear here</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default CoinPurchaseSection;