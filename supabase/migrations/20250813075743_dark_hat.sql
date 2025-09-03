/*
  # Enhanced Video Player Features

  1. New Columns
    - `video_url_720p` (text) - URL for 720p quality video
    - `video_url_1080p` (text) - URL for 1080p quality video  
    - `video_url_4k` (text) - URL for 4K quality video
    - `subtitle_url_en` (text) - URL for English subtitles
    - `subtitle_url_es` (text) - URL for Spanish subtitles
    - `series_id` (text) - Groups movies that belong to the same series
    - `episode_number` (integer) - Order of movies within a series

  2. Changes
    - Added video quality support for multiple resolutions
    - Added subtitle/caption support for multiple languages
    - Added series grouping for auto-play next episode functionality
*/

-- Add video quality columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'video_url_720p'
  ) THEN
    ALTER TABLE movies ADD COLUMN video_url_720p text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'video_url_1080p'
  ) THEN
    ALTER TABLE movies ADD COLUMN video_url_1080p text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'video_url_4k'
  ) THEN
    ALTER TABLE movies ADD COLUMN video_url_4k text;
  END IF;
END $$;

-- Add subtitle columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'subtitle_url_en'
  ) THEN
    ALTER TABLE movies ADD COLUMN subtitle_url_en text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'subtitle_url_es'
  ) THEN
    ALTER TABLE movies ADD COLUMN subtitle_url_es text;
  END IF;
END $$;

-- Add series grouping columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'series_id'
  ) THEN
    ALTER TABLE movies ADD COLUMN series_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'episode_number'
  ) THEN
    ALTER TABLE movies ADD COLUMN episode_number integer;
  END IF;
END $$;

-- Add index for series queries
CREATE INDEX IF NOT EXISTS idx_movies_series_episode ON movies(series_id, episode_number) WHERE series_id IS NOT NULL;