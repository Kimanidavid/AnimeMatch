import { useState } from 'react';
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
    <div className="min-h-screen bg-[#F5EFE0] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-8 items-center mb-16">
          <div className="comic-panel comic-panel-primary p-8">
            <h1 className="text-6xl md:text-7xl font-bold mb-4 leading-tight">
              ANIME<br />MATCH
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-black mb-6">
              FIND YOUR NEXT OBSESSION!
            </h2>
            <p className="font-bold text-lg mb-6 leading-relaxed">
              Tell us your top 5 favorite anime and we'll recommend your next favorite series using AI-powered analysis!
            </p>
            <button
              onClick={handleGetStarted}
              className="comic-button bg-[#4A7C7E] text-white px-8 py-4 text-xl hover:scale-110"
            >
              GET STARTED NOW!
            </button>
          </div>

          <div className="relative">
            <div className="comic-panel comic-panel-teal p-12 -rotate-2">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="80" fill="#F7931E" stroke="black" strokeWidth="6" />
                <text x="100" y="110" fontSize="48" fontWeight="bold" textAnchor="middle" fill="black" fontFamily="Bangers">
                  POW!
                </text>
              </svg>
            </div>
            <div className="absolute top-8 right-8 comic-panel bg-white p-6 transform rotate-3 w-48">
              <p className="font-bold text-center text-black">
                Personalized recommendations based on YOUR taste!
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <FeatureCard
            number="1"
            title="Pick Your Top 5"
            description="Search and select your 5 favorite anime series"
            color="comic-panel-primary"
          />
          <FeatureCard
            number="2"
            title="AI Analysis"
            description="We analyze genres, studios, and storytelling styles"
            color="comic-panel-teal"
          />
          <FeatureCard
            number="3"
            title="Get Recommendations"
            description="Discover anime tailored to your unique taste!"
            color="comic-panel-blue"
          />
        </div>

        <div className="comic-panel p-8 mb-8 transform -rotate-1">
          <h3 className="text-4xl font-bold mb-6">HOW IT WORKS!</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Step step="1" text="Search anime titles" />
            <Step step="2" text="Select your top 5" />
            <Step step="3" text="Get matches!" />
          </div>
        </div>

        <div className="text-center">
          <div className="inline-block comic-panel comic-panel-primary p-8 transform rotate-1">
            <p className="text-2xl font-bold text-black">
              Thousands of anime to discover!
            </p>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

function FeatureCard({ number, title, description, color }: {
  number: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className={`comic-panel ${color} p-6 transform ${number === '2' ? '' : number === '1' ? '-rotate-2' : 'rotate-2'}`}>
      <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl mb-4 rounded-full">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className={color.includes('primary') ? 'font-semibold' : 'text-white font-semibold'}>
        {description}
      </p>
    </div>
  );
}

function Step({ step, text }: { step: string; text: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-3xl mb-3 rounded-full mx-auto border-4 border-black">
        {step}
      </div>
      <p className="font-bold text-lg">{text}</p>
    </div>
  );
}
