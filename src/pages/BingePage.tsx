import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Loader, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { recommendationEngine } from '../services/recommendationEngine';
import type { AnimeData } from '../lib/database.types';

export default function BingePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<AnimeData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadQueue = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's top 5 anime IDs
        const { data: topAnimeData, error: topError } = await supabase
          .from('user_top_anime')
          .select('anime_id')
          .eq('user_id', user.id)
          .order('position');

        if (topError) throw topError;

        if (!topAnimeData || topAnimeData.length === 0) {
          setError('No top 5 anime selected. Go to Top 5 Selection first!');
          setQueue([]);
          return;
        }

        const animeIds = topAnimeData.map((row: any) => row.anime_id);

        // Get recommendations
        const recommendations = await recommendationEngine.getRecommendations(
          animeIds
        );

        if (!recommendations || recommendations.length === 0) {
          setError('No recommendations found. Try rating more anime!');
          setQueue([]);
          return;
        }

        // Extract anime from recommendations
        const animeQueue = recommendations.map((rec: any) => rec.anime);
        setQueue(animeQueue.slice(0, 20));
        setCurrentIndex(0);
      } catch (err) {
        console.error('Error loading queue:', err);
        setError('Failed to load recommendations.');
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, [user]);

  const handlePlayNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePlayPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAddToWatchlist = async (anime: AnimeData) => {
    if (!user) return;

    try {
      const { error: insertError } = await supabase
        .from('watchlist')
        .insert([
          {
            user_id: user.id,
            anime_id: anime.mal_id,
            anime_title: anime.title,
            anime_image_url: anime.images?.jpg?.image_url,
            is_liked: true,
          },
        ] as any);

      if (insertError) {
        console.error('Error adding to watchlist:', insertError);
        alert('Failed to add to watchlist');
        return;
      }

      alert('Added to watchlist!');
    } catch (err) {
      console.error('Error:', err);
      alert('An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-orange-400 animate-spin" />
          <p className="text-cream text-lg">Loading your personalized anime queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <p className="text-cream text-sm">
            Make sure you've selected your top 5 anime on the Top 5 Selection page.
          </p>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-cream text-lg">No anime in queue</p>
      </div>
    );
  }

  const current = queue[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold text-cream mb-8 text-center">
          Your Binge Queue
        </h1>

        {/* Progress */}
        <div className="text-center mb-6">
          <p className="text-teal-300 text-sm">
            {currentIndex + 1} of {queue.length}
          </p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / queue.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-lg border-2 border-teal-500 overflow-hidden shadow-lg mb-8">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-1/3">
              <img
                src={
                  current.images?.jpg?.image_url ||
                  current.images?.webp?.image_url ||
                  'https://via.placeholder.com/225x318?text=No+Image'
                }
                alt={current.title}
                className="w-full h-64 md:h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="md:w-2/3 p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold text-cream mb-2">
                  {current.title}
                </h2>
                {current.title_english && (
                  <p className="text-teal-300 text-sm mb-4">
                    {current.title_english}
                  </p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-orange-400 font-semibold">Year</p>
                    <p className="text-cream">{current.year || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold">Episodes</p>
                    <p className="text-cream">
                      {current.episodes || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold">Type</p>
                    <p className="text-cream">{current.type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold">Score</p>
                    <p className="text-cream">
                      ⭐ {current.score || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Genres */}
                {current.genres && current.genres.length > 0 && (
                  <div className="mb-4">
                    <p className="text-orange-400 font-semibold mb-2">Genres</p>
                    <div className="flex flex-wrap gap-2">
                      {current.genres.map((g: any) => (
                        <span
                          key={g.mal_id}
                          className="px-3 py-1 bg-orange-400 bg-opacity-20 text-orange-300 rounded-full text-xs"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synopsis */}
                {current.synopsis && (
                  <div className="mb-4">
                    <p className="text-cream text-sm line-clamp-3">
                      {current.synopsis}
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAddToWatchlist(current)}
                  className="flex-1 bg-orange-400 hover:bg-orange-500 text-black font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Watchlist
                </button>
                <a
                  href={`https://myanimelist.net/anime/${current.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-black font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  MAL Link
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePlayPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <span className="text-cream text-center">
            {currentIndex + 1} / {queue.length}
          </span>

          <button
            onClick={handlePlayNext}
            disabled={currentIndex === queue.length - 1}
            className="flex items-center gap-2 bg-orange-400 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
