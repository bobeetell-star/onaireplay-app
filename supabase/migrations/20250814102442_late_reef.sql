/*
  # Add Watchlist Categories Support

  1. New Tables
    - `user_watchlist_categories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text, category name)
      - `color` (text, optional color for UI)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modified Tables
    - `user_watchlist`
      - Add `category_id` (uuid, optional foreign key to user_watchlist_categories)

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users to manage their own categories
    - Update watchlist policies to handle categories

  4. Indexes
    - Add indexes for better query performance
*/

-- Create user_watchlist_categories table
CREATE TABLE IF NOT EXISTS user_watchlist_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add category_id to user_watchlist table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_watchlist' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE user_watchlist ADD COLUMN category_id uuid REFERENCES user_watchlist_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on user_watchlist_categories
ALTER TABLE user_watchlist_categories ENABLE ROW LEVEL SECURITY;

-- Policies for user_watchlist_categories
CREATE POLICY "Users can view their own categories"
  ON user_watchlist_categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON user_watchlist_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON user_watchlist_categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON user_watchlist_categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_watchlist_categories_user_id 
  ON user_watchlist_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_category_id 
  ON user_watchlist(category_id) WHERE category_id IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_watchlist_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_user_watchlist_categories_updated_at
      BEFORE UPDATE ON user_watchlist_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;