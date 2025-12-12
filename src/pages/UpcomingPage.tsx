import { useState, useEffect } from 'react';
import { Calendar, Loader, ExternalLink, Plus, Heart } from 'lucide-react';
import { animeApi } from '../services/animeApi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnimeData } from '../lib/database.types';

type Season = 'winter' | 'spring' | 'summer' | 'fall' | 'upcoming';

export function UpcomingPage() {
  const [selectedSeason, setSelectedSeason] = useState<Season>('upcoming');
  const [animeList, setAnimeList] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadWatchlist();
    }
  }, [user]);

  useEffect(() => {
    loadAnime();
  }, [selectedSeason]);

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

  const loadAnime = async () => {
    setLoading(true);

    if (selectedSeason === 'upcoming') {
      const data = await animeApi.getUpcomingAnime(24);
      setAnimeList(data);
    } else {
      const data = await animeApi.getSeasonalAnime(currentYear, selectedSeason);
      setAnimeList(data.slice(0, 24));
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="text-pink-500" />
            New & Upcoming Anime
          </h1>
          <p className="text-gray-400">Discover the latest and upcoming anime releases</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <SeasonButton
            season="upcoming"
            label="Upcoming"
            active={selectedSeason === 'upcoming'}
            onClick={() => setSelectedSeason('upcoming')}
          />
          <SeasonButton
            season="winter"
            label={`Winter ${currentYear}`}
            active={selectedSeason === 'winter'}
            onClick={() => setSelectedSeason('winter')}
          />
          <SeasonButton
            season="spring"
            label={`Spring ${currentYear}`}
            active={selectedSeason === 'spring'}
            onClick={() => setSelectedSeason('spring')}
          />
          <SeasonButton
            season="summer"
            label={`Summer ${currentYear}`}
            active={selectedSeason === 'summer'}
            onClick={() => setSelectedSeason('summer')}
          />
          <SeasonButton
            season="fall"
            label={`Fall ${currentYear}`}
            active={selectedSeason === 'fall'}
            onClick={() => setSelectedSeason('fall')}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="text-pink-500 animate-spin" size={48} />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {animeList.map(anime => (
              <AnimeCard
                key={anime.mal_id}
                anime={anime}
                inWatchlist={watchlist.has(anime.mal_id)}
                onAddToWatchlist={handleAddToWatchlist}
              />
            ))}
          </div>
        )}

        {!loading && animeList.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">No anime found for this season</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonButton({ season, label, active, onClick }: {
  season: Season;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-lg font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow-lg shadow-pink-500/30'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function AnimeCard({ anime, inWatchlist, onAddToWatchlist }: {
  anime: AnimeData;
  inWatchlist: boolean;
  onAddToWatchlist: (anime: AnimeData) => void;
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
        {anime.status && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
            {anime.status}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white mb-1 line-clamp-2 text-sm">{anime.title}</h3>
        <div className="text-xs text-gray-400 mb-2">
          {anime.year} • {anime.type}
          {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
        </div>

        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {anime.genres.slice(0, 2).map(genre => (
              <span
                key={genre.mal_id}
                className="text-xs px-2 py-1 bg-pink-500/20 text-pink-300 rounded"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onAddToWatchlist(anime)}
            disabled={inWatchlist}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-sm font-semibold rounded hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inWatchlist ? <Heart size={14} fill="currentColor" /> : <Plus size={14} />}
            {inWatchlist ? 'Added' : 'Add'}
          </button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-2 text-xs text-pink-400 hover:text-pink-300 transition-colors"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>

        {showDetails && anime.synopsis && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400 line-clamp-3">{anime.synopsis}</p>
            <a
              href={`https://myanimelist.net/anime/${anime.mal_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              MAL <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
