import { useState, useEffect } from 'react';
import { Search, X, Loader } from 'lucide-react';
import { animeApi } from '../services/animeApi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnimeData } from '../lib/database.types';

interface Top5SelectionPageProps {
  onComplete: (animeIds: number[]) => void;
}

export function Top5SelectionPage({ onComplete }: Top5SelectionPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeData[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserTop5();
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUserTop5 = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_top_anime')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (data && data.length > 0) {
      const animePromises = data.map(item =>
        animeApi.getAnimeById(item.anime_id)
      );
      const animeData = await Promise.all(animePromises);
      setSelectedAnime(animeData.filter((a): a is AnimeData => a !== null));
    }
  };

  const performSearch = async () => {
    setSearching(true);
    const results = await animeApi.searchAnime(searchQuery, 10);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectAnime = (anime: AnimeData) => {
    if (selectedAnime.length >= 5) return;
    if (selectedAnime.find(a => a.mal_id === anime.mal_id)) return;

    setSelectedAnime([...selectedAnime, anime]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveAnime = (animeId: number) => {
    setSelectedAnime(selectedAnime.filter(a => a.mal_id !== animeId));
  };

  const handleSubmit = async () => {
    if (selectedAnime.length === 0 || !user) return;

    setLoading(true);

    try {
      await supabase
        .from('user_top_anime')
        .delete()
        .eq('user_id', user.id);

      const topAnimeData = selectedAnime.map((anime, index) => ({
        user_id: user.id,
        anime_id: anime.mal_id,
        anime_title: anime.title,
        anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        anime_year: anime.year,
        position: index + 1
      }));

      await supabase
        .from('user_top_anime')
        .insert(topAnimeData);

      onComplete(selectedAnime.map(a => a.mal_id));
    } catch (error) {
      console.error('Error saving top anime:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="comic-panel comic-panel-primary p-8 mb-8">
          <h1 className="text-5xl font-bold text-black mb-4">PICK YOUR TOP 5!</h1>
          <p className="text-xl font-bold text-black mb-4">
            Select up to 5 of your favorite anime
          </p>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map(num => (
              <div
                key={num}
                className={`w-10 h-10 rounded-full border-3 border-black flex items-center justify-center font-bold ${
                  selectedAnime.length >= num
                    ? 'bg-black text-[#F7931E]'
                    : 'bg-white text-black'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full pl-12 pr-4 py-4 bg-white border-4 border-black text-black placeholder-gray-600 focus:outline-none font-bold text-lg"
            />
            {searching && (
              <Loader className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F7931E] animate-spin" size={20} />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 comic-panel p-0 overflow-hidden max-h-96 overflow-y-auto">
              {searchResults.map(anime => (
                <button
                  key={anime.mal_id}
                  onClick={() => handleSelectAnime(anime)}
                  disabled={selectedAnime.length >= 5}
                  className="w-full flex items-center gap-4 p-3 border-b-2 border-black hover:bg-[#F7931E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed last:border-b-0"
                >
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-16 h-20 object-cover border-2 border-black"
                  />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-black">{anime.title}</div>
                    <div className="text-sm font-semibold text-black">
                      {anime.year} • {anime.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-3xl font-bold text-black">YOUR PICKS:</h2>
          {selectedAnime.length === 0 ? (
            <div className="text-center py-12 comic-panel bg-white">
              <p className="font-bold text-lg text-black">No anime selected yet!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedAnime.map((anime, index) => (
                <div
                  key={anime.mal_id}
                  className="flex items-center gap-4 p-4 comic-panel comic-panel-teal"
                >
                  <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold border-2 border-black text-lg">
                    {index + 1}
                  </div>
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-16 h-20 object-cover border-2 border-black"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-white">{anime.title}</div>
                    <div className="text-sm font-semibold text-white">
                      {anime.year} • {anime.type}
                      {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAnime(anime.mal_id)}
                    className="p-2 text-white hover:bg-[#A63F4F] border-2 border-white font-bold rounded transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selectedAnime.length === 0 || loading}
          className="comic-button w-full py-4 px-6 bg-[#4A7C7E] text-white text-2xl disabled:opacity-50"
        >
          {loading ? 'GENERATING...' : 'GENERATE RECOMMENDATIONS!'}
        </button>
      </div>
    </div>
  );
}
