import React, { useState, useEffect } from 'react';
import { Search, Menu, X, Play, ChevronLeft, ChevronRight, Globe, XCircle, User } from 'lucide-react';
import AuthPage from './components/AuthPage';
import MovieCard from './components/MovieCard';
import SkeletonCard from './components/SkeletonCard';
import VideoPlayer from './components/VideoPlayer';
import MovieDetailPage from './components/MovieDetailPage';
import WatchHistoryPage from './components/WatchHistoryPage';
import WatchlistPage from './components/WatchlistPage';
import ProfilePage from './components/ProfilePage';
import TransactionHistoryPage from './components/TransactionHistoryPage';
import { supabase } from './lib/supabase';
import { useWatchHistory } from './hooks/useWatchHistory';
import { useWatchlist } from './hooks/useWatchlist';
import { Movie, MovieWithProgress } from './types/database';
import { useError } from './contexts/ErrorContext';
import { withRetry, getErrorMessage, createErrorMessage } from './utils/errorHandling';

// Helper functions for filtering and sorting
const filterMoviesByGenre = (movies: Movie[], genre: string): Movie[] => {
  if (genre === 'All') return movies;
  return movies.filter(movie => movie.genre === genre);
};

const filterMoviesByTheme = (movies: Movie[], theme: string): Movie[] => {
  if (theme === 'All') return movies;
  return movies.filter(movie => 
    movie.genre.toLowerCase().includes(theme.toLowerCase()) ||
    movie.title.toLowerCase().includes(theme.toLowerCase()) ||
    (movie.synopsis && movie.synopsis.toLowerCase().includes(theme.toLowerCase()))
  );
};

const parseViewCount = (viewCount: string): number => {
  const num = parseFloat(viewCount);
  if (viewCount.includes('M')) return num * 1000000;
  if (viewCount.includes('K')) return num * 1000;
  return num;
};

const sortMovies = (movies: Movie[], sortOption: string): Movie[] => {
  const sorted = [...movies];
  
  switch (sortOption) {
    case 'popularity':
      return sorted.sort((a, b) => parseViewCount(b.view_count) - parseViewCount(a.view_count));
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'alphabetical':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'episodes':
      return sorted.sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    default:
      return sorted;
  }
};

const getFilteredAndSortedMovies = (movies: Movie[], genreFilter: string, themeFilter: string, sortOption: string): Movie[] => {
  let filtered = filterMoviesByGenre(movies, genreFilter);
  filtered = filterMoviesByTheme(filtered, themeFilter);
  return sortMovies(filtered, sortOption);
};

const HeroCarousel: React.FC<{ movies: Movie[]; onHeroPlayClick: (movie: Movie) => void }> = ({ movies, onHeroPlayClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const heroMovies = movies.slice(0, 5);

  // Check if screen is mobile size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // 768px is Tailwind's md breakpoint
    };

    // Check on mount
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup event listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (heroMovies.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroMovies.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [heroMovies.length]);

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

  // Don't render if no movies
  if (heroMovies.length === 0) {
    return (
      <div className="relative h-[500px] md:h-[450px] overflow-hidden bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-12 h-12 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading featured content...</p>
        </div>
      </div>
    );
  }

  const currentMovie = heroMovies[currentSlide];

  return (
    <div className="relative h-[500px] md:h-[450px] overflow-hidden">
      {/* Full-width background image for all screens */}
      <img
        src={isMobile ? currentMovie.poster_url : currentMovie.landscape_poster_url}
        alt={currentMovie.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      
      {/* Dark gradient overlay for all screens */}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/50 to-black/90" />
      
      <div className="absolute inset-0 flex items-end md:items-center pb-8 md:pb-0">
        <div className="container mx-auto px-6">

          {/* Movie Info */}
          <div className="flex-1 text-white">
            {/* Badge above title */}
            {currentMovie.badge && (
              <div className={`mb-2 px-2 py-1 rounded-full text-xs font-bold inline-block ${getBadgeStyles(currentMovie.badge)}`}>
                {currentMovie.badge}
              </div>
            )}
            
            <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-3">{currentMovie.title}</h1>
            <p className="text-sm md:text-xl text-gray-300 mb-3 md:mb-4">{currentMovie.episodes} Episodes</p>
            <p className="text-gray-200 text-sm md:text-lg leading-relaxed mb-4 md:mb-6 max-w-3xl">
              {currentMovie.synopsis}
            </p>
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <span className={`px-3 py-1 rounded-full text-sm md:text-base font-medium bg-gray-700 text-white`}>
                {currentMovie.genre}
              </span>
              <span className="text-gray-400 flex items-center text-sm md:text-base">
                <Play className="w-4 h-4 mr-1" />
                {currentMovie.view_count} views
              </span>
            </div>
            <button className="bg-white text-black px-6 md:px-10 py-2 md:py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center text-sm md:text-lg"
              onClick={() => onHeroPlayClick(currentMovie)}>
              <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
              Play Now
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {heroMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-white' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const CategorySection: React.FC<{ title: string; movies: Movie[]; onMovieClick: (movie: Movie) => void }> = ({ title, movies, onMovieClick }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className="text-white text-xl font-semibold">{title}</h2>
        <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center">
          More
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      <div className="px-6">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {movies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              showEpisodes={false}
              onClick={() => onMovieClick(movie)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ContinueWatchingSection: React.FC<{ movies: MovieWithProgress[]; loading: boolean; onMovieClick: (movie: MovieWithProgress) => void }> = ({ movies, loading, onMovieClick }) => {
  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-6">
          <h2 className="text-white text-xl font-semibold">Continue Watching</h2>
        </div>
        <div className="px-6">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return null; // Don't show the section if there's no watch history
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className="text-white text-xl font-semibold">Continue Watching</h2>
        <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center">
          More
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      <div className="px-6">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {movies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              showEpisodes={true}
              showProgress={true}
              onClick={() => onMovieClick(movie)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const WatchlistSection: React.FC<{ movies: MovieWithProgress[]; loading: boolean; onMovieClick: (movie: MovieWithProgress) => void }> = ({ movies, loading, onMovieClick }) => {
  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-6">
          <h2 className="text-white text-xl font-semibold">My Watchlist</h2>
        </div>
        <div className="px-6">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return null; // Don't show the section if there's no watchlist
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className="text-white text-xl font-semibold">My Watchlist</h2>
        <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center">
          More
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      <div className="px-6">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {movies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              showEpisodes={true}
              onClick={() => onMovieClick(movie)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Page navigation state
  const [currentPage, setCurrentPage] = useState<'home' | 'watchHistory' | 'watchlist' | 'profile' | 'transactionHistory'>('home');
  
  // Movie data state
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreMovies, setHasMoreMovies] = useState(true);
  const [loadingMoreMovies, setLoadingMoreMovies] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState<string | null>(null);
  
  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('All');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('All');
  const [selectedSortOption, setSortOption] = useState('popularity');
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Movie interaction state
  const [selectedMovie, setSelectedMovie] = useState<MovieWithProgress | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedMovieForDetails, setSelectedMovieForDetails] = useState<MovieWithProgress | null>(null);
  const [showMovieDetails, setShowMovieDetails] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [watchlistActionLoading, setWatchlistActionLoading] = useState(false);
  
  // Error handling
  const { addError } = useError();
  
  // Generate available genres from movies data
  const availableGenres = ['All', ...new Set(movies.map(movie => movie.genre))];
  
  // Define specific themes for the Theme dropdown
  const availableThemes = [
    'All', 'Werewolf', 'BL', 'CEO', 'Revenge', 'Mafia', 'Second Chance', 
    'Contract Marriage', 'Billionaire', 'Love Triangle', 'Paranormal', 
    'Concealed Identity', 'Forbidden Love', 'Betrayal', 'Urban', 
    'Rags-To-Riches', 'Love at First Sight', 'Comedy', 'Romance', 
    'Fantasy', 'Mystery', 'Suspense', 'Drama', 'Action', 'Thriller'
  ];
  
  // Generate categories dynamically from fetched movies
  const categories = [
    { title: 'Trending', movies: movies.slice(2, 7) },
    { title: 'Popular', movies: movies.slice(1, 6) },
    { title: 'New', movies: sortMovies(movies.filter(m => m.badge === 'New'), 'newest') },
    { title: 'African', movies: movies.slice(3, 8) },
    { title: 'Romance', movies: movies.filter(m => m.genre.includes('Romance') || m.genre === 'BL') },
    { title: 'Documentary', movies: movies.slice(0, 3) },
    { title: 'Animation', movies: movies.slice(4, 7) },
    { title: 'Podcast', movies: movies.slice(1, 4) },
    { title: 'Movies', movies: movies.slice(0, 5) },
    { title: 'TV Series', movies: movies.slice(3, 8) }
  ];
  
  // Use the watch history hook
  const { continueWatching, loading: watchHistoryLoading, addToWatchHistory } = useWatchHistory(user?.id || null);
  
  // Use the watchlist hook
  const { 
    watchlist, 
    loading: watchlistLoading, 
    addToWatchlist, 
    removeFromWatchlist, 
    isInWatchlist 
  } = useWatchlist(user?.id || null);

  // Prevent body scrolling when modal-like components are open
  useEffect(() => {
    const shouldPreventScroll = showAuthPage || selectedMovieForDetails || showVideoPlayer;
    
    if (shouldPreventScroll) {
      // Store original overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore original overflow
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showAuthPage, selectedMovieForDetails, showVideoPlayer]);

  // Fetch movies from Supabase
  const fetchMovies = async (pageNum: number = 1, limit: number = 24, append: boolean = false) => {
    if (pageNum === 1) {
      setMoviesLoading(true);
    } else {
      setLoadingMoreMovies(true);
    }
    setMoviesError(null);
    
    try {
      const startRange = (pageNum - 1) * limit;
      const endRange = pageNum * limit - 1;
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('movies')
          .select(`
            id,
            title,
            genre,
            view_count,
            poster_url,
            landscape_poster_url,
            badge,
            synopsis,
            episodes,
            duration_seconds,
            created_at,
            series_id,
            episode_number
          `)
          .or('series_id.is.null,episode_number.eq.1')
          .range(startRange, endRange)
          .order('created_at', { ascending: false });
        
        if (result.error) throw result.error;
        return result;
      });
      
      if (error) throw error;
      
      const newMovies = data || [];
      
      // Debug log to check movie data from main fetch
      console.log('Movie from fetchMovies:', newMovies[0]?.title, 'series_id:', newMovies[0]?.series_id);
      
      if (append && pageNum > 1) {
        setMovies(prevMovies => [...prevMovies, ...newMovies]);
      } else {
        setMovies(newMovies);
      }
      
      // Check if there are more movies to load
      setHasMoreMovies(newMovies.length === limit);
      
    } catch (err: any) {
      console.error('Error fetching movies:', err);
      const errorMessage = getErrorMessage(err);
      setMoviesError(errorMessage);
      
      // Show user-friendly error with retry option
      addError(createErrorMessage(
        'Failed to load movies. Please check your connection and try again.',
        'error',
        () => fetchMovies(pageNum, limit, append),
        'Retry'
      ));
      
      if (!append) {
        setMovies([]); // Set empty array on error only for initial load
      }
    } finally {
      if (pageNum === 1) {
        setMoviesLoading(false);
      } else {
        setLoadingMoreMovies(false);
      }
    }
  };

  // Fetch movies on component mount
  useEffect(() => {
    fetchMovies(1, 24, false);
  }, []);

  // Search functionality with Supabase
  const performSearch = async (query: string) => {
    if (query.trim() === '') {
      setFilteredMovies([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const searchTerm = `%${query.trim()}%`;
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('movies')
          .select(`
            id,
            title,
            genre,
            view_count,
            poster_url,
            landscape_poster_url,
            badge,
            synopsis,
            episodes,
            duration_seconds,
            created_at
          `)
          .or(`title.ilike.${searchTerm},genre.ilike.${searchTerm}`)
          .order('view_count', { ascending: false });
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      let searchResults = data || [];
      
      // Apply genre filter to search results
      searchResults = filterMoviesByGenre(searchResults, selectedGenreFilter);
      
      // Apply theme filter to search results
      searchResults = filterMoviesByTheme(searchResults, selectedThemeFilter);
      
      // Apply sorting to search results
      searchResults = sortMovies(searchResults, selectedSortOption);
      
      setFilteredMovies(searchResults);
    } catch (err: any) {
      console.error('Error searching movies:', err);
      const errorMessage = getErrorMessage(err);
      setSearchError(errorMessage);
      
      addError(createErrorMessage(
        'Search failed. Please try again.',
        'error',
        () => performSearch(query),
        'Retry Search'
      ));
      
      setFilteredMovies([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 400); // 400ms debounce - optimized for better UX

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedGenreFilter, selectedThemeFilter, selectedSortOption]);

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 && // Trigger 1000px before bottom
        hasMoreMovies &&
        !loadingMoreMovies &&
        !moviesLoading &&
        !searchQuery && // Only for main content, not search results
        currentPage === 'home'
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMovies(nextPage, 24, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreMovies, loadingMoreMovies, moviesLoading, searchQuery, currentPage, page]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchError(null);
  };

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthPage(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setUser(null);
      setCurrentPage('home'); // Reset to home page on logout
      
      addError(createErrorMessage(
        'Successfully signed out.',
        'success'
      ));
    } catch (err: any) {
      console.error('Error signing out:', err);
      addError(createErrorMessage(
        'Failed to sign out. Please try again.',
        'error',
        handleLogout,
        'Retry'
      ));
    }
  };

  const handleMovieClick = (movie: Movie | MovieWithProgress) => {
    // Convert Movie to MovieWithProgress if needed
    const movieWithProgress: MovieWithProgress = {
      ...movie,
      progress_seconds: 'progress_seconds' in movie ? movie.progress_seconds : undefined,
      total_duration_seconds: 'total_duration_seconds' in movie ? movie.total_duration_seconds : undefined,
      last_watched_at: 'last_watched_at' in movie ? movie.last_watched_at : undefined,
    };
    
    setSelectedMovieForDetails(movieWithProgress);
    setShowMovieDetails(true);
  };

  const handleWatchNow = (movie: MovieWithProgress) => {
    setSelectedMovie(movie);
    setShowVideoPlayer(true);
    setShowMovieDetails(false);
  };

  const handleCloseMovieDetails = () => {
    setShowMovieDetails(false);
    setSelectedMovieForDetails(null);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedMovie(null);
  };

  const handleProgressUpdate = async (movieId: number, progressSeconds: number, totalDurationSeconds: number) => {
    if (user?.id) {
      await addToWatchHistory(movieId, progressSeconds, totalDurationSeconds);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!selectedMovieForDetails || !user?.id) return;

    setWatchlistActionLoading(true);
    
    try {
      if (isInWatchlist(selectedMovieForDetails.id)) {
        await removeFromWatchlist(selectedMovieForDetails.id);
      } else {
        await addToWatchlist(selectedMovieForDetails.id);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      addError(createErrorMessage(
        'Failed to update watchlist. Please try again.',
        'error',
        handleToggleWatchlist,
        'Retry'
      ));
    } finally {
      setWatchlistActionLoading(false);
    }
  };

  const handleAddToWatchlistWithCategory = async (categoryId: string | null) => {
    if (!selectedMovieForDetails || !user?.id) return;

    setWatchlistActionLoading(true);
    
    try {
      await addToWatchlistWithCategory(selectedMovieForDetails.id, categoryId);
    } catch (error) {
      console.error('Error adding to watchlist with category:', error);
      addError(createErrorMessage(
        'Failed to add to watchlist. Please try again.',
        'error',
        () => handleAddToWatchlistWithCategory(categoryId),
        'Retry'
      ));
    } finally {
      setWatchlistActionLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center">
              {/* Logo placeholder - you can add your logo here */}
              <h1 className="text-white text-xl font-bold">OnairePlay</h1>
            </div>

            {/* Center: Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => setCurrentPage('home')}
                className={`transition-colors ${currentPage === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Home
              </button>
              
              {/* Theme Dropdown */}
              <div className="relative group">
                <button className="text-gray-400 hover:text-white transition-colors flex items-center">
                  Theme
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:rotate-90 transition-transform" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {availableThemes.map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSelectedThemeFilter(theme)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-800 ${
                          selectedThemeFilter === theme ? 'text-blue-400 bg-gray-800' : 'text-gray-300'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {isLoggedIn && (
                <>
                  <button 
                    onClick={() => setCurrentPage('watchHistory')}
                    className={`transition-colors ${currentPage === 'watchHistory' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Continue Watching
                  </button>
                  <button 
                    onClick={() => setCurrentPage('watchlist')}
                    className={`transition-colors ${currentPage === 'watchlist' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    My Watchlist
                  </button>
                </>
              )}
              
              {/* Language Dropdown */}
              <div className="relative">
                <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-gray-400 hover:text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="English" className="bg-black">English</option>
                  <option value="Spanish" className="bg-black">Español</option>
                  <option value="French" className="bg-black">Français</option>
                </select>
              </div>
            </div>

            {/* Right: Search and Login */}
            <div className="flex items-center space-x-4">
              {/* Mobile Search - Always Visible */}
              <div className="md:hidden relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg py-2 pl-10 pr-8 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Desktop Search */}
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg py-2 pl-10 pr-4 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  {/* User Profile Button with Avatar */}
                  <button
                    onClick={() => setCurrentPage('profile')}
                    className="hidden sm:flex items-center space-x-2 text-gray-300 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg"
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.email?.split('@')[0] || 'Profile'}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthPage(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-white"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => setCurrentPage('home')}
                  className={`transition-colors ${currentPage === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Home
                </button>
                
                {/* Mobile Theme Filter */}
                <div>
                  <label className="text-white font-medium text-sm mb-2 block">Theme:</label>
                  <select
                    value={selectedThemeFilter}
                    onChange={(e) => setSelectedThemeFilter(e.target.value)}
                    className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors w-full"
                  >
                    {availableThemes.map((theme) => (
                      <option key={theme} value={theme} className="bg-gray-800">
                        {theme}
                      </option>
                    ))}
                  </select>
                </div>
                
                
                {/* Mobile Theme Filter */}
                <div>
                    <button 
                      onClick={() => setCurrentPage('watchHistory')}
                      className={`transition-colors ${currentPage === 'watchHistory' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Continue Watching
                    </button>
                </div>

                {/* Mobile Language Selection */}
                <div>
                  <label className="text-white font-medium text-sm mb-2 block">Language:</label>
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors w-full"
                  >
                    <option value="English" className="bg-gray-800">English</option>
                    <option value="Spanish" className="bg-gray-800">Español</option>
                    <option value="French" className="bg-gray-800">Français</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuthPage && (
        <AuthPage
          onClose={() => setShowAuthPage(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Movie Detail Modal */}
      {showMovieDetails && selectedMovieForDetails && (
        <MovieDetailPage
          movie={selectedMovieForDetails}
          onClose={handleCloseMovieDetails}
          onWatchNow={() => handleWatchNow(selectedMovieForDetails)}
          isLoggedIn={isLoggedIn}
          user={user}
          isInWatchlist={isInWatchlist(selectedMovieForDetails.id)}
          onToggleWatchlist={handleToggleWatchlist}
          onAddToWatchlistWithCategory={handleAddToWatchlistWithCategory}
          watchlistLoading={watchlistActionLoading}
        />
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && selectedMovie && (
        <VideoPlayer
          movie={selectedMovie}
          onClose={handleCloseVideoPlayer}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      {/* Main Content */}
      <div className="pt-20">
        {/* Render different pages based on currentPage state */}
        {currentPage === 'watchHistory' && isLoggedIn && (
          <WatchHistoryPage
            user={user}
            onBack={() => setCurrentPage('home')}
            onMovieClick={handleMovieClick}
          />
        )}
        
        {currentPage === 'watchlist' && isLoggedIn && (
          <WatchlistPage
            user={user}
            onBack={() => setCurrentPage('home')}
            onMovieClick={handleMovieClick}
          />
        )}
        
        {currentPage === 'profile' && isLoggedIn && (
          <ProfilePage
            user={user}
            onBack={() => setCurrentPage('home')}
            onNavigateToTransactionHistory={() => setCurrentPage('transactionHistory')}
          />
        )}
        
        {currentPage === 'transactionHistory' && isLoggedIn && (
          <TransactionHistoryPage
            user={user}
            onBack={() => setCurrentPage('profile')}
          />
        )}
        
        {/* Home Page Content */}
        {currentPage === 'home' && (
          <>
            {/* Loading State */}
            {moviesLoading && (
              <div className="py-8">
                {/* Hero skeleton */}
                <div className="relative h-[500px] md:h-[450px] overflow-hidden bg-gray-900 animate-pulse mb-8">
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/50 to-black/90" />
                  <div className="absolute inset-0 flex items-end md:items-center pb-8 md:pb-0">
                    <div className="container mx-auto px-6">
                      <div className="flex-1 text-white">
                        <div className="w-16 h-6 bg-gray-700 rounded mb-2" />
                        <div className="w-80 h-12 bg-gray-800 rounded mb-3" />
                        <div className="w-48 h-6 bg-gray-700 rounded mb-4" />
                        <div className="w-full max-w-3xl h-20 bg-gray-700 rounded mb-6" />
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-20 h-8 bg-gray-700 rounded-full" />
                          <div className="w-24 h-6 bg-gray-700 rounded" />
                        </div>
                        <div className="w-32 h-12 bg-gray-700 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Category skeletons */}
                {Array.from({ length: 4 }).map((_, categoryIndex) => (
                  <div key={categoryIndex} className="mb-8">
                    <div className="flex items-center justify-between mb-4 px-6">
                      <div className="w-32 h-6 bg-gray-800 rounded animate-pulse" />
                      <div className="w-12 h-4 bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="px-6">
                      <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
                        {Array.from({ length: 7 }).map((_, index) => (
                          <SkeletonCard key={index} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {moviesError && !moviesLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <div className="text-red-500 mb-4">
                    <X className="w-16 h-16 mx-auto" />
                  </div>
                  <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Movies</h2>
                  <p className="text-gray-400 mb-4">{moviesError}</p>
                  <button
                    onClick={() => fetchMovies(1, 24, false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Main Content - Only show when movies are loaded */}
            {!moviesLoading && !moviesError && movies.length > 0 && (
              <>
                {/* Hero Carousel */}
                <HeroCarousel movies={movies} onHeroPlayClick={(movie) => handleWatchNow(movie as MovieWithProgress)} />

                {/* Filter and Sort Controls */}
                {!searchQuery && (
                  <div className="py-6 px-6 border-b border-gray-800">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        {/* Genre Filter */}
                        <div className="flex items-center space-x-3">
                          <label className="text-white font-medium text-sm">Genre:</label>
                          <select
                            value={selectedGenreFilter}
                            onChange={(e) => setSelectedGenreFilter(e.target.value)}
                            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors"
                          >
                            {availableGenres.map((genre) => (
                              <option key={genre} value={genre} className="bg-gray-800">
                                {genre}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center space-x-3">
                          <label className="text-white font-medium text-sm">Sort by:</label>
                          <select
                            value={selectedSortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-500 transition-colors"
                          >
                            <option value="popularity" className="bg-gray-800">Most Popular</option>
                            <option value="newest" className="bg-gray-800">Newest First</option>
                            <option value="oldest" className="bg-gray-800">Oldest First</option>
                            <option value="alphabetical" className="bg-gray-800">A-Z</option>
                            <option value="episodes" className="bg-gray-800">Most Episodes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Sections */}
                <div className="py-8">
                  {/* Search Results */}
                  {searchQuery && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4 px-6">
                        <h2 className="text-white text-xl font-semibold">
                          Search Results for "{searchQuery}"
                        </h2>
                        <button 
                          onClick={clearSearch}
                          className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center"
                        >
                          Clear
                          <X className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                      <div className="px-6">
                        {searchLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                              <p className="text-white">Searching movies...</p>
                            </div>
                          </div>
                        ) : searchError ? (
                          <div className="text-center py-12">
                            <div className="text-red-500 mb-4">
                              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <p className="text-xl">Search Error</p>
                              <p className="text-sm mt-2 text-gray-400">{searchError}</p>
                            </div>
                            <button
                              onClick={() => performSearch(searchQuery)}
                              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                              Try Again
                            </button>
                          </div>
                        ) : filteredMovies.length > 0 ? (
                          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
                            {filteredMovies.map((movie) => (
                              <MovieCard 
                                key={movie.id} 
                                movie={movie} 
                                showEpisodes={false}
                                onClick={() => handleMovieClick(movie)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <p className="text-xl">No results found for "{searchQuery}"</p>
                              <p className="text-sm mt-2">Try searching for a different title or genre</p>
                            </div>
                            <button
                              onClick={clearSearch}
                              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                              Clear Search
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Continue Watching - Only show when logged in and has watch history */}
                  {isLoggedIn && (
                    <ContinueWatchingSection 
                      movies={continueWatching}
                      loading={watchHistoryLoading}
                      onMovieClick={handleMovieClick}
                    />
                  )}
                  
                  {/* My Watchlist - Only show when logged in and has watchlist items */}
                  {isLoggedIn && (
                    <WatchlistSection 
                      movies={watchlist}
                      loading={watchlistLoading}
                      onMovieClick={handleMovieClick}
                    />
                  )}
                  
                  {/* Other categories - Hide when searching */}
                  {!searchQuery && categories.map((category) => (
                    <CategorySection 
                      key={category.title} 
                      title={category.title} 
                      movies={getFilteredAndSortedMovies(category.movies, selectedGenreFilter, selectedThemeFilter, selectedSortOption)}
                      onMovieClick={handleMovieClick}
                    />
                  ))}
                </div>
                
                {/* Infinite Scroll Loading Indicator */}
                {!searchQuery && loadingMoreMovies && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white">Loading more movies...</p>
                    </div>
                  </div>
                )}
                
                {/* End of Content Indicator */}
                {!searchQuery && !hasMoreMovies && !loadingMoreMovies && movies.length > 0 && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-gray-400">You've reached the end of our collection!</p>
                      <p className="text-gray-500 text-sm mt-2">Check back later for new content</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State - When no movies in database */}
            {!moviesLoading && !moviesError && movies.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  </div>
                  <h2 className="text-white text-xl font-semibold mb-2">No Movies Available</h2>
                  <p className="text-gray-400 mb-4">There are currently no movies in the database.</p>
                  <button
                    onClick={() => fetchMovies(1, 24, false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Keyboard Shortcuts Help - Only show when video player is not active */}
      {!showVideoPlayer && (
        <div className="fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-400 max-w-xs opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="font-semibold text-white mb-2">Keyboard Shortcuts</div>
          <div className="space-y-1">
            <div><kbd className="bg-gray-700 px-1 rounded">Space</kbd> Play/Pause</div>
            <div><kbd className="bg-gray-700 px-1 rounded">←/→</kbd> Seek ±10s</div>
            <div><kbd className="bg-gray-700 px-1 rounded">↑/↓</kbd> Volume</div>
            <div><kbd className="bg-gray-700 px-1 rounded">M</kbd> Mute</div>
            <div><kbd className="bg-gray-700 px-1 rounded">F</kbd> Fullscreen</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;