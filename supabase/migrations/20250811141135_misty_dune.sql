/*
  # Add video URL column to movies table

  1. Schema Changes
    - Add `video_url` column to `movies` table
    - Column type: text (nullable to allow gradual population)
    - Add index for better query performance

  2. Notes
    - Video URLs can be added gradually to existing movies
    - Supports various video hosting services (YouTube, Vimeo, direct URLs, etc.)
    - Nullable field allows movies without videos initially
*/

-- Add video_url column to movies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE movies ADD COLUMN video_url text;
  END IF;
END $$;

-- Add index for video_url column for better performance
CREATE INDEX IF NOT EXISTS idx_movies_video_url ON movies(video_url) WHERE video_url IS NOT NULL;