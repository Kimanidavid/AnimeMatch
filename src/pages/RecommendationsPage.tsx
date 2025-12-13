import { useState, useEffect } from 'react';
import { Heart, Plus, ThumbsDown, Loader, ExternalLink } from 'lucide-react';
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
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="text-[#F7931E] animate-spin mx-auto mb-4" size={48} />
          <p className="font-bold text-lg text-black">GENERATING YOUR RECOMMENDATIONS...</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="comic-panel comic-panel-primary p-8">
            <h1 className="text-4xl font-bold text-black mb-4">NO RECOMMENDATIONS YET!</h1>
            <p className="text-xl font-bold text-black mb-8">Pick your top 5 anime to get started</p>
            <button
              onClick={onRePickTop5}
              className="comic-button px-6 py-3 bg-[#4A7C7E] text-white font-bold text-lg"
            >
              PICK YOUR TOP 5
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="comic-panel comic-panel-primary p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-black mb-2">YOUR RECOMMENDATIONS!</h1>
              <p className="text-lg font-bold text-black">Based on your top 5 anime</p>
            </div>
            <button
              onClick={onRePickTop5}
              className="comic-button px-4 py-2 bg-[#4A7C7E] text-white font-bold"
            >
              CHANGE TOP 5
            </button>
          </div>
        </div>

        {topAnime.length > 0 && (
          <div className="mb-8 comic-panel comic-panel-teal p-6">
            <h2 className="text-2xl font-bold text-white mb-4">YOUR TOP 5:</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topAnime.map(anime => (
                <div key={anime.mal_id} className="flex-shrink-0">
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-24 h-32 object-cover border-3 border-black"
                    title={anime.title}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    <div className="comic-panel flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden mb-3">
        <img
          src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
          alt={anime.title}
          className="w-full h-full object-cover border-2 border-black"
        />
        <div className="absolute top-2 right-2 bg-[#F7931E] border-2 border-black text-black text-xs font-bold px-2 py-1">
          {Math.round(score)}%
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3">
        <h3 className="font-bold text-black mb-1 line-clamp-2 text-sm">{anime.title}</h3>
        <div className="text-xs font-bold text-black mb-2">
          {anime.year} • {anime.type}
          {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
        </div>

        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {anime.genres.slice(0, 2).map(genre => (
              <span
                key={genre.mal_id}
                className="text-xs px-2 py-1 bg-[#4A7C7E] text-white border border-black font-bold"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {reasons.length > 0 && (
          <p className="text-xs font-semibold text-black mb-2 line-clamp-1">
            💡 {reasons[0]}
          </p>
        )}

        <div className="mt-auto flex gap-1">
          <button
            onClick={() => onAddToWatchlist(anime)}
            disabled={inWatchlist}
            className="flex-1 comic-button flex items-center justify-center gap-1 px-2 py-1 bg-[#4A7C7E] text-white text-xs font-bold disabled:opacity-50"
          >
            {inWatchlist ? <Heart size={12} fill="currentColor" /> : <Plus size={12} />}
            {inWatchlist ? 'Added' : 'Add'}
          </button>
          <button
            onClick={() => onDislike(anime)}
            className="comic-button px-2 py-1 bg-[#A63F4F] text-white font-bold text-xs"
            title="Not interested"
          >
            <ThumbsDown size={12} />
          </button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-2 text-xs font-bold text-[#4A7C7E] hover:text-[#F7931E]"
        >
          {showDetails ? 'Hide' : 'Info'}
        </button>

        {showDetails && anime.synopsis && (
          <div className="mt-2 pt-2 border-t-2 border-black">
            <p className="text-xs text-black font-semibold line-clamp-3">{anime.synopsis}</p>
            <a
              href={`https://myanimelist.net/anime/${anime.mal_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-[#5B6B9F] hover:text-[#F7931E]"
            >
              MAL <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
