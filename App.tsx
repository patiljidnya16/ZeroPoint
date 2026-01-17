
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LiveChef from './components/LiveChef';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

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

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 dark:bg-forest-dark">
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
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-sm font-bold text-forest-dark/60 dark:text-cream/60 hover:text-forest dark:hover:text-lime transition-colors">How it works</a>
              <button className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-forest/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                Join the Movement
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 pt-10">
        <Dashboard />
      </main>

      {/* Conversational Layer */}
      <LiveChef />

      {/* Footer */}
      <footer className="bg-forest-dark dark:bg-black/40 text-leaf-dark py-12 px-6 mt-20 relative overflow-hidden transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-leaf via-lime to-leaf"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-xl font-black text-white tracking-tighter mb-2 uppercase">ZeroPoint</h4>
            <p className="text-sm opacity-60">Empowering every kitchen to save the planet, one meal at a time.</p>
          </div>
          <div className="flex space-x-8 text-sm font-bold">
            <span className="hover:text-lime cursor-pointer transition-colors uppercase tracking-widest">About</span>
            <span className="hover:text-lime cursor-pointer transition-colors uppercase tracking-widest text-lime">Eco-Tips</span>
            <span className="hover:text-lime cursor-pointer transition-colors uppercase tracking-widest">Contact</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center">
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-lime opacity-80 mb-2">
            Website build by BeyondYotta_Helix
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest opacity-40">
            © 2024 Zero-Point Planner. Built for a better future.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
