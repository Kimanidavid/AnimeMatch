import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { recommendationEngine } from '../services/recommendationEngine';
import { animeApi } from '../services/animeApi';
import type { AnimeData } from '../lib/database.types';

export function BingePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<AnimeData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      loadQueue();
      loadWatchlist();
    }
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('watchlist')
      .select('anime_id')
      .eq('user_id', user.id);

    if (data) setWatchlist(new Set(data.map((d: any) => d.anime_id)));
  };

  const loadQueue = async () => {
    if (!user) return;
    setLoading(true);

    const { data: topAnimeData } = await supabase
      .from('user_top_anime')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (!topAnimeData || topAnimeData.length === 0) {
      setQueue([]);
      setLoading(false);
      return;
    }

    const animeIds = topAnimeData.map((i: any) => i.anime_id);

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
      30
    );

    const animeList = recs.map(r => r.anime);
    setQueue(animeList);
    setCurrentIndex(0);
    setLoading(false);
  };

  const playNext = () => {
    setCurrentIndex(i => Math.min(i + 1, queue.length - 1));
  };

  const playPrev = () => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  };

  const addToWatchlist = async (anime: AnimeData) => {
    if (!user || watchlist.has(anime.mal_id)) return;

    await supabase.from('watchlist').insert({
      user_id: user.id,
      anime_id: anime.mal_id,
      anime_title: anime.title,
      anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      is_liked: true
    });

    setWatchlist(new Set([...watchlist, anime.mal_id]));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="text-[#F7931E] animate-spin mx-auto mb-4" size={48} />
          <p className="font-bold text-lg text-black">PREPARING YOUR BINGE QUEUE...</p>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="comic-panel comic-panel-primary p-8">
            <h1 className="text-4xl font-bold text-black mb-4">BINGE QUEUE EMPTY</h1>
            <p className="text-xl font-bold text-black mb-8">Make sure you've selected your top 5 to generate recommendations.</p>
          </div>
        </div>
      </div>
    );
  }

  const current = queue[currentIndex];

  return (
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="comic-panel comic-panel-primary p-8 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black">BINGE MODE</h1>
            <p className="text-sm font-bold text-black">Auto-play through your personalized recommendations</p>
          </div>
          <div className="text-sm font-bold">Queue: {queue.length}</div>
        </div>

        <div className="comic-panel p-6 flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <img
              src={current.images?.jpg?.large_image_url || current.images?.jpg?.image_url}
              alt={current.title}
              className="w-full h-auto border-2 border-black"
            />
            <div className="mt-3 flex gap-2">
              <button onClick={playPrev} className="comic-button px-3 py-2 bg-white border-2 border-black font-bold"> <ChevronLeft size={16} /> Prev</button>
              <button onClick={playNext} className="comic-button px-3 py-2 bg-white border-2 border-black font-bold">Next <ChevronRight size={16} /></button>
              <button onClick={() => addToWatchlist(current)} disabled={watchlist.has(current.mal_id)} className="comic-button px-3 py-2 bg-[#4A7C7E] text-white font-bold border-2 border-black disabled:opacity-50">Add</button>
            </div>
          </div>

          <div className="md:w-2/3">
            <h2 className="text-2xl font-bold text-black">{current.title}</h2>
            <div className="text-xs font-bold text-black my-2">{current.year} • {current.type} • {current.episodes ?? '??'} eps</div>
            {current.genres && (
              <div className="flex gap-2 mb-3">
                {current.genres.slice(0, 4).map(g => (
                  <span key={g.mal_id} className="text-xs px-2 py-1 bg-[#4A7C7E] text-white border border-black font-bold">{g.name}</span>
                ))}
              </div>
            )}

            <p className="text-sm text-black mb-4">{current.synopsis || 'No synopsis available.'}</p>

            <div className="flex gap-3">
              <a
                href={`https://myanimelist.net/anime/${current.mal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="comic-button inline-flex items-center gap-2 px-4 py-2 bg-[#5B6B9F] text-white font-bold border-2 border-black"
              >
                Open on MAL <ExternalLink size={14} />
              </a>

              <button onClick={() => { setCurrentIndex(i => Math.min(i + 1, queue.length - 1)); }} className="comic-button px-4 py-2 bg-[#F7931E] text-black font-bold border-2 border-black">Auto Next</button>
              <button onClick={loadQueue} className="comic-button px-4 py-2 bg-white border-2 border-black font-bold">Refresh</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xl font-bold text-black mb-3">Up Next</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {queue.slice(currentIndex + 1, currentIndex + 9).map(a => (
              <div key={a.mal_id} className="comic-panel p-2">
                <img src={a.images?.jpg?.image_url} alt={a.title} className="w-full h-36 object-cover border-2 border-black mb-2" />
                <div className="text-xs font-bold text-black">{a.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BingePage;
