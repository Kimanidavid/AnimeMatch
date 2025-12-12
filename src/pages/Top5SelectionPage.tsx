import { useState, useEffect } from 'react';
import { Search, X, Sparkles, Loader } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-pink-500" />
            Pick Your Top 5 Anime
            <Sparkles className="text-blue-500" />
          </h1>
          <p className="text-gray-400">
            Select up to 5 of your favorite anime to get personalized recommendations
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map(num => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full ${
                  selectedAnime.length >= num
                    ? 'bg-gradient-to-r from-pink-500 to-blue-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an anime..."
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
            />
            {searching && (
              <Loader className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-500 animate-spin" size={20} />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              {searchResults.map(anime => (
                <button
                  key={anime.mal_id}
                  onClick={() => handleSelectAnime(anime)}
                  disabled={selectedAnime.length >= 5}
                  className="w-full flex items-center gap-4 p-3 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{anime.title}</div>
                    <div className="text-sm text-gray-400">
                      {anime.year} • {anime.type}
                      {anime.genres && anime.genres.length > 0 && (
                        <span> • {anime.genres.slice(0, 2).map(g => g.name).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-white">Your Selected Anime</h2>
          {selectedAnime.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl">
              <p className="text-gray-500">No anime selected yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedAnime.map((anime, index) => (
                <div
                  key={anime.mal_id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800 to-gray-800/50 border border-pink-500/20 rounded-xl hover:border-pink-500/40 transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-white">{anime.title}</div>
                    <div className="text-sm text-gray-400">
                      {anime.year} • {anime.type}
                      {anime.score && ` • ⭐ ${anime.score.toFixed(1)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAnime(anime.mal_id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
          className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-lg font-bold rounded-xl hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating Recommendations...' : 'Generate Recommendations'}
        </button>
      </div>
    </div>
  );
}
