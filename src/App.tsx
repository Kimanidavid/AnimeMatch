import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Top5SelectionPage } from './pages/Top5SelectionPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { ProfilePage } from './pages/ProfilePage';
import { BingePage } from './pages/BingePage';

type Page = 'landing' | 'top5' | 'recommendations' | 'upcoming' | 'profile' | 'binge';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const { user, loading } = useAuth();

  const handleGetStarted = () => {
    setCurrentPage('top5');
  };

  const handleTop5Complete = () => {
    setCurrentPage('recommendations');
  };

  const handleRePickTop5 = () => {
    setCurrentPage('top5');
  };

  const handleNavigate = (page: 'landing' | 'recommendations' | 'upcoming' | 'profile' | 'binge') => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {user && <Navbar currentPage={currentPage} onNavigate={handleNavigate} />}

      {currentPage === 'landing' && <LandingPage onGetStarted={handleGetStarted} />}
      {currentPage === 'top5' && user && <Top5SelectionPage onComplete={handleTop5Complete} />}
      {currentPage === 'recommendations' && user && <RecommendationsPage onRePickTop5={handleRePickTop5} />}
      {currentPage === 'upcoming' && user && <UpcomingPage />}
      {currentPage === 'profile' && user && <ProfilePage onRePickTop5={handleRePickTop5} />}
      {currentPage === 'binge' && user && <BingePage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
