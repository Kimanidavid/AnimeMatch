import { useState, useEffect } from 'react';
import { Heart, Plus, ThumbsDown, Loader, ExternalLink, Sparkles } from 'lucide-react';
import { recommendationEngine } from '../services/recommendationEngine';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { animeApi } from '../services/animeApi';
import type { AnimeData } from '../lib/database.types';

interface RecommendationsPageProps {
  onRePickTop5: () => void;
}

export function RecommendationsPage({ onRePickTop5 }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<Array<{ anime: AnimeData; score: number; reasons: string[] }>>([]);
  const [topAnime, setTopAnime] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadRecommendations();
      loadWatchlist();
    }
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('watchlist')
      .select('anime_id')
      .eq('user_id', user.id);

    if (data) {
      setWatchlist(new Set(data.map(item => item.anime_id)));
    }
  };

  const loadRecommendations = async () => {
    if (!user) return;

    setLoading(true);

    const { data: topAnimeData } = await supabase
      .from('user_top_anime')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (!topAnimeData || topAnimeData.length === 0) {
      setLoading(false);
      return;
    }

    const animeIds = topAnimeData.map(item => item.anime_id);

    const topAnimeDetails = await Promise.all(
      animeIds.map(id => animeApi.getAnimeById(id))
    );
    setTopAnime(topAnimeDetails.filter((a): a is AnimeData => a !== null));

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const recs = await recommendationEngine.getRecommendations(
      animeIds,
      {
        preferredGenres: preferences?.preferred_genres || [],
        avoidGenres: preferences?.avoid_genres || [],
        contentRatingFilter: preferences?.content_rating_filter || 'all',
        preferredEpisodeLength: preferences?.preferred_episode_length || 'any'
      },
      20
    );

    setRecommendations(recs);
    setLoading(false);
  };

  const handleAddToWatchlist = async (anime: AnimeData) => {
    if (!user || watchlist.has(anime.mal_id)) return;

    await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        anime_id: anime.mal_id,
        anime_title: anime.title,
        anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        is_liked: true
      });

    setWatchlist(new Set([...watchlist, anime.mal_id]));
  };

  const handleDislike = async (anime: AnimeData) => {
    if (!user) return;

    await supabase
      .from('watchlist')
      .upsert({
        user_id: user.id,
        anime_id: anime.mal_id,
        anime_title: anime.title,
        anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        is_liked: false
      }, {
        onConflict: 'user_id,anime_id'
      });

    setRecommendations(recommendations.filter(r => r.anime.mal_id !== anime.mal_id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="text-pink-500 animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-400">Generating your personalized recommendations...</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Recommendations Yet</h1>
          <p className="text-gray-400 mb-8">Pick your top 5 anime to get started</p>
          <button
            onClick={onRePickTop5}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all"
          >
            Pick Your Top 5
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Sparkles className="text-pink-500" />
              Your Recommendations
            </h1>
            <p className="text-gray-400">Based on your top 5 anime</p>
          </div>
          <button
            onClick={onRePickTop5}
            className="px-4 py-2 bg-gray-800 border border-pink-500/30 text-pink-400 rounded-lg hover:bg-gray-700 transition-all"
          >
            Change Top 5
          </button>
        </div>

        {topAnime.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-500/20 rounded-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Your Top 5</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topAnime.map(anime => (
                <div key={anime.mal_id} className="flex-shrink-0">
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-24 h-32 object-cover rounded-lg border-2 border-pink-500/30"
                    title={anime.title}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map(({ anime, score, reasons }) => (
            <AnimeCard
              key={anime.mal_id}
              anime={anime}
              score={score}
              reasons={reasons}
              inWatchlist={watchlist.has(anime.mal_id)}
              onAddToWatchlist={handleAddToWatchlist}
              onDislike={handleDislike}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimeCard({ anime, score, reasons, inWatchlist, onAddToWatchlist, onDislike }: {
  anime: AnimeData;
  score: number;
  reasons: string[];
  inWatchlist: boolean;
  onAddToWatchlist: (anime: AnimeData) => void;
  onDislike: (anime: AnimeData) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="group relative bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all duration-300 hover:scale-105">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
          alt={anime.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
          {Math.round(score)}% Match
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white mb-1 line-clamp-2">{anime.title}</h3>
        <div className="text-sm text-gray-400 mb-2">
          {anime.year} • {anime.type}
          {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
        </div>

        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {anime.genres.slice(0, 3).map(genre => (
              <span
                key={genre.mal_id}
                className="text-xs px-2 py-1 bg-pink-500/20 text-pink-300 rounded"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {reasons.length > 0 && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
            {reasons[0]}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onAddToWatchlist(anime)}
            disabled={inWatchlist}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-sm font-semibold rounded hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inWatchlist ? <Heart size={16} fill="currentColor" /> : <Plus size={16} />}
            {inWatchlist ? 'Added' : 'Watchlist'}
          </button>
          <button
            onClick={() => onDislike(anime)}
            className="p-2 bg-gray-700 text-gray-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="Not interested"
          >
            <ThumbsDown size={16} />
          </button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-2 text-xs text-pink-400 hover:text-pink-300 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {showDetails && anime.synopsis && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400 line-clamp-4">{anime.synopsis}</p>
            <a
              href={`https://myanimelist.net/anime/${anime.mal_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              View on MAL <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
