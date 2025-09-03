import React, { useState } from 'react';
import { ArrowLeft, Heart, Trash2, Search, Filter, Folder, Plus, MoreVertical, Move } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchlistCategories } from '../hooks/useWatchlistCategories';
import { MovieWithProgress } from '../types/database';
import CategoryModal from './CategoryModal';

interface WatchlistPageProps {
  user: any;
  onBack: () => void;
  onMovieClick: (movie: MovieWithProgress) => void;
}

const WatchlistPage: React.FC<WatchlistPageProps> = ({ user, onBack, onMovieClick }) => {
  const { watchlist, loading, error, removeFromWatchlist, moveToCategory } = useWatchlist(user?.id || null);
  const { 
    categories, 
    loading: categoriesLoading, 
    createCategory, 
    updateCategory, 
    deleteCategory 
  } = useWatchlistCategories(user?.id || null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState<number | null>(null);

  // Get unique genres from watchlist
  const availableGenres = ['All', ...new Set(watchlist.map(movie => movie.genre))];

  // Get category options for filtering
  const categoryOptions = [
    'All',
    'Uncategorized',
    ...categories.map(cat => cat.name)
  ];

  // Filter watchlist based on search and genre
  const filteredWatchlist = watchlist.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         movie.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === 'All' || movie.genre === genreFilter;
    
    let matchesCategory = true;
    if (categoryFilter === 'Uncategorized') {
      matchesCategory = !movie.category_id;
    } else if (categoryFilter !== 'All') {
      matchesCategory = movie.category?.name === categoryFilter;
    }
    
    return matchesSearch && matchesGenre && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRemoveFromWatchlist = async (movieId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoveMenu(null);
    if (window.confirm('Remove this movie from your watchlist?')) {
      await removeFromWatchlist(movieId);
    }
  };

  const handleMoveToCategory = async (movieId: number, categoryId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoveMenu(null);
    await moveToCategory(movieId, categoryId);
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6B7280'; // Gray for uncategorized
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6B7280';
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
            <h1 className="text-3xl font-bold">My Watchlist</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Loading your watchlist...</p>
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
            <h1 className="text-3xl font-bold">My Watchlist</h1>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Watchlist</h2>
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
              <h1 className="text-3xl font-bold">My Watchlist</h1>
              <p className="text-gray-400 mt-1">
                {watchlist.length} {watchlist.length === 1 ? 'movie' : 'movies'} saved
              </p>
            </div>
          </div>
          
          {/* Manage Categories Button */}
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <Folder className="w-4 h-4 mr-2" />
            Manage Categories
          </button>
        </div>

        {/* Search and Filter Controls */}
        {watchlist.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your watchlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 text-white rounded-lg py-2 pl-10 pr-4 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Filters:</span>
              </div>
              
              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} className="bg-gray-800">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre Filter */}
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors"
              >
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre} className="bg-gray-800">
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results Info */}
        {watchlist.length > 0 && searchQuery && (
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              {filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'result' : 'results'} 
              {searchQuery && ` for "${searchQuery}"`}
              {categoryFilter !== 'All' && ` in ${categoryFilter}`}
              {genreFilter !== 'All' && ` in ${genreFilter}`}
            </p>
          </div>
        )}

        {/* Content */}
        {watchlist.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-4">
                <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Your Watchlist is Empty</h2>
              <p className="text-gray-400 mb-4">
                Add movies and shows you want to watch later.
              </p>
              <button
                onClick={onBack}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Browse Movies
              </button>
            </div>
          </div>
        ) : filteredWatchlist.length === 0 ? (
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
                  setCategoryFilter('All');
                  setGenreFilter('All');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWatchlist.map((movie) => (
              <div
                key={movie.id}
                className="group cursor-pointer relative"
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
                  
                  {/* Category Indicator */}
                  {movie.category && (
                    <div 
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getCategoryColor(movie.category_id) }}
                    >
                      {movie.category.name}
                    </div>
                  )}
                  
                  {movie.badge && (
                    <div className={`absolute ${movie.category ? 'top-8 left-2' : 'top-2 left-2'} px-2 py-1 rounded-full text-xs font-bold ${getBadgeStyles(movie.badge)}`}>
                      {movie.badge}
                    </div>
                  )}

                  {/* Action Menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoveMenu(showMoveMenu === movie.id ? null : movie.id);
                        }}
                        className="bg-black/70 hover:bg-gray-600 text-white p-2 rounded-full"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showMoveMenu === movie.id && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
                          <div className="py-1">
                            {/* Move to Category */}
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                              Move to Category
                            </div>
                            <button
                              onClick={(e) => handleMoveToCategory(movie.id, null, e)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center"
                            >
                              <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                              Uncategorized
                            </button>
                            {categories.map((category) => (
                              <button
                                key={category.id}
                                onClick={(e) => handleMoveToCategory(movie.id, category.id, e)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center"
                              >
                                <div 
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </button>
                            ))}
                            
                            <div className="border-t border-gray-700 my-1" />
                            
                            {/* Remove from Watchlist */}
                            <button
                              onClick={(e) => handleRemoveFromWatchlist(movie.id, e)}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from Watchlist
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Movie Info */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center text-white text-sm">
                      <Heart className="w-3 h-3 mr-1 fill-current" />
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
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">
                      Added: {formatDate(movie.created_at)}
                    </p>
                    {movie.category && (
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: getCategoryColor(movie.category_id) }}
                        />
                        <span className="text-gray-500 text-xs">{movie.category.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Category Management Modal */}
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          loading={categoriesLoading}
        />
      </div>
      
      {/* Click outside to close menu */}
      {showMoveMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowMoveMenu(null)}
        />
      )}
    </div>
  );
};

export default WatchlistPage;