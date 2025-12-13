import { useState, useEffect } from 'react';
import { User, Save, RefreshCw, Trash2, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnimeData } from '../lib/database.types';
import { animeApi } from '../services/animeApi';

interface ProfilePageProps {
  onRePickTop5: () => void;
}

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

export function ProfilePage({ onRePickTop5 }: ProfilePageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [avoidGenres, setAvoidGenres] = useState<string[]>([]);
  const [contentFilter, setContentFilter] = useState('all');
  const [episodeLength, setEpisodeLength] = useState('any');
  const [topAnime, setTopAnime] = useState<AnimeData[]>([]);
  const [watchlist, setWatchlist] = useState<Array<{ id: string; anime_id: number; anime_title: string; anime_image_url: string }>>([]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadTopAnime();
      loadWatchlist();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      setUsername(profile.username);
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (prefs) {
      setPreferredGenres(prefs.preferred_genres || []);
      setAvoidGenres(prefs.avoid_genres || []);
      setContentFilter(prefs.content_rating_filter || 'all');
      setEpisodeLength(prefs.preferred_episode_length || 'any');
    }
  };

  const loadTopAnime = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_top_anime')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (data && data.length > 0) {
      const animePromises = data.map(item => animeApi.getAnimeById(item.anime_id));
      const animeData = await Promise.all(animePromises);
      setTopAnime(animeData.filter((a): a is AnimeData => a !== null));
    }
  };

  const loadWatchlist = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_liked', true)
      .order('added_at', { ascending: false });

    if (data) {
      setWatchlist(data);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setSavedMessage('');

    try {
      await supabase
        .from('user_profiles')
        .update({ username, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferred_genres: preferredGenres,
          avoid_genres: avoidGenres,
          content_rating_filter: contentFilter,
          preferred_episode_length: episodeLength,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      setSavedMessage('Settings saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async (id: string) => {
    await supabase
      .from('watchlist')
      .delete()
      .eq('id', id);

    setWatchlist(watchlist.filter(item => item.id !== id));
  };

  const toggleGenre = (genre: string, list: string[], setter: (genres: string[]) => void) => {
    if (list.includes(genre)) {
      setter(list.filter(g => g !== genre));
    } else {
      setter([...list, genre]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5EFE0] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="comic-panel comic-panel-primary p-8 mb-8">
          <h1 className="text-5xl font-bold text-black mb-2 flex items-center gap-3">
            <User className="text-black" />
            PROFILE!
          </h1>
          <p className="text-lg font-bold text-black">Manage your preferences</p>
        </div>

        <div className="space-y-6">
          <section className="comic-panel p-6">
            <h2 className="text-2xl font-bold text-black mb-4">PROFILE INFO</h2>
            <div>
              <label className="block font-bold text-black mb-2 text-lg">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white border-4 border-black text-black focus:outline-none font-bold"
              />
            </div>
          </section>

          <section className="comic-panel p-6">
            <h2 className="text-2xl font-bold text-black mb-4">TOP 5 ANIME</h2>
            {topAnime.length > 0 ? (
              <div className="space-y-3">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {topAnime.map((anime, index) => (
                    <div key={anime.mal_id} className="flex-shrink-0 text-center">
                      <div className="relative">
                        <img
                          src={anime.images?.jpg?.image_url}
                          alt={anime.title}
                          className="w-24 h-32 object-cover border-3 border-black"
                        />
                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-[#F7931E] rounded-full flex items-center justify-center text-black text-sm font-bold border-2 border-black">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-xs text-black mt-2 max-w-[96px] truncate font-bold">{anime.title}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onRePickTop5}
                  className="comic-button flex items-center justify-center gap-2 px-4 py-2 bg-[#4A7C7E] text-white font-bold w-full"
                >
                  <RefreshCw size={16} />
                  CHANGE TOP 5
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-black font-bold mb-4">You haven't picked your top 5 yet!</p>
                <button
                  onClick={onRePickTop5}
                  className="comic-button px-4 py-2 bg-[#4A7C7E] text-white font-bold"
                >
                  PICK YOUR TOP 5
                </button>
              </div>
            )}
          </section>

          <section className="comic-panel-teal comic-panel p-6">
            <h2 className="text-2xl font-bold text-white mb-4">PREFERENCES</h2>

            <div className="space-y-4">
              <div>
                <label className="block font-bold text-white mb-2">PREFERRED GENRES</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, preferredGenres, setPreferredGenres)}
                      className={`px-2 py-1 text-xs font-bold border-2 border-white transition-all ${
                        preferredGenres.includes(genre)
                          ? 'bg-white text-[#4A7C7E]'
                          : 'bg-transparent text-white hover:bg-white/20'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-white mb-2">AVOID GENRES</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, avoidGenres, setAvoidGenres)}
                      className={`px-2 py-1 text-xs font-bold border-2 border-white transition-all ${
                        avoidGenres.includes(genre)
                          ? 'bg-[#A63F4F] text-white'
                          : 'bg-transparent text-white hover:bg-white/20'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-white mb-2">CONTENT RATING</label>
                <select
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-black border-2 border-white focus:outline-none font-bold"
                >
                  <option value="all">Show all</option>
                  <option value="teen">Teen and below</option>
                  <option value="no_nsfw">No NSFW</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-white mb-2">EPISODE LENGTH</label>
                <select
                  value={episodeLength}
                  onChange={(e) => setEpisodeLength(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-black border-2 border-white focus:outline-none font-bold"
                >
                  <option value="any">Any length</option>
                  <option value="< 15 min">Short (under 15 min)</option>
                  <option value="15-30 min">Standard (15-30 min)</option>
                  <option value="> 30 min">Long (over 30 min)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="comic-button mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-[#4A7C7E] font-bold disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'SAVING...' : 'SAVE PREFS'}
            </button>

            {savedMessage && (
              <p className="mt-3 text-center text-white font-bold">{savedMessage}</p>
            )}
          </section>

          <section className="comic-panel-blue comic-panel p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="text-white" size={24} />
              WATCHLIST ({watchlist.length})
            </h2>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {watchlist.map(item => (
                  <div key={item.id} className="group relative">
                    <img
                      src={item.anime_image_url || ''}
                      alt={item.anime_title}
                      className="w-full aspect-[2/3] object-cover border-3 border-white"
                    />
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.id)}
                      className="absolute top-1 right-1 p-1 bg-[#A63F4F] text-white opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="mt-2 text-xs text-white line-clamp-2 font-bold">{item.anime_title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white text-center py-8 font-bold">Your watchlist is empty!</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
