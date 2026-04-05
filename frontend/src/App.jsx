import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, Camera, Sparkles, ThermometerSun, Wand2, LogOut, User } from 'lucide-react';

// Auth
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Components
import SkinToneAnalyzer from './components/SkinToneAnalyzer';
import RecommendationPanel from './components/RecommendationPanel';
import WeatherWidget from './components/WeatherWidget';
import TransformationTool from './components/TransformationTool';

const App = () => {
  const { user, loading, logout, getUserDisplayName } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [activeTab, setActiveTab] = useState('Skin Analysis');
  const [skinToneData, setSkinToneData] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { name: 'Skin Analysis', icon: Camera },
    { name: 'Recommendations', icon: Sparkles },
    { name: 'Weather Tips', icon: ThermometerSun },
    { name: 'Transformation', icon: Wand2 }
  ];

  // Show full-screen loader while session is loading
  if (loading) {
    return (
      <div className="auth-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          <Sparkle size={36} style={{ color: 'var(--rose-gold)' }} />
        </motion.div>
      </div>
    );
  }

  // Show auth pages if not logged in
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        {authView === 'login' ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
          </motion.div>
        ) : (
          <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SignupPage onSwitchToLogin={() => setAuthView('login')} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Main app — authenticated
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="pt-12 pb-8 text-center px-4 relative">
        <motion.h1
          className="font-playfair text-5xl md:text-6xl text-rose-gold flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkle className="w-8 h-8 fill-rose-gold" />
          AI Beauty Studio
          <Sparkle className="w-8 h-8 fill-rose-gold" />
        </motion.h1>
        <motion.p
          className="text-cream/60 mt-4 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Powered by Intelligence, Styled for You
        </motion.p>

        {/* User badge */}
        <div className="user-badge-wrapper">
          <motion.button
            id="user-menu-btn"
            className="user-badge"
            onClick={() => setShowUserMenu(p => !p)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <span className="user-name">{getUserDisplayName()}</span>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                className="user-menu"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="user-menu-email">{user.email}</div>
                <button
                  id="logout-btn"
                  className="user-menu-logout"
                  onClick={() => { setShowUserMenu(false); logout(); }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Tabs */}
      <nav className="max-w-3xl mx-auto px-4 mb-8">
        <div className="flex bg-white/5 backdrop-blur-lg p-1 rounded-full border border-white/10 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                id={`tab-${tab.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveTab(tab.name)}
                className={`flex-1 py-3 px-2 rounded-full relative transition-colors flex items-center justify-center gap-2 text-sm sm:text-base ${
                  isActive ? 'text-dark font-bold' : 'text-cream/70 hover:text-rose-gold'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-rose-gold rounded-full shadow-[0_0_15px_rgba(201,149,106,0.3)]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-4 h-4 z-10 transition-colors ${isActive ? 'text-dark' : ''}`} />
                <span className="relative z-10 hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'Skin Analysis' && (
              <SkinToneAnalyzer
                onAnalysisComplete={(data) => {
                  setSkinToneData(data);
                  setTimeout(() => setActiveTab('Recommendations'), 1200);
                }}
              />
            )}
            {activeTab === 'Recommendations' && (
              <RecommendationPanel skinTone={skinToneData?.skin_tone} />
            )}
            {activeTab === 'Weather Tips' && <WeatherWidget />}
            {activeTab === 'Transformation' && <TransformationTool />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
