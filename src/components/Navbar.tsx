import { Sparkles, Home, TrendingUp, Calendar, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: 'landing' | 'recommendations' | 'upcoming' | 'profile') => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-pink-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Sparkles className="text-pink-500" size={28} />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
              AnimeMatch
            </span>
          </div>

          <div className="flex items-center gap-1">
            <NavButton
              icon={Home}
              label="Home"
              active={currentPage === 'landing'}
              onClick={() => onNavigate('landing')}
            />
            <NavButton
              icon={TrendingUp}
              label="For You"
              active={currentPage === 'recommendations'}
              onClick={() => onNavigate('recommendations')}
            />
            <NavButton
              icon={Calendar}
              label="Upcoming"
              active={currentPage === 'upcoming'}
              onClick={() => onNavigate('upcoming')}
            />
            <NavButton
              icon={User}
              label="Profile"
              active={currentPage === 'profile'}
              onClick={() => onNavigate('profile')}
            />
            <button
              onClick={signOut}
              className="ml-2 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        active
          ? 'bg-gradient-to-r from-pink-500/20 to-blue-500/20 text-pink-400 border border-pink-500/30'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
