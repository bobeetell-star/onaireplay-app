/*
  # Create movies and user watch history tables

  1. New Tables
    - `movies`
      - `id` (integer, primary key)
      - `title` (text, not null)
      - `genre` (text, not null) 
      - `view_count` (text, not null)
      - `poster_url` (text, not null)
      - `landscape_poster_url` (text, not null)
      - `badge` (text, optional)
      - `synopsis` (text, optional)
      - `episodes` (integer, optional)
      - `duration_seconds` (integer, optional)
      - `created_at` (timestamp with timezone, default now)

    - `user_watch_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `movie_id` (integer, references movies)
      - `progress_seconds` (integer, not null)
      - `total_duration_seconds` (integer, not null)
      - `last_watched_at` (timestamp with timezone, default now)
      - `created_at` (timestamp with timezone, default now)
      - `updated_at` (timestamp with timezone, default now)

  2. Security
    - Enable RLS on both tables
    - Movies: Allow read access for all users
    - Watch history: Users can only access their own data

  3. Indexes
    - Index on user_id and last_watched_at for efficient queries
    - Unique constraint on user_id + movie_id combination

  4. Triggers
    - Auto-update updated_at timestamp on watch history changes
*/

-- Create movies table
CREATE TABLE IF NOT EXISTS public.movies (
    id integer PRIMARY KEY,
    title text NOT NULL,
    genre text NOT NULL,
    view_count text NOT NULL,
    poster_url text NOT NULL,
    landscape_poster_url text NOT NULL,
    badge text,
    synopsis text,
    episodes integer,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user watch history table
CREATE TABLE IF NOT EXISTS public.user_watch_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    movie_id integer REFERENCES public.movies(id) ON DELETE CASCADE NOT NULL,
    progress_seconds integer NOT NULL DEFAULT 0,
    total_duration_seconds integer NOT NULL DEFAULT 0,
    last_watched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add unique constraint to prevent duplicate entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_watch_history_user_id_movie_id_key'
    AND table_name = 'user_watch_history'
  ) THEN
    ALTER TABLE public.user_watch_history 
    ADD CONSTRAINT user_watch_history_user_id_movie_id_key 
    UNIQUE (user_id, movie_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user_id 
ON public.user_watch_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_watch_history_last_watched 
ON public.user_watch_history(user_id, last_watched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movies table
CREATE POLICY "Enable read access for all users" ON public.movies
  FOR SELECT USING (true);

-- RLS Policies for user_watch_history table
CREATE POLICY "Users can view their own watch history" ON public.user_watch_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history" ON public.user_watch_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history" ON public.user_watch_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history" ON public.user_watch_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_user_watch_history_updated_at ON public.user_watch_history;
CREATE TRIGGER update_user_watch_history_updated_at
    BEFORE UPDATE ON public.user_watch_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample movie data
INSERT INTO public.movies (id, title, genre, view_count, poster_url, landscape_poster_url, badge, synopsis, episodes, duration_seconds) VALUES
(1, 'The Dark Knight', 'Action', '2.8M', 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg', 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg', 'Hot', 'Batman faces the Joker in this epic superhero thriller.', NULL, 9120),
(2, 'Stranger Things', 'Sci-Fi', '1.2M', 'https://images.pexels.com/photos/7991580/pexels-photo-7991580.jpeg', 'https://images.pexels.com/photos/7991580/pexels-photo-7991580.jpeg', 'New', 'Kids in a small town encounter supernatural forces.', 8, 3600),
(3, 'Breaking Bad', 'Drama', '3.1M', 'https://images.pexels.com/photos/7991581/pexels-photo-7991581.jpeg', 'https://images.pexels.com/photos/7991581/pexels-photo-7991581.jpeg', 'Exclusive', 'A chemistry teacher turns to cooking meth.', 62, 2700),
(4, 'The Office', 'Comedy', '890K', 'https://images.pexels.com/photos/7991582/pexels-photo-7991582.jpeg', 'https://images.pexels.com/photos/7991582/pexels-photo-7991582.jpeg', NULL, 'Mockumentary about office workers.', 201, 1320),
(5, 'Game of Thrones', 'Fantasy', '2.5M', 'https://images.pexels.com/photos/7991583/pexels-photo-7991583.jpeg', 'https://images.pexels.com/photos/7991583/pexels-photo-7991583.jpeg', 'Hot', 'Epic fantasy series about power and dragons.', 73, 3300),
(6, 'The Mandalorian', 'Sci-Fi', '1.8M', 'https://images.pexels.com/photos/7991584/pexels-photo-7991584.jpeg', 'https://images.pexels.com/photos/7991584/pexels-photo-7991584.jpeg', 'New', 'A bounty hunter in the Star Wars universe.', 24, 2400)
ON CONFLICT (id) DO NOTHING;