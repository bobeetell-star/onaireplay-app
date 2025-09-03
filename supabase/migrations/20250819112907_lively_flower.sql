/*
  # Add episode locking columns to movies table

  1. New Columns
    - `is_locked` (boolean, default false) - indicates if episode requires unlock
    - `unlock_cost` (integer, default 0) - coin cost to unlock episode

  2. Indexes
    - Add index for locked episodes lookup
    - Add index for series episodes with locking info
*/

-- Add episode locking columns to movies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE movies ADD COLUMN is_locked boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'unlock_cost'
  ) THEN
    ALTER TABLE movies ADD COLUMN unlock_cost integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_is_locked 
ON movies(is_locked) WHERE is_locked = true;

CREATE INDEX IF NOT EXISTS idx_movies_series_locking 
ON movies(series_id, episode_number, is_locked) 
WHERE series_id IS NOT NULL;