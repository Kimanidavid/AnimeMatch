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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <User className="text-pink-500" />
            Profile & Settings
          </h1>
          <p className="text-gray-400">Manage your preferences and anime lists</p>
        </div>

        <div className="space-y-6">
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </section>

          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Top 5 Anime</h2>
            {topAnime.length > 0 ? (
              <div className="space-y-3">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {topAnime.map((anime, index) => (
                    <div key={anime.mal_id} className="flex-shrink-0 text-center">
                      <div className="relative">
                        <img
                          src={anime.images?.jpg?.image_url}
                          alt={anime.title}
                          className="w-24 h-32 object-cover rounded-lg border-2 border-pink-500/30"
                        />
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 max-w-[96px] truncate">{anime.title}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onRePickTop5}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-pink-400 rounded-lg hover:bg-gray-600 transition-all"
                >
                  <RefreshCw size={16} />
                  Change Top 5
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You haven't selected your top 5 yet</p>
                <button
                  onClick={onRePickTop5}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all"
                >
                  Pick Your Top 5
                </button>
              </div>
            )}
          </section>

          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Preferences</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, preferredGenres, setPreferredGenres)}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        preferredGenres.includes(genre)
                          ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Avoid Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, avoidGenres, setAvoidGenres)}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        avoidGenres.includes(genre)
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content Rating Filter</label>
                <select
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="all">Show all</option>
                  <option value="teen">Teen and below</option>
                  <option value="no_nsfw">No NSFW</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Episode Length</label>
                <select
                  value={episodeLength}
                  onChange={(e) => setEpisodeLength(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
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
              className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>

            {savedMessage && (
              <p className="mt-3 text-center text-green-400">{savedMessage}</p>
            )}
          </section>

          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="text-pink-500" size={24} />
              Your Watchlist ({watchlist.length})
            </h2>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {watchlist.map(item => (
                  <div key={item.id} className="group relative">
                    <img
                      src={item.anime_image_url || ''}
                      alt={item.anime_title}
                      className="w-full aspect-[2/3] object-cover rounded-lg border border-pink-500/30"
                    />
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="mt-2 text-sm text-gray-300 line-clamp-2">{item.anime_title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Your watchlist is empty</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
