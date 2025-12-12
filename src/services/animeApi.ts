import type { AnimeData } from '../lib/database.types';
import { supabase } from '../lib/supabase';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const CACHE_DURATION_DAYS = 7;

interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}

export const animeApi = {
  async searchAnime(query: string, limit = 10): Promise<AnimeData[]> {
    try {
      const response = await fetch(
        `${JIKAN_API_BASE}/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`
      );

      if (!response.ok) {
        throw new Error('Failed to search anime');
      }

      const result: JikanResponse<AnimeData[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  async getAnimeById(id: number): Promise<AnimeData | null> {
    const cachedAnime = await this.getCachedAnime(id);

    if (cachedAnime && this.isCacheValid(cachedAnime.cached_at)) {
      return this.transformCachedToAnimeData(cachedAnime);
    }

    try {
      const response = await fetch(`${JIKAN_API_BASE}/anime/${id}/full`);

      if (!response.ok) {
        throw new Error('Failed to fetch anime details');
      }

      const result: JikanResponse<AnimeData> = await response.json();
      await this.cacheAnime(result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching anime:', error);
      return null;
    }
  },

  async getSeasonalAnime(year: number, season: string): Promise<AnimeData[]> {
    try {
      const response = await fetch(
        `${JIKAN_API_BASE}/seasons/${year}/${season.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch seasonal anime');
      }

      const result: JikanResponse<AnimeData[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  async getUpcomingAnime(limit = 25): Promise<AnimeData[]> {
    try {
      const response = await fetch(
        `${JIKAN_API_BASE}/seasons/upcoming?limit=${limit}&sfw=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming anime');
      }

      const result: JikanResponse<AnimeData[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching upcoming anime:', error);
      return [];
    }
  },

  async getTopAnime(limit = 50): Promise<AnimeData[]> {
    try {
      const response = await fetch(
        `${JIKAN_API_BASE}/top/anime?limit=${limit}&sfw=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch top anime');
      }

      const result: JikanResponse<AnimeData[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  async cacheAnime(anime: AnimeData): Promise<void> {
    try {
      const { error } = await supabase
        .from('anime_cache')
        .upsert({
          anime_id: anime.mal_id,
          title: anime.title,
          title_english: anime.title_english,
          image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          year: anime.year,
          season: anime.season,
          type: anime.type,
          episodes: anime.episodes,
          score: anime.score,
          popularity: anime.popularity,
          genres: anime.genres || [],
          studios: anime.studios || [],
          demographics: anime.demographics || [],
          synopsis: anime.synopsis,
          status: anime.status,
          source: anime.source,
          rating: anime.rating,
          streaming_platforms: [],
          metadata: {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'anime_id'
        });

      if (error) {
        console.error('Error caching anime:', error);
      }
    } catch (error) {
      console.error('Error caching anime:', error);
    }
  },

  async getCachedAnime(animeId: number) {
    try {
      const { data, error } = await supabase
        .from('anime_cache')
        .select('*')
        .eq('anime_id', animeId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching cached anime:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching cached anime:', error);
      return null;
    }
  },

  isCacheValid(cachedAt: string): boolean {
    const cacheDate = new Date(cachedAt);
    const now = new Date();
    const diffDays = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < CACHE_DURATION_DAYS;
  },

  transformCachedToAnimeData(cached: any): AnimeData {
    return {
      mal_id: cached.anime_id,
      title: cached.title,
      title_english: cached.title_english,
      images: {
        jpg: {
          image_url: cached.image_url || '',
          small_image_url: cached.image_url || '',
          large_image_url: cached.image_url || ''
        },
        webp: {
          image_url: cached.image_url || '',
          small_image_url: cached.image_url || '',
          large_image_url: cached.image_url || ''
        }
      },
      year: cached.year,
      season: cached.season,
      type: cached.type,
      episodes: cached.episodes,
      score: cached.score,
      popularity: cached.popularity,
      genres: cached.genres as Array<{ mal_id: number; name: string; type: string }>,
      studios: cached.studios as Array<{ mal_id: number; name: string; type: string }>,
      demographics: cached.demographics as Array<{ mal_id: number; name: string; type: string }>,
      synopsis: cached.synopsis,
      status: cached.status,
      source: cached.source,
      rating: cached.rating
    };
  }
};
