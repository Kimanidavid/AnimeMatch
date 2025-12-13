import { Home, TrendingUp, Calendar, User, LogOut, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: 'landing' | 'recommendations' | 'upcoming' | 'profile' | 'binge') => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 bg-[#F7931E] border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-black">ANIME MATCH</span>
          </div>

          <div className="flex items-center gap-2">
            <NavButton
              icon={Home}
              label="HOME"
              active={currentPage === 'landing'}
              onClick={() => onNavigate('landing')}
            />
            <NavButton
              icon={TrendingUp}
              label="FOR YOU"
              active={currentPage === 'recommendations'}
              onClick={() => onNavigate('recommendations')}
            />
            <NavButton
              icon={Calendar}
              label="NEW"
              active={currentPage === 'upcoming'}
              onClick={() => onNavigate('upcoming')}
            />
            <NavButton
              icon={Play}
              label="BINGE"
              active={currentPage === 'binge'}
              onClick={() => onNavigate('binge')}
            />
            <NavButton
              icon={User}
              label="PROFILE"
              active={currentPage === 'profile'}
              onClick={() => onNavigate('profile')}
            />
            <button
              onClick={signOut}
              className="ml-2 p-2 text-black hover:bg-[#A63F4F] hover:text-white transition-all font-bold border-2 border-black rounded"
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
      className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-black transition-all text-black ${
        active
          ? 'bg-black text-[#F7931E] border-black'
          : 'bg-white hover:bg-gray-200'
      }`}
    >
      <Icon size={20} />
      <span className="text-sm">{label}</span>
    </button>
  );
}
