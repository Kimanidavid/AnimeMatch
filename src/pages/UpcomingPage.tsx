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
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="comic-panel comic-panel-primary p-8 mb-8">
          <h1 className="text-5xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar className="text-black" />
            NEW & UPCOMING!
          </h1>
          <p className="text-lg font-bold text-black">Discover the latest anime releases</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <SeasonButton
            season="upcoming"
            label="UPCOMING"
            active={selectedSeason === 'upcoming'}
            onClick={() => setSelectedSeason('upcoming')}
          />
          <SeasonButton
            season="winter"
            label={`WINTER ${currentYear}`}
            active={selectedSeason === 'winter'}
            onClick={() => setSelectedSeason('winter')}
          />
          <SeasonButton
            season="spring"
            label={`SPRING ${currentYear}`}
            active={selectedSeason === 'spring'}
            onClick={() => setSelectedSeason('spring')}
          />
          <SeasonButton
            season="summer"
            label={`SUMMER ${currentYear}`}
            active={selectedSeason === 'summer'}
            onClick={() => setSelectedSeason('summer')}
          />
          <SeasonButton
            season="fall"
            label={`FALL ${currentYear}`}
            active={selectedSeason === 'fall'}
            onClick={() => setSelectedSeason('fall')}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="text-[#F7931E] animate-spin" size={48} />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
          <div className="text-center py-20 comic-panel">
            <p className="font-bold text-lg">NO ANIME FOUND!</p>
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
      className={`comic-button px-4 py-2 font-bold border-2 border-black text-sm ${
        active
          ? 'bg-black text-[#F7931E]'
          : 'bg-white text-black hover:bg-gray-100'
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
    <div className="comic-panel flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden mb-2">
        <img
          src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
          alt={anime.title}
          className="w-full h-full object-cover border-2 border-black"
        />
        {anime.status && (
          <div className="absolute top-1 right-1 bg-[#5B6B9F] text-white text-xs font-bold px-1 py-1 border border-black">
            {anime.status}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-2">
        <h3 className="font-bold text-black mb-1 line-clamp-2 text-xs">{anime.title}</h3>
        <div className="text-xs font-bold text-black mb-1">
          {anime.year} • {anime.type}
          {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
        </div>

        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {anime.genres.slice(0, 2).map(genre => (
              <span
                key={genre.mal_id}
                className="text-xs px-1 py-1 bg-[#4A7C7E] text-white border border-black font-bold"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={() => onAddToWatchlist(anime)}
            disabled={inWatchlist}
            className="w-full comic-button flex items-center justify-center gap-1 px-2 py-1 bg-[#4A7C7E] text-white text-xs font-bold mb-1 disabled:opacity-50"
          >
            {inWatchlist ? <Heart size={12} fill="currentColor" /> : <Plus size={12} />}
            {inWatchlist ? 'Added' : 'Add'}
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs font-bold text-[#4A7C7E] hover:text-[#F7931E]"
          >
            {showDetails ? 'Hide' : 'Info'}
          </button>
        </div>

        {showDetails && anime.synopsis && (
          <div className="mt-2 pt-2 border-t-2 border-black">
            <p className="text-xs text-black font-semibold line-clamp-2">{anime.synopsis}</p>
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
