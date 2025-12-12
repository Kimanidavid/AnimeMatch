import { useState } from 'react';
import { Sparkles, Zap, Heart, TrendingUp } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      onGetStarted();
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>

      <div className="relative z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="text-pink-500 animate-pulse" size={40} />
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                AnimeMatch
              </h1>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Find Your Next Favorite Anime
            </h2>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Tell us your top 5 anime and we'll recommend your next obsession
            </p>

            <button
              onClick={handleGetStarted}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105"
            >
              <Zap className="group-hover:rotate-12 transition-transform" size={24} />
              Get Started
              <Sparkles className="group-hover:rotate-12 transition-transform" size={24} />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <FeatureCard
              icon={Heart}
              title="Personalized For You"
              description="Our AI analyzes your top 5 anime to understand your unique taste and preferences"
              gradient="from-pink-500/10 to-pink-500/5"
              iconColor="text-pink-500"
            />
            <FeatureCard
              icon={Sparkles}
              title="Discover Hidden Gems"
              description="Find anime you never knew existed but will absolutely love"
              gradient="from-purple-500/10 to-purple-500/5"
              iconColor="text-purple-500"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Stay Updated"
              description="Get the latest on upcoming and currently airing anime"
              gradient="from-blue-500/10 to-blue-500/5"
              iconColor="text-blue-500"
            />
          </div>

          <div className="mt-20 text-center">
            <div className="inline-block bg-gradient-to-r from-pink-500/10 to-blue-500/10 backdrop-blur-lg border border-pink-500/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                How It Works
              </h3>
              <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                <Step number="1" text="Pick your top 5 anime" />
                <div className="hidden md:block text-pink-500">→</div>
                <Step number="2" text="Get personalized recommendations" />
                <div className="hidden md:block text-pink-500">→</div>
                <Step number="3" text="Discover your next favorite" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, gradient, iconColor }: {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 hover:scale-105`}>
      <div className={`${iconColor} mb-4`}>
        <Icon size={40} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
        {number}
      </div>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}
