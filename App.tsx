
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-forest-dark/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cream dark:bg-forest-dark border-2 border-sand dark:border-forest p-8 md:p-12 rounded-[3rem] shadow-2xl max-w-2xl w-full animate-grow">
        <button onClick={onClose} className="absolute top-8 right-8 text-forest-dark dark:text-cream opacity-40 hover:opacity-100">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 className="text-4xl font-black mb-6 tracking-tighter">{title}</h3>
        <div className="text-lg leading-relaxed opacity-80">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [showAbout, setShowAbout] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [celebration, setCelebration] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const triggerCelebration = () => {
    setCelebration(true);
    setTimeout(() => setCelebration(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 dark:bg-forest-dark">
      {/* Celebration Emojis */}
      {celebration && (
        <div className="fixed inset-0 pointer-events-none z-[110] flex items-center justify-center">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="absolute text-5xl animate-float"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              {['🌱', '🥗', '🌎', '🙌', '✨', '🥦'][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="bg-cream/80 dark:bg-forest-dark/80 backdrop-blur-md py-6 px-6 md:px-12 sticky top-0 z-50 border-b border-sand dark:border-forest transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-forest-dark dark:bg-forest p-3 rounded-2xl shadow-xl transform rotate-3 hover:rotate-0 transition-transform cursor-pointer group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-lime animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-forest-dark dark:text-cream tracking-tighter transition-colors">ZERO<span className="text-forest dark:text-lime italic">POINT</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-forest/40 dark:text-lime/40 -mt-1 transition-colors">Waste-Free Planner</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-4 md:space-x-8">
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-sand/50 dark:bg-forest/50 hover:bg-leaf dark:hover:bg-lime/20 transition-all group"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <svg className="w-5 h-5 text-lime animate-pulse-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-forest-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button 
              onClick={triggerCelebration}
              className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-forest/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Join the Movement
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 pt-10">
        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="bg-forest-dark dark:bg-black/40 text-leaf-dark py-12 px-6 mt-20 relative overflow-hidden transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-leaf via-lime to-leaf"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-xl font-black text-white tracking-tighter mb-2 uppercase">ZeroPoint</h4>
            <p className="text-sm opacity-60 max-w-sm">Empowering every kitchen to save the planet, one meal at a time. Designed by BeyondYotta_Helix.</p>
          </div>
          <div className="flex space-x-8 text-sm font-bold">
            <button onClick={() => setShowAbout(true)} className="hover:text-lime cursor-pointer transition-colors uppercase tracking-widest outline-none">About</button>
            <button onClick={() => setShowTips(true)} className="hover:text-lime cursor-pointer transition-colors uppercase tracking-widest text-lime outline-none">Eco-Tips</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center">
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-lime opacity-80 mb-2">
            Website build by Team BeyondYotta Helix
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest opacity-40">
            © 2024 Zero-Point Planner. Built for a better future.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Why ZeroPoint?">
        <p className="mb-4">ZeroPoint was born from a simple realization: the most sustainable meal is the one already in your kitchen. We started this page to transform the $1 trillion global food waste problem into a kitchen-level solution.</p>
        <p className="mb-4">By leveraging AI, we help families rediscover the value in every wilted carrot and half-empty jar. We believe that small, daily choices in the kitchen are the fastest path to a healthier planet.</p>
        <p className="font-black text-lime uppercase tracking-widest">Made with passion by Team BeyondYotta Helix.</p>
      </Modal>

      <Modal isOpen={showTips} onClose={() => setShowTips(false)} title="Real Eco Tips">
        <ul className="space-y-6">
          <li className="flex items-start">
            <span className="text-lime mr-4 font-black">01</span>
            <p><strong>Revive wilted greens:</strong> Soak them in ice-cold water for 15 minutes to bring back the crispness.</p>
          </li>
          <li className="flex items-start">
            <span className="text-lime mr-4 font-black">02</span>
            <p><strong>Store potatoes with an apple:</strong> The ethylene gas from the apple prevents potatoes from sprouting.</p>
          </li>
          <li className="flex items-start">
            <span className="text-lime mr-4 font-black">03</span>
            <p><strong>Herb Ice Cubes:</strong> Freeze leftover herb scraps in olive oil in an ice tray for instant flavor bombs later.</p>
          </li>
          <li className="flex items-start">
            <span className="text-lime mr-4 font-black">04</span>
            <p><strong>The FIFO Method:</strong> 'First In, First Out'. Always move older ingredients to the front of your fridge so they get used first.</p>
          </li>
        </ul>
      </Modal>
    </div>
  );
};

export default App;
