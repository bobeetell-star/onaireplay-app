/*
  # Create movie comments system

  1. New Tables
    - `movie_comments`
      - `id` (uuid, primary key)
      - `movie_id` (integer, foreign key to movies)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `movie_comments` table
    - Add policy for public read access to comments
    - Add policy for authenticated users to manage their own comments
*/

CREATE TABLE IF NOT EXISTS movie_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id integer NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movie_comments ENABLE ROW LEVEL SECURITY;

-- Allow all users to read comments
CREATE POLICY "Enable read access for all users"
  ON movie_comments
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Users can insert their own comments"
  ON movie_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON movie_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON movie_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_movie_comments_movie_id ON movie_comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_comments_created_at ON movie_comments(movie_id, created_at DESC);