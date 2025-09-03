/*
  # Create user episode unlocks table

  1. New Tables
    - `user_episode_unlocks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `movie_id` (integer, foreign key to movies)
      - `unlocked_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_episode_unlocks` table
    - Add policies for authenticated users to manage their own unlocks

  3. Indexes
    - Add indexes for performance optimization
    - Unique constraint on (user_id, movie_id)
*/

-- Create the user_episode_unlocks table
CREATE TABLE IF NOT EXISTS user_episode_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id integer NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Add foreign key constraints
ALTER TABLE user_episode_unlocks 
ADD CONSTRAINT user_episode_unlocks_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_episode_unlocks 
ADD CONSTRAINT user_episode_unlocks_movie_id_fkey 
FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_episode_unlocks_user_id 
ON user_episode_unlocks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_episode_unlocks_movie_id 
ON user_episode_unlocks(movie_id);

CREATE INDEX IF NOT EXISTS idx_user_episode_unlocks_user_movie 
ON user_episode_unlocks(user_id, movie_id);

-- Enable Row Level Security
ALTER TABLE user_episode_unlocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own episode unlocks"
  ON user_episode_unlocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own episode unlocks"
  ON user_episode_unlocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episode unlocks"
  ON user_episode_unlocks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episode unlocks"
  ON user_episode_unlocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);