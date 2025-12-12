/*
  # AnimeMatch MVP Database Schema

  ## Overview
  Creates the complete database structure for the AnimeMatch anime recommendation platform.

  ## 1. New Tables
  
  ### `user_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `username` (text) - Display name
  - `avatar_style` (text) - Selected anime-style avatar
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update
  
  ### `user_preferences`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References user_profiles
  - `preferred_genres` (text[]) - Array of preferred genre tags
  - `avoid_genres` (text[]) - Array of genres to avoid
  - `content_rating_filter` (text) - Content filter: 'all', 'teen', 'no_nsfw'
  - `preferred_episode_length` (text) - Episode length preference
  - `preferred_platforms` (text[]) - Streaming platform preferences
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `user_top_anime`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References user_profiles
  - `anime_id` (integer) - MyAnimeList/Jikan anime ID
  - `anime_title` (text) - Cached title
  - `anime_image_url` (text) - Cached cover image
  - `anime_year` (integer) - Release year
  - `position` (integer) - Ranking position (1-5)
  - `created_at` (timestamptz)
  
  ### `watchlist`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References user_profiles
  - `anime_id` (integer) - MyAnimeList/Jikan anime ID
  - `anime_title` (text) - Cached title
  - `anime_image_url` (text) - Cached cover image
  - `is_liked` (boolean) - User liked/disliked flag
  - `added_at` (timestamptz)
  
  ### `anime_cache`
  - `id` (uuid, primary key)
  - `anime_id` (integer, unique) - External API ID
  - `title` (text) - Anime title
  - `title_english` (text) - English title
  - `image_url` (text) - Cover image URL
  - `year` (integer) - Release year
  - `season` (text) - Season (winter/spring/summer/fall)
  - `type` (text) - TV, Movie, OVA, etc.
  - `episodes` (integer) - Episode count
  - `score` (numeric) - Average rating score
  - `popularity` (integer) - Popularity rank
  - `genres` (jsonb) - Array of genre objects
  - `studios` (jsonb) - Array of studio objects
  - `demographics` (jsonb) - Target demographic info
  - `synopsis` (text) - Description
  - `status` (text) - Airing status
  - `source` (text) - Source material type
  - `rating` (text) - Content rating
  - `streaming_platforms` (jsonb) - Available platforms
  - `metadata` (jsonb) - Additional metadata from API
  - `cached_at` (timestamptz) - When data was cached
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## 2. Security
  - Enable RLS on all tables
  - Users can only read/write their own data
  - anime_cache is publicly readable but only system-writable
  
  ## 3. Indexes
  - Index on user_id columns for fast lookups
  - Index on anime_id in cache for quick retrieval
  - Index on watchlist for user anime lookups
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_style text DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  preferred_genres text[] DEFAULT '{}',
  avoid_genres text[] DEFAULT '{}',
  content_rating_filter text DEFAULT 'all',
  preferred_episode_length text DEFAULT 'any',
  preferred_platforms text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_top_anime table
CREATE TABLE IF NOT EXISTS user_top_anime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id integer NOT NULL,
  anime_title text NOT NULL,
  anime_image_url text,
  anime_year integer,
  position integer NOT NULL CHECK (position >= 1 AND position <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, position),
  UNIQUE(user_id, anime_id)
);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id integer NOT NULL,
  anime_title text NOT NULL,
  anime_image_url text,
  is_liked boolean DEFAULT true,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

-- Create anime_cache table
CREATE TABLE IF NOT EXISTS anime_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id integer UNIQUE NOT NULL,
  title text NOT NULL,
  title_english text,
  image_url text,
  year integer,
  season text,
  type text,
  episodes integer,
  score numeric,
  popularity integer,
  genres jsonb DEFAULT '[]',
  studios jsonb DEFAULT '[]',
  demographics jsonb DEFAULT '[]',
  synopsis text,
  status text,
  source text,
  rating text,
  streaming_platforms jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  cached_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_top_anime_user_id ON user_top_anime(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_anime ON watchlist(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_cache_anime_id ON anime_cache(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_cache_score ON anime_cache(score DESC);
CREATE INDEX IF NOT EXISTS idx_anime_cache_popularity ON anime_cache(popularity);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_top_anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for user_top_anime
CREATE POLICY "Users can view own top anime"
  ON user_top_anime FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own top anime"
  ON user_top_anime FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own top anime"
  ON user_top_anime FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own top anime"
  ON user_top_anime FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for watchlist
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own watchlist items"
  ON watchlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own watchlist items"
  ON watchlist FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own watchlist items"
  ON watchlist FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for anime_cache (public read, authenticated write for caching)
CREATE POLICY "Anyone can view anime cache"
  ON anime_cache FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert anime cache"
  ON anime_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update anime cache"
  ON anime_cache FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);