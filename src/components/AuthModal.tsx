import { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          setError(error.message);
        } else {
          onSuccess();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onSuccess();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="comic-panel comic-panel-primary max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-black">
            {isSignUp ? 'JOIN NOW!' : 'SIGN IN!'}
          </h2>
          <button
            onClick={onClose}
            className="text-black hover:text-red-600 transition-colors font-bold text-2xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#A63F4F] border-4 border-black text-white font-bold rounded-lg">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block font-bold text-black mb-2 text-lg">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white border-4 border-black text-black placeholder-gray-500 focus:outline-none font-bold"
                placeholder="Enter username"
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-black mb-2 text-lg">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border-4 border-black text-black placeholder-gray-500 focus:outline-none font-bold"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-black mb-2 text-lg">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border-4 border-black text-black placeholder-gray-500 focus:outline-none font-bold"
              placeholder="Enter password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="comic-button w-full py-4 px-4 bg-[#4A7C7E] text-white text-xl disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'SIGN UP' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="font-bold text-black hover:text-[#A63F4F] transition-colors text-lg"
          >
            {isSignUp
              ? 'Already have account? SIGN IN'
              : 'No account? SIGN UP'}
          </button>
        </div>
      </div>
    </div>
  );
}
