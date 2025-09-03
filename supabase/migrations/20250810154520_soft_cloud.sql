/*
  # Create user watchlist table

  1. New Tables
    - `user_watchlist`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `movie_id` (integer, foreign key to movies)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_watchlist` table
    - Add policies for users to manage their own watchlist items

  3. Indexes
    - Add index on user_id for faster queries
    - Add unique constraint on user_id + movie_id to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS user_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Add foreign key constraints
ALTER TABLE user_watchlist 
ADD CONSTRAINT user_watchlist_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_watchlist 
ADD CONSTRAINT user_watchlist_movie_id_fkey 
FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own watchlist"
  ON user_watchlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist"
  ON user_watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own watchlist"
  ON user_watchlist
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id 
ON user_watchlist(user_id);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_created_at 
ON user_watchlist(user_id, created_at DESC);