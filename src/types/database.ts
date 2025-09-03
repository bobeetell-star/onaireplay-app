export interface Movie {
  id: number;
  title: string;
  genre: string;
  view_count: string;
  poster_url: string;
  landscape_poster_url: string;
  video_url?: string;
  video_url_720p?: string;
  video_url_1080p?: string;
  video_url_4k?: string;
  subtitle_url_en?: string;
  subtitle_url_es?: string;
  series_id?: string;
  episode_number?: number;
  badge?: 'Hot' | 'New' | 'Exclusive' | 'Discount' | null;
  synopsis?: string;
  episodes?: number;
  duration_seconds?: number;
  is_locked?: boolean;
  unlock_cost?: number;
  created_at: string;
  updated_at?: string;
}

export interface UserWatchHistory {
  id: string;
  user_id: string;
  movie_id: number;
  progress_seconds: number;
  total_duration_seconds: number;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
  movie?: Movie;
}

export interface MovieWithProgress extends Movie {
  progress_seconds?: number;
  total_duration_seconds?: number;
  last_watched_at?: string;
  is_in_watchlist?: boolean;
  is_unlocked?: boolean;
}

export interface UserWatchlistItem {
  id: string;
  user_id: string;
  movie_id: number;
  category_id?: string;
  created_at: string;
  movie?: Movie;
  category?: UserWatchlistCategory;
}

export interface UserWatchlistCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface MovieComment {
  id: string;
  movie_id: number;
  user_id: string;
  comment_text: string;
  created_at: string;
}

export interface UserBalance {
  user_id: string;
  coins: number;
  bonus_coins: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  package_name: string;
  coins_granted: number;
  bonus_granted: number;
  amount_paid: number;
  currency: string;
  payment_method: string;
  stripe_checkout_session_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface UserEpisodeUnlock {
  id: string;
  user_id: string;
  movie_id: number;
  unlocked_at: string;
  created_at: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonus: number;
  price: number;
  currency: string;
  bonusPercentage?: number;
  isNewUserOffer?: boolean;
  isPopular?: boolean;
}