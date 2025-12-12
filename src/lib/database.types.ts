export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string
          avatar_style: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_style?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_style?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_genres: string[]
          avoid_genres: string[]
          content_rating_filter: string
          preferred_episode_length: string
          preferred_platforms: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_genres?: string[]
          avoid_genres?: string[]
          content_rating_filter?: string
          preferred_episode_length?: string
          preferred_platforms?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_genres?: string[]
          avoid_genres?: string[]
          content_rating_filter?: string
          preferred_episode_length?: string
          preferred_platforms?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      user_top_anime: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_image_url: string | null
          anime_year: number | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_image_url?: string | null
          anime_year?: number | null
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          anime_title?: string
          anime_image_url?: string | null
          anime_year?: number | null
          position?: number
          created_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_image_url: string | null
          is_liked: boolean
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_image_url?: string | null
          is_liked?: boolean
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          anime_title?: string
          anime_image_url?: string | null
          is_liked?: boolean
          added_at?: string
        }
      }
      anime_cache: {
        Row: {
          id: string
          anime_id: number
          title: string
          title_english: string | null
          image_url: string | null
          year: number | null
          season: string | null
          type: string | null
          episodes: number | null
          score: number | null
          popularity: number | null
          genres: Json
          studios: Json
          demographics: Json
          synopsis: string | null
          status: string | null
          source: string | null
          rating: string | null
          streaming_platforms: Json
          metadata: Json
          cached_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anime_id: number
          title: string
          title_english?: string | null
          image_url?: string | null
          year?: number | null
          season?: string | null
          type?: string | null
          episodes?: number | null
          score?: number | null
          popularity?: number | null
          genres?: Json
          studios?: Json
          demographics?: Json
          synopsis?: string | null
          status?: string | null
          source?: string | null
          rating?: string | null
          streaming_platforms?: Json
          metadata?: Json
          cached_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anime_id?: number
          title?: string
          title_english?: string | null
          image_url?: string | null
          year?: number | null
          season?: string | null
          type?: string | null
          episodes?: number | null
          score?: number | null
          popularity?: number | null
          genres?: Json
          studios?: Json
          demographics?: Json
          synopsis?: string | null
          status?: string | null
          source?: string | null
          rating?: string | null
          streaming_platforms?: Json
          metadata?: Json
          cached_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface AnimeData {
  mal_id: number
  title: string
  title_english?: string | null
  images: {
    jpg: {
      image_url: string
      small_image_url: string
      large_image_url: string
    }
    webp: {
      image_url: string
      small_image_url: string
      large_image_url: string
    }
  }
  year?: number | null
  season?: string | null
  type?: string
  episodes?: number | null
  score?: number | null
  popularity?: number
  genres: Array<{ mal_id: number; name: string; type: string }>
  studios: Array<{ mal_id: number; name: string; type: string }>
  demographics: Array<{ mal_id: number; name: string; type: string }>
  synopsis?: string
  status?: string
  source?: string
  rating?: string
}
