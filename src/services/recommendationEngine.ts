import type { AnimeData } from '../lib/database.types';
import { animeApi } from './animeApi';
import { supabase } from '../lib/supabase';

interface AnimeFeatureVector {
  genres: Set<string>;
  studios: Set<string>;
  demographics: Set<string>;
  type: string;
  source: string;
  scoreRange: number;
  popularityRange: number;
  episodeRange: string;
}

interface RecommendationResult {
  anime: AnimeData;
  score: number;
  reasons: string[];
  aiSummary?: string;
  redditMentions?: number;
}

interface UserPreferences {
  preferredGenres?: string[];
  avoidGenres?: string[];
  contentRatingFilter?: string;
  preferredEpisodeLength?: string;
}

export const recommendationEngine = {
  async getRecommendations(
    topAnimeIds: number[],
    preferences: UserPreferences = {},
    limit = 20
  ): Promise<RecommendationResult[]> {
    const topAnime = await Promise.all(
      topAnimeIds.map(id => animeApi.getAnimeById(id))
    );

    const validTopAnime = topAnime.filter((a): a is AnimeData => a !== null);

    if (validTopAnime.length === 0) {
      return [];
    }

    const userTasteVector = this.computeUserTasteVector(validTopAnime);

    const candidateAnime = await animeApi.getTopAnime(200);

    // Collaborative boost: find other users who have items from the user's top list in their watchlists
    // and count which other anime they have — more frequent items will get a boost.
    const cooccurrenceCounts = new Map<number, number>();
    try {
      const { data: usersWithTop, error: uErr } = await supabase
        .from('watchlist')
        .select('user_id')
        .in('anime_id', topAnimeIds)
        .neq('user_id', null);

      if (!uErr && usersWithTop && usersWithTop.length > 0) {
        const userIds = Array.from(new Set(usersWithTop.map((r: any) => r.user_id)));

        const { data: otherWatchlists } = await supabase
          .from('watchlist')
          .select('anime_id')
          .in('user_id', userIds);

        if (otherWatchlists) {
          otherWatchlists.forEach((row: any) => {
            const id = row.anime_id as number;
            if (topAnimeIds.includes(id)) return; // skip seeds
            cooccurrenceCounts.set(id, (cooccurrenceCounts.get(id) || 0) + 1);
          });
        }
      }
    } catch (err) {
      // non-fatal — just proceed without collaborative boost
      console.error('Error computing co-occurrence boost:', err);
    }

    const seedIds = new Set(topAnimeIds);
    const filteredCandidates = candidateAnime.filter(anime => {
      if (seedIds.has(anime.mal_id)) return false;

      if (preferences.contentRatingFilter === 'teen' &&
          anime.rating && (anime.rating.includes('R+') || anime.rating.includes('Rx'))) {
        return false;
      }

      if (preferences.contentRatingFilter === 'no_nsfw' &&
          anime.rating && anime.rating.includes('Rx')) {
        return false;
      }

      if (preferences.avoidGenres && preferences.avoidGenres.length > 0) {
        const animeGenres = anime.genres.map(g => g.name.toLowerCase());
        const hasAvoidedGenre = preferences.avoidGenres.some(genre =>
          animeGenres.includes(genre.toLowerCase())
        );
        if (hasAvoidedGenre) return false;
      }

      if (preferences.preferredEpisodeLength && preferences.preferredEpisodeLength !== 'any') {
        const episodes = anime.episodes || 0;
        if (preferences.preferredEpisodeLength === '< 15 min' && episodes > 13) return false;
        if (preferences.preferredEpisodeLength === '15-30 min' && (episodes < 12 || episodes > 26)) return false;
        if (preferences.preferredEpisodeLength === '> 30 min' && episodes < 24) return false;
      }

      return true;
    });

    const recommendations = filteredCandidates.map(anime => {
      let score = this.computeSimilarityScore(
        userTasteVector,
        this.extractFeatures(anime),
        preferences
      );

      // Apply collaborative boost based on co-occurrence counts
      const coCount = cooccurrenceCounts.get(anime.mal_id) || 0;
      if (coCount > 0) {
        // logarithmic boost to avoid domination by popular items
        const boost = Math.min(20, Math.log(coCount + 1) * 6);
        score += boost;
      }

      const reasons = this.generateReasons(anime, validTopAnime);

      // If collaborative boost applied, add reason
      if (coCount > 0) {
        reasons.unshift(`Popular with similar users (${coCount} others)`);
      }

      // Generate AI summary
      const aiSummary = this.generateAISummary(anime);

      return { 
        anime, 
        score, 
        reasons,
        aiSummary,
        redditMentions: 0
      };
    });

    recommendations.sort((a, b) => b.score - a.score);

    const topRecommendations = recommendations.slice(0, limit);

    // NOTE: Reddit mentions are now disabled to prevent timeout/performance issues
    // Users can be notified via a future feature if needed
    // Reddit API calls were causing the recommendation generation to hang
    
    return topRecommendations;
  },

  computeUserTasteVector(topAnime: AnimeData[]): AnimeFeatureVector {
    const allGenres = new Set<string>();
    const allStudios = new Set<string>();
    const allDemographics = new Set<string>();
    const types = new Map<string, number>();
    const sources = new Map<string, number>();
    let totalScore = 0;
    let totalPopularity = 0;
    const episodeCounts: number[] = [];

    topAnime.forEach(anime => {
      anime.genres?.forEach(g => allGenres.add(g.name));
      anime.studios?.forEach(s => allStudios.add(s.name));
      anime.demographics?.forEach(d => allDemographics.add(d.name));

      if (anime.type) {
        types.set(anime.type, (types.get(anime.type) || 0) + 1);
      }

      if (anime.source) {
        sources.set(anime.source, (sources.get(anime.source) || 0) + 1);
      }

      totalScore += anime.score || 0;
      totalPopularity += anime.popularity || 0;

      if (anime.episodes) {
        episodeCounts.push(anime.episodes);
      }
    });

    const avgScore = totalScore / topAnime.length;
    const avgPopularity = totalPopularity / topAnime.length;
    const avgEpisodes = episodeCounts.length > 0
      ? episodeCounts.reduce((a, b) => a + b, 0) / episodeCounts.length
      : 12;

    const mostCommonType = Array.from(types.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'TV';
    const mostCommonSource = Array.from(sources.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Manga';

    return {
      genres: allGenres,
      studios: allStudios,
      demographics: allDemographics,
      type: mostCommonType,
      source: mostCommonSource,
      scoreRange: avgScore,
      popularityRange: avgPopularity,
      episodeRange: this.getEpisodeRange(avgEpisodes)
    };
  },

  extractFeatures(anime: AnimeData): AnimeFeatureVector {
    return {
      genres: new Set(anime.genres?.map(g => g.name) || []),
      studios: new Set(anime.studios?.map(s => s.name) || []),
      demographics: new Set(anime.demographics?.map(d => d.name) || []),
      type: anime.type || 'TV',
      source: anime.source || 'Unknown',
      scoreRange: anime.score || 0,
      popularityRange: anime.popularity || 0,
      episodeRange: this.getEpisodeRange(anime.episodes || 12)
    };
  },

  computeSimilarityScore(
    userVector: AnimeFeatureVector,
    animeVector: AnimeFeatureVector,
    preferences: UserPreferences = {}
  ): number {
    let score = 0;

    const genreIntersection = new Set(
      [...userVector.genres].filter(g => animeVector.genres.has(g))
    );
    const genreUnion = new Set([...userVector.genres, ...animeVector.genres]);
    const genreSimilarity = genreIntersection.size / (genreUnion.size || 1);
    score += genreSimilarity * 40;

    if (preferences.preferredGenres && preferences.preferredGenres.length > 0) {
      const preferredGenreMatches = preferences.preferredGenres.filter(g =>
        animeVector.genres.has(g)
      ).length;
      score += (preferredGenreMatches / preferences.preferredGenres.length) * 15;
    }

    const studioMatch = [...userVector.studios].some(s => animeVector.studios.has(s));
    if (studioMatch) score += 10;

    const demoMatch = [...userVector.demographics].some(d => animeVector.demographics.has(d));
    if (demoMatch) score += 10;

    if (userVector.type === animeVector.type) score += 5;
    if (userVector.source === animeVector.source) score += 5;

    const scoreDiff = Math.abs(userVector.scoreRange - animeVector.scoreRange);
    score += Math.max(0, 10 - scoreDiff);

    const popularityScore = Math.max(0, 5 - (animeVector.popularityRange / 1000));
    score += popularityScore;

    return Math.min(100, Math.max(0, score));
  },

  generateReasons(anime: AnimeData, topAnime: AnimeData[]): string[] {
    const reasons: string[] = [];

    topAnime.forEach(top => {
      const sharedGenres = anime.genres.filter(g =>
        top.genres.some(tg => tg.name === g.name)
      );

      if (sharedGenres.length >= 2) {
        reasons.push(`Similar to ${top.title}: shares ${sharedGenres.map(g => g.name).join(', ')}`);
      }

      const sharedStudio = anime.studios.some(s =>
        top.studios.some(ts => ts.name === s.name)
      );

      if (sharedStudio) {
        reasons.push(`Made by the same studio as ${top.title}`);
      }
    });

    if (anime.score && anime.score >= 8.0) {
      reasons.push('Highly rated by the community');
    }

    if (reasons.length === 0) {
      reasons.push('Matches your taste profile');
    }

    return reasons.slice(0, 2);
  },

  getEpisodeRange(episodes: number): string {
    if (episodes <= 13) return 'short';
    if (episodes <= 26) return 'medium';
    return 'long';
  },

  async fetchRedditMentions(animeTitle: string): Promise<{ mentions: number; summary: string }> {
    try {
      // Search Reddit for anime subreddit discussions with 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const subreddits = ['anime', 'animerecommendations'];
      let totalMentions = 0;

      for (const subreddit of subreddits) {
        try {
          const response = await fetch(
            `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(animeTitle)}&sort=relevance&t=year&limit=3`,
            {
              headers: {
                'User-Agent': 'AnimeMatch-App/1.0'
              },
              signal: controller.signal
            }
          );

          if (response.ok) {
            const data = await response.json();
            const posts = data.data?.children || [];
            totalMentions += Math.min(posts.length, 5); // cap at 5 per subreddit
            if (totalMentions > 10) break; // stop if we have enough mentions
          }
        } catch (err) {
          // continue to next subreddit if one fails
          continue;
        }
      }

      clearTimeout(timeoutId);
      return { mentions: totalMentions, summary: '' };
    } catch (error) {
      console.error('Error fetching Reddit mentions:', error);
      return { mentions: 0, summary: '' };
    }
  },

  generateAISummary(anime: AnimeData): string {
    // Generate a concise AI-like summary based on anime attributes
    const genres = anime.genres?.slice(0, 3).map(g => g.name).join(' and ') || 'anime';
    const year = anime.year ? `from ${anime.year}` : '';
    const episodes = anime.episodes ? ` with ${anime.episodes} episodes` : '';
    const rating = anime.score ? ` (rated ${anime.score.toFixed(1)}/10)` : '';

    let summary = `A ${genres} series${year}${episodes}${rating}.`;

    if (anime.synopsis) {
      const synopsisSnippet = anime.synopsis.substring(0, 120);
      summary += ` ${synopsisSnippet}...`;
    }

    return summary;
  }
};
