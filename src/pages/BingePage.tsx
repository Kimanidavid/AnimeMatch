import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { recommendationEngine } from '../services/recommendationEngine';
import type { AnimeData } from '../lib/database.types';

interface QueueItem {
  anime: AnimeData;
  aiSummary?: string;
  redditMentions?: number;
}

export function BingePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<AnimeData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeData | null>(null);
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'popularity' | 'name'>('score');
  const { user } = useAuth();

  const GENRE_OPTIONS = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery',
    'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];

  const TYPE_OPTIONS = ['TV', 'Movie', 'OVA', 'Special'];

  useEffect(() => {
    if (user) {
      loadQueue();
      loadWatchlist();
    }
    return () => {
      // cleanup subscription on unmount or user change
      if (subscription && subscription.unsubscribe) {
        try { subscription.unsubscribe(); } catch (e) { /* ignore */ }
      }
    };
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setFilteredAnime(animeList);
      return;
    }

    const animeIds = topAnimeData.map((i: any) => i.anime_id);

    // Subscribe to watchlist and user_top_anime changes so the binge queue updates automatically
    try {
      // remove existing subscription first
      if (subscription && subscription.unsubscribe) {
        try { subscription.unsubscribe(); } catch (e) { /* ignore */ }
      }

      const channel = supabase
        .channel('public-watchlist')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => {
          loadQueue();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_top_anime' }, () => {
          loadQueue();
        })
        .subscribe();

      setSubscription(channel);
    } catch (err) {
      // ignore subscription failures; we still provide manual refresh
      console.error('Failed to subscribe to realtime updates:', err);
    }

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

  const handleAddToWatchlist = async (anime: AnimeData) => {
    if (!user || watchlist.has(anime.mal_id)) return;

    await supabase.from('watchlist').insert({
      user_id: user.id,
      anime_id: anime.mal_id,
      anime_title: anime.title,
      anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      is_liked: true
    });

      if (!error) {
        setWatchlist(new Set([...watchlist, anime.mal_id]));
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="text-[#F7931E] animate-spin mx-auto mb-4" size={48} />
          <p className="font-bold text-lg text-black">LOADING YOUR BINGE COLLECTION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="comic-panel comic-panel-primary p-8 mb-8">
          <h1 className="text-5xl font-bold text-black mb-2">BINGE TIME!</h1>
          <p className="text-lg font-bold text-black">Browse thousands of anime and start watching instantly</p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={24} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search anime..."
              className="w-full pl-14 pr-4 py-4 bg-white border-4 border-black text-black placeholder-gray-600 focus:outline-none font-bold text-lg"
            />
            {searchLoading && (
              <Loader className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F7931E] animate-spin" size={24} />
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="comic-button px-4 py-2 bg-[#4A7C7E] text-white font-bold flex items-center gap-2"
            >
              <Filter size={18} />
              FILTERS
            </button>

            {(filterGenre || filterType || searchQuery) && (
              <button
                onClick={() => {
                  setFilterGenre('');
                  setFilterType('');
                  setSearchQuery('');
                  loadTopAnime();
                }}
                className="comic-button px-4 py-2 bg-[#A63F4F] text-white font-bold flex items-center gap-2"
              >
                <X size={18} />
                CLEAR
              </button>
            )}
          </div>

          {showFilters && (
            <div className="comic-panel p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-black mb-2">GENRE</label>
                  <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-black border-3 border-black focus:outline-none font-bold"
                  >
                    <option value="">All Genres</option>
                    {GENRE_OPTIONS.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-black mb-2">TYPE</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-black border-3 border-black focus:outline-none font-bold"
                  >
                    <option value="">All Types</option>
                    {TYPE_OPTIONS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-black mb-2">SORT BY</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'score' | 'popularity' | 'name')}
                    className="w-full px-3 py-2 bg-white text-black border-3 border-black focus:outline-none font-bold"
                  >
                    <option value="score">Rating</option>
                    <option value="popularity">Popularity</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredAnime.length > 0 && (
          <div>
            <p className="font-bold text-lg text-black mb-4">
              SHOWING {filteredAnime.length} ANIME
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {filteredAnime.map(anime => (
                <div
                  key={anime.mal_id}
                  onClick={() => setSelectedAnime(anime)}
                  className="comic-panel cursor-pointer transform hover:scale-105 transition-transform flex flex-col h-full"
                >
                  <div className="relative aspect-[2/3] overflow-hidden mb-3">
                    <img
                      src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
                      alt={anime.title}
                      className="w-full h-full object-cover border-2 border-black"
                    />
                    <div className="absolute top-2 right-2 bg-[#F7931E] text-black font-bold px-2 py-1 border-2 border-black text-xs">
                      ⭐ {anime.score?.toFixed(1) || 'N/A'}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col p-3">
                    <h3 className="font-bold text-black mb-1 line-clamp-2 text-sm">{anime.title}</h3>
                    <div className="text-xs font-bold text-black mb-2">
                      {anime.year} • {anime.type}
                      {anime.episodes && ` • ${anime.episodes}ep`}
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

                    <div className="mt-auto flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnime(anime);
                        }}
                        className="flex-1 comic-button px-2 py-1 bg-[#F7931E] text-black font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Play size={12} />
                        WATCH
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWatchlist(anime);
                        }}
                        disabled={watchlist.has(anime.mal_id)}
                        className="comic-button px-2 py-1 bg-[#4A7C7E] text-white font-bold text-xs disabled:opacity-50"
                      >
                        {watchlist.has(anime.mal_id) ? <Heart size={12} fill="white" /> : <Plus size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredAnime.length === 0 && !loading && (
          <div className="comic-panel p-12 text-center">
            <p className="font-bold text-2xl text-black">NO ANIME FOUND!</p>
            <p className="font-bold text-lg text-black mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {selectedAnime && (
        <AnimeDetailModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
}

function AnimeDetailModal({ anime, onClose }: { anime: AnimeData; onClose: () => void }) {
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    checkWatchlist();
  }, [anime.mal_id]);

  const checkWatchlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('anime_id', anime.mal_id)
      .maybeSingle();

    setInWatchlist(!!data);
  };

  const handleAddToWatchlist = async () => {
    if (!user || inWatchlist) return;

    await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        anime_id: anime.mal_id,
        anime_title: anime.title,
        anime_image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        is_liked: true
      });

    setInWatchlist(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="comic-panel comic-panel-primary max-w-2xl w-full my-8">
        <div className="p-8">
          <button
            onClick={onClose}
            className="float-right text-black hover:text-red-600 font-bold text-3xl"
          >
            ✕
          </button>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <img
                src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
                alt={anime.title}
                className="w-full h-auto border-4 border-black"
              />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-black mb-2">{anime.title}</h2>

              <div className="comic-panel bg-white p-4 mb-4 border-2 border-black">
                <div className="space-y-2 font-bold text-black">
                  <p>YEAR: {anime.year || 'N/A'}</p>
                  <p>TYPE: {anime.type || 'N/A'}</p>
                  <p>EPISODES: {anime.episodes || 'N/A'}</p>
                  <p>RATING: ⭐ {anime.score?.toFixed(2) || 'N/A'}/10</p>
                  {anime.status && <p>STATUS: {anime.status.toUpperCase()}</p>}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-black mb-2">GENRES:</h3>
                <div className="flex flex-wrap gap-2">
                  {anime.genres?.slice(0, 5).map(genre => (
                    <span
                      key={genre.mal_id}
                      className="px-2 py-1 bg-[#4A7C7E] text-white border-2 border-black font-bold text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
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
                className="comic-button px-4 py-3 bg-[#5B6B9F] text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg"
              >
                <Monitor size={16} />
                MAL
                <ExternalLink size={14} />
              </a>
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
