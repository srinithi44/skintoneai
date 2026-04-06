import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, LogOut, User } from 'lucide-react';

// Auth
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Components
import StepperAnalysis from './components/StepperAnalysis';

const App = () => {
  const { user, loading, logout, getUserDisplayName } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  /* 
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
  */

  // Main app — authenticated
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="pt-10 sm:pt-14 md:pt-16 pb-8 sm:pb-10 md:pb-12 text-center px-4 relative">
        <motion.h1
          className="font-playfair text-4xl sm:text-5xl md:text-7xl text-dark-luxe flex items-center justify-center gap-4 px-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          GlowMatchAI
        </motion.h1>
        <motion.p
          className="text-mauve mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-light tracking-wide italic px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Makeup recommendations, made for you !!
        </motion.p>

        {/* User badge */}
        <div className="user-badge-wrapper">
          <motion.button
            id="user-menu-btn"
            className="user-badge !bg-[#4a2e2a]/5 !border-[#8d5b4c]/30 hover:!bg-[#4a2e2a]/10"
            onClick={() => setShowUserMenu(p => !p)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="user-avatar !bg-[#8d5b4c] !text-[#fdf8f5]">
              <User size={16} />
            </div>
            <span className="user-name !text-[#4a2e2a]/80 font-medium">{getUserDisplayName() || 'Demo User'}</span>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                className="user-menu !bg-white !border-[#8d5b4c]/20 !shadow-2xl"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="user-menu-email !text-[#4a2e2a]/40">{user?.email || 'demo@beauty.ai'}</div>
                <button
                  id="logout-btn"
                  className="user-menu-logout hover:!bg-[#fdf8f5]"
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StepperAnalysis />
        </motion.div>
      </main>
    </div>
  );
};

export default App;
