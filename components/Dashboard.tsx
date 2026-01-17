
import React, { useState, useEffect, useRef } from 'react';
import { generateWasteFreePlan, analyzeImage, searchRecipes, generateSpeech } from '../services/geminiService';
import { Ingredient, PlannerResponse, UsedIngredient, Meal } from '../types';
import { decode, decodeAudioData } from '../utils/audioUtils';

const Confetti = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10%`,
            backgroundColor: ['#B5E61D', '#A8D5BA', '#4A7C59', '#F4D03F', '#4285F4'][Math.floor(Math.random() * 5)],
            width: `${Math.random() * 12 + 6}px`,
            height: `${Math.random() * 12 + 6}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 1}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
};

const MealCard: React.FC<{ meal: Meal, type?: string, playTTS?: any }> = ({ meal, type, playTTS }) => {
  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const audioId = `meal-${meal.title}`;

  useEffect(() => {
    const savedProgress = localStorage.getItem(`progress-${meal.title}`);
    if (savedProgress) {
      setCompletedSteps(JSON.parse(savedProgress));
    }
  }, [meal.title]);

  const toggleStep = (index: number) => {
    const newSteps = completedSteps.includes(index)
      ? completedSteps.filter(i => i !== index)
      : [...completedSteps, index];
    
    setCompletedSteps(newSteps);
    localStorage.setItem(`progress-${meal.title}`, JSON.stringify(newSteps));

    if (newSteps.length === meal.recipe.steps.length && meal.recipe.steps.length > 0) {
      setShowConfetti(true);
      playTTS?.("Excellent work! ChefCo is proud. Your dish is officially complete and ready to serve.");
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const progress = meal.recipe.steps.length > 0 
    ? Math.round((completedSteps.length / meal.recipe.steps.length) * 100) 
    : 0;

  return (
    <div className={`transition-all duration-500 rounded-[3rem] p-1 bg-gradient-to-br from-sand to-white dark:from-forest/20 dark:to-forest/5 shadow-lg group relative ${expanded ? 'col-span-full' : ''}`}>
      {showConfetti && <Confetti />}
      
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[2.9rem] p-8 h-full flex flex-col border border-sand dark:border-forest/20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {type && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-leaf-dark mb-2 block opacity-70">{type}</span>}
            <h5 className="text-3xl font-bold text-forest-dark dark:text-cream leading-tight tracking-tight group-hover:text-forest transition-colors">{meal.title}</h5>
          </div>
          <button 
            onClick={() => playTTS?.(`ChefCo guidance for ${meal.title}. It's ${meal.description}. Readiness level: ${meal.recipe.difficulty}.`, audioId)} 
            className="p-4 bg-sand/30 dark:bg-white/5 rounded-full hover:scale-110 active:scale-95 transition-all text-forest dark:text-lime"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m5.586-1.586a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          </button>
        </div>

        <p className="text-sm opacity-50 mb-8 leading-relaxed font-medium">{meal.description}</p>

        <div className="flex flex-wrap gap-2 mb-10">
          {meal.ingredientsUsed.map((ing, i) => (
            <span key={i} className={`text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest border ${ing.source === 'priority' ? 'bg-spoil/10 border-spoil/20 text-spoil' : 'bg-leaf/10 border-leaf/20 text-forest'}`}>
              {ing.name}
            </span>
          ))}
        </div>

        <button 
          onClick={() => setExpanded(!expanded)} 
          className={`w-full py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] transition-all duration-300 flex items-center justify-center space-x-3
            ${expanded ? 'bg-forest-dark text-cream' : 'bg-sand/40 hover:bg-leaf/20 dark:bg-white/5 dark:hover:bg-forest/20'}`}
        >
          <span>{expanded ? 'Close Recipe' : 'Start Cooking'}</span>
          <svg className={`w-4 h-4 transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {expanded && (
          <div className="mt-12 space-y-12 animate-grow">
            {/* Progress Hub */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl py-6 border-b border-sand dark:border-forest/20">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h6 className="text-[10px] font-black uppercase tracking-[0.3em] text-forest/40 dark:text-cream/40 mb-1">Completion</h6>
                  <span className="text-3xl font-black text-forest-dark dark:text-cream tracking-tighter">{progress}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-leaf block mb-1">Status</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${progress === 100 ? 'text-lime' : 'text-forest'}`}>
                    {progress === 100 ? 'Dish Mastered' : 'Cooking in Progress'}
                  </span>
                </div>
              </div>
              <div className="h-4 bg-sand/30 dark:bg-forest/20 rounded-full overflow-hidden p-1 border border-sand dark:border-forest/10">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r from-forest via-leaf to-lime transition-all duration-1000 ease-out ${progress > 0 ? 'animate-pulse-soft' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div>
                  <h6 className="text-[10px] font-black uppercase tracking-[0.4em] text-leaf-dark mb-6 opacity-60">ChefCo's Guide</h6>
                  <div className="space-y-5">
                    {meal.recipe.steps.map((step, i) => (
                      <div 
                        key={i}
                        onClick={() => toggleStep(i)}
                        className={`group flex items-start p-6 rounded-[2.5rem] cursor-pointer transition-all border-2 
                          ${completedSteps.includes(i) 
                            ? 'bg-lime/5 border-lime/20 opacity-40 translate-x-2' 
                            : 'bg-white dark:bg-forest/5 border-transparent hover:border-sand dark:hover:border-forest/30 shadow-sm hover:shadow-md'}`}
                        aria-checked={completedSteps.includes(i)}
                        role="checkbox"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleStep(i)}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 mr-5
                          ${completedSteps.includes(i) ? 'bg-lime text-forest-dark rotate-[360deg]' : 'bg-sand dark:bg-white/10 text-forest-dark dark:text-cream font-black text-sm'}`}>
                          {completedSteps.includes(i) ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          ) : (i + 1)}
                        </div>
                        <p className={`text-lg font-medium leading-relaxed transition-all duration-500 ${completedSteps.includes(i) ? 'line-through decoration-lime decoration-2 italic' : ''}`}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="bg-sand/20 dark:bg-forest/10 p-10 rounded-[3rem] border border-sand dark:border-forest/20">
                   <h6 className="text-[10px] font-black uppercase tracking-[0.4em] text-leaf-dark mb-8 opacity-60">Pantry Check</h6>
                   <div className="flex flex-wrap gap-3">
                     {meal.recipe.masalas?.map((m, i) => (
                       <div key={i} className="px-6 py-3 bg-white dark:bg-forest-dark rounded-2xl shadow-sm border border-sand/40 flex items-center space-x-3">
                         <div className="w-2 h-2 rounded-full bg-lime"></div>
                         <span className="text-sm font-bold opacity-80">{m}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="p-10 bg-forest-dark dark:bg-forest rounded-[3rem] text-cream relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>
                  </div>
                  <h6 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-50">ChefCo Recovery Tip</h6>
                  <p className="text-xl font-medium leading-relaxed italic">
                    "If the texture feels too dry, add a splash of warm stock or pasta water to emulsify the flavors. Don't rush the sizzle!"
                  </p>
                </div>
              </div>
            </div>
            
            {progress === 100 && (
              <div className="bg-lime p-10 rounded-[3.5rem] text-center shadow-[0_30px_60px_rgba(181,230,29,0.3)] animate-grow">
                <h6 className="text-4xl font-black text-forest-dark tracking-tighter mb-2">MASTERPIECE READY!</h6>
                <p className="text-forest-dark font-bold opacity-70 text-lg uppercase tracking-widest">You saved food and cooked like a pro.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [priorityList, setPriorityList] = useState<Ingredient[]>([]);
  const [pantryList, setPantryList] = useState<string[]>([]);
  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLensLoading, setIsLensLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleChefAction = (e: any) => {
      const { name, listType } = e.detail;
      if (listType === 'priority') {
        setPriorityList(prev => [...prev, { id: Math.random().toString(), name, isPriority: true }]);
      } else {
        setPantryList(prev => [...prev, name]);
      }
    };
    window.addEventListener('chef-action', handleChefAction);
    return () => window.removeEventListener('chef-action', handleChefAction);
  }, []);

  useEffect(() => {
    if (result) {
      window.dispatchEvent(new CustomEvent('chef-context', { detail: { result } }));
    }
  }, [result]);

  const handleGenerate = async () => {
    if (priorityList.length === 0) return alert("Please list items you want to save first!");
    setLoading(true);
    try {
      const data = await generateWasteFreePlan(priorityList.map(i => i.name), pantryList);
      setResult(data);
    } catch (e) { alert("Something went wrong. Let's try once more."); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const data = await searchRecipes(searchQuery);
    setSearchResults(data);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLensLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const items = await analyzeImage(base64);
        const newItems = items.map(name => ({ id: Math.random().toString(), name, isPriority: true }));
        setPriorityList(prev => [...prev, ...newItems]);
      } catch (err) {} finally { setIsLensLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const playTTS = async (text: string) => {
    try {
      const base64Audio = await generateSpeech(text);
      if (!base64Audio) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-24 pb-48 pt-10">
      <section className="text-center space-y-12 animate-leaf-fade">
        <h2 className="text-7xl md:text-[10rem] font-black text-forest-dark dark:text-cream leading-none tracking-tighter">
          RESKUE.<br />
          <span className="text-leaf italic underline decoration-lime/30 decoration-8 underline-offset-[1rem]">REVIVE.</span>
        </h2>
        <p className="text-2xl opacity-40 max-w-2xl mx-auto font-bold tracking-tight">Meet ChefCo, your zero-waste AI mentor. Transform expiring groceries into Michelin-level meals.</p>
        
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="What's in your fridge? (e.g. Wilted spinach and paneer)"
            className="flex-grow bg-white dark:bg-forest/10 border-2 border-sand dark:border-forest/40 px-12 py-8 rounded-[3rem] focus:outline-none focus:border-leaf shadow-inner transition-all text-xl font-medium"
          />
          <button onClick={handleSearch} disabled={loading} className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-16 py-8 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all">
            {loading ? 'Consulting ChefCo...' : 'Teach Me'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="bg-white/50 dark:bg-forest/5 glass p-16 rounded-[4.5rem] border-b-[16px] border-spoil/10 transition-all hover:border-spoil/30">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-4xl font-black tracking-tighter">Save List</h3>
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-black uppercase text-white bg-forest-dark dark:bg-lime dark:text-forest-dark px-8 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl">
              {isLensLoading ? 'ChefCo Scanning...' : 'Vision Lens'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </div>
          <input 
            onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setPriorityList([...priorityList, { id: Date.now().toString(), name: e.currentTarget.value.trim(), isPriority: true }]); e.currentTarget.value = ''; } }} 
            placeholder="Add items needing rescue..." 
            className="w-full bg-cream/30 dark:bg-forest/20 border-2 border-sand/40 p-6 rounded-[2rem] mb-10 text-lg font-medium focus:outline-none focus:border-leaf" 
          />
          <div className="flex flex-wrap gap-4">
            {priorityList.map(item => (
              <span key={item.id} className="bg-spoil/10 text-spoil px-6 py-3 rounded-2xl text-xs font-black border border-spoil/20 flex items-center shadow-sm">
                {item.name}
                <button onClick={() => setPriorityList(priorityList.filter(p => p.id !== item.id))} className="ml-4 hover:text-forest transition-colors text-xl">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/50 dark:bg-forest/5 glass p-16 rounded-[4.5rem] border-b-[16px] border-leaf/10 transition-all hover:border-leaf/30">
          <h3 className="text-4xl font-black tracking-tighter mb-10">Pantry</h3>
          <input 
            onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setPantryList([...pantryList, e.currentTarget.value.trim()]); e.currentTarget.value = ''; } }} 
            placeholder="Staples you have... (Rice, Spices)" 
            className="w-full bg-cream/30 dark:bg-forest/20 border-2 border-sand/40 p-6 rounded-[2rem] mb-10 text-lg font-medium focus:outline-none focus:border-leaf" 
          />
          <div className="flex flex-wrap gap-4">
            {pantryList.map((item, i) => (
              <span key={i} className="bg-leaf/10 text-forest-dark dark:text-cream px-6 py-3 rounded-2xl text-xs font-black border border-leaf/20 flex items-center shadow-sm">
                {item}
                <button onClick={() => setPantryList(pantryList.filter((_, idx) => idx !== i))} className="ml-4 hover:text-spoil transition-colors text-xl">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center py-10">
        <button 
          onClick={handleGenerate} 
          disabled={loading || priorityList.length === 0} 
          className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-24 py-12 rounded-[4rem] text-3xl font-black uppercase tracking-[0.3em] shadow-[0_40px_80px_rgba(0,0,0,0.3)] hover:shadow-leaf/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
        >
          {loading ? 'ChefCo Planning...' : 'Reskue Mission'}
        </button>
      </div>

      {(result || searchResults.length > 0) && (
        <div className="space-y-24 animate-grow px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-6xl font-black tracking-tighter">{searchResults.length > 0 ? 'ChefCo Curations' : 'The Reskue Plan'}</h3>
            <div className="h-1 flex-grow mx-12 bg-sand/30 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {searchResults.length > 0 ? (
              searchResults.map((meal, i) => <MealCard key={i} meal={meal} playTTS={playTTS} />)
            ) : (
              result?.plan.flatMap((day) => [
                <MealCard key={`${day.day}-b`} meal={day.breakfast} type={`Day ${day.day} • Breakfast`} playTTS={playTTS} />,
                <MealCard key={`${day.day}-l`} meal={day.lunch} type={`Day ${day.day} • Lunch`} playTTS={playTTS} />,
                <MealCard key={`${day.day}-d`} meal={day.dinner} type={`Day ${day.day} • Dinner`} playTTS={playTTS} />
              ])
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
