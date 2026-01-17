
import React, { useState, useEffect, useRef } from 'react';
import { generateWasteFreePlan, analyzeImage, searchRecipes, generateSpeech } from '../services/geminiService';
import { Ingredient, PlannerResponse, UsedIngredient, Meal } from '../types';
import { decode, decodeAudioData } from '../utils/audioUtils';

const IngredientTag: React.FC<{ ingredient: UsedIngredient }> = ({ ingredient }) => {
  const isPriority = ingredient.source === 'priority';
  const isSwap = !!ingredient.substitutedFrom;
  
  return (
    <div className="flex flex-col">
      <span className={`group text-[10px] px-2.5 py-1 rounded-full flex items-center space-x-1.5 font-bold tracking-tight transition-all
        ${isSwap ? 'bg-lime/20 text-forest border border-lime/40' : isPriority ? 'bg-spoil/10 text-spoil border border-spoil/20' : 'bg-leaf/20 text-forest-dark border border-leaf-dark/30'}`}>
        {ingredient.name}
        {isSwap && (
          <span className="ml-1 opacity-60" title={`Substituted for ${ingredient.substitutedFrom}`}>
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </span>
        )}
      </span>
    </div>
  );
};

const ImpactCard: React.FC<{ impact: any }> = ({ impact }) => (
  <div className="bg-forest-dark text-cream p-8 rounded-[2.5rem] shadow-2xl border border-white/10 animate-grow grid grid-cols-3 gap-6">
    <div className="text-center space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-lime opacity-80">CO2 Saved</p>
      <p className="text-3xl font-black">{impact.carbonSaved}kg</p>
    </div>
    <div className="text-center space-y-1 border-x border-white/10">
      <p className="text-[10px] font-black uppercase tracking-widest text-lime opacity-80">Water Saved</p>
      <p className="text-3xl font-black">{impact.waterSaved}L</p>
    </div>
    <div className="text-center space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-lime opacity-80">Money Saved</p>
      <p className="text-3xl font-black">${impact.moneySaved}</p>
    </div>
  </div>
);

const MealCard: React.FC<{ meal: Meal, type?: string, playTTS?: any }> = ({ meal, type, playTTS }) => {
  const [expanded, setExpanded] = useState(false);
  const audioId = `meal-${meal.title}`;

  return (
    <div className="bg-white dark:bg-forest/10 rounded-[2.5rem] p-8 shadow-sm border border-sand dark:border-forest/20 transition-all hover:shadow-2xl group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          {type && <h4 className="text-[10px] font-black uppercase tracking-widest text-leaf-dark mb-1">{type}</h4>}
          <h5 className="text-xl font-bold text-forest-dark dark:text-cream group-hover:text-forest transition-colors">{meal.title}</h5>
        </div>
        <button 
          onClick={() => playTTS?.(`Chef here. Today's ${type} is ${meal.title}. ${meal.description}`)} 
          className="text-forest hover:text-lime transition-all p-2 bg-sand/20 dark:bg-white/5 rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m5.586-1.586a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        </button>
      </div>
      <p className="text-sm opacity-70 mb-6 leading-relaxed">{meal.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-8">
        {meal.ingredientsUsed.map((ing, i) => <IngredientTag key={i} ingredient={ing} />)}
      </div>

      <button onClick={() => setExpanded(!expanded)} className="w-full py-3 bg-sand/30 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-leaf/20 transition-all border border-transparent hover:border-leaf/30">
        {expanded ? 'Hide Steps' : 'View Recipe'}
      </button>

      {expanded && (
        <div className="mt-8 pt-8 border-t border-sand dark:border-forest/20 animate-grow space-y-8">
          {meal.recipe.masalas && meal.recipe.masalas.length > 0 && (
            <div className="bg-earth/10 dark:bg-forest/20 p-5 rounded-[1.5rem] border border-earth/20">
              <h6 className="text-[11px] font-black uppercase text-leaf-dark dark:text-lime mb-3 tracking-widest">Seasoning Base</h6>
              <div className="flex flex-wrap gap-2">
                {meal.recipe.masalas.map((m, i) => (
                  <span key={i} className="text-[10px] font-bold bg-white dark:bg-forest-dark text-forest-dark dark:text-cream px-3 py-1 rounded-lg shadow-sm">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h6 className="text-[11px] font-black uppercase text-leaf-dark dark:text-lime mb-4 tracking-widest">Instructions</h6>
            <ol className="space-y-4">
              {meal.recipe.steps.map((s, i) => (
                <li key={i} className="text-sm opacity-80 flex space-x-4 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-forest text-white dark:bg-lime dark:text-forest-dark rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                  <span className="leading-relaxed pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [priorityList, setPriorityList] = useState<Ingredient[]>([]);
  const [pantryList, setPantryList] = useState<string[]>([]);
  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [savedPlans, setSavedPlans] = useState<PlannerResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLensLoading, setIsLensLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [viewSaved, setViewSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    setSavedPlans(saved);
    
    if (result) {
      window.dispatchEvent(new CustomEvent('chef-context', { detail: { result } }));
    }

    const openHandler = () => setIsHowItWorksOpen(true);
    window.addEventListener('open-how-it-works', openHandler);
    return () => window.removeEventListener('open-how-it-works', openHandler);
  }, [result]);

  const handleGenerate = async () => {
    if (priorityList.length === 0) return alert("Please identify items to rescue first.");
    setLoading(true);
    try {
      const data = await generateWasteFreePlan(priorityList.map(i => i.name), pantryList);
      setResult(data);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (e) { alert("Failed to compute plan."); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const data = await searchRecipes(searchQuery);
    setSearchResults(data);
    setLoading(false);
  };

  const handleSavePlan = () => {
    if (result) {
      const updated = [result, ...savedPlans].slice(0, 5);
      setSavedPlans(updated);
      localStorage.setItem('savedPlans', JSON.stringify(updated));
      setSaveMsg('Archived in Vault.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleLensClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLensLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const foundIngredients = await analyzeImage(base64);
        if (foundIngredients.length > 0) {
          const newItems = foundIngredients.map(name => ({
            id: (Date.now() + Math.random()).toString(),
            name,
            isPriority: true
          }));
          setPriorityList(prev => [...prev, ...newItems]);
          setSaveMsg(`Detected ${foundIngredients.length} ingredients.`);
          setTimeout(() => setSaveMsg(''), 3000);
        }
      } catch (err) {
        setSaveMsg('Detection error.');
      } finally {
        setIsLensLoading(false);
      }
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
    } catch (e) { console.error("Audio error", e); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32 relative">
      {/* Search Section */}
      <section className="text-center space-y-12 animate-leaf-fade">
        <div className="space-y-4">
          <h2 className="text-6xl sm:text-8xl font-black text-forest-dark dark:text-cream leading-[0.9] tracking-tighter">
            ZERO<span className="text-leaf italic font-light">WASTE</span> <br />
            PLANNER.
          </h2>
          <p className="text-lg opacity-60 max-w-lg mx-auto font-medium">An autonomous agent that plans your kitchen's survival.</p>
        </div>
        
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow group">
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Find a recipe..."
              className="w-full bg-white dark:bg-forest/20 border-2 border-sand dark:border-forest/40 px-8 py-6 rounded-[2.5rem] focus:outline-none focus:border-leaf shadow-sm text-base transition-all group-hover:shadow-md"
            />
          </div>
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin"></div> : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Impact Stats (Agent Proactive Output) */}
      {result && <ImpactCard impact={result.impact} />}

      {/* Main Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className={`bg-white/70 dark:bg-forest/10 glass p-10 rounded-[3.5rem] border-b-[16px] border-spoil/20 transition-all hover:shadow-2xl relative`}>
           <div className="flex justify-between items-start mb-10">
             <div>
               <h3 className="text-3xl font-black flex items-center"><span className="w-5 h-5 bg-spoil rounded-full mr-4 shadow-lg animate-pulse" /> Use First</h3>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Expiring Ingredients</p>
             </div>
             <div className="flex space-x-3">
                <button 
                  onClick={handleLensClick}
                  disabled={isLensLoading}
                  className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLensLoading ? 'bg-earth text-forest animate-pulse' : 'bg-lime text-forest-dark hover:scale-105 shadow-xl shadow-lime/20'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{isLensLoading ? 'Scanning...' : 'Scan Fridge'}</span>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
             </div>
           </div>
           
           <div className="relative mb-8">
            <input 
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setPriorityList([...priorityList, { id: Date.now().toString(), name: e.currentTarget.value.trim(), isPriority: true }]);
                  e.currentTarget.value = '';
                }
              }} 
              placeholder="Type item and press enter..." 
              className="w-full bg-cream/50 dark:bg-forest/30 border-2 border-sand dark:border-forest/50 p-6 rounded-3xl shadow-inner focus:outline-none focus:border-spoil/50 transition-all text-sm font-medium" 
            />
           </div>

           <div className="flex flex-wrap gap-3 min-h-[5rem]">
             {priorityList.map(item => (
               <span key={item.id} className="bg-spoil/5 text-spoil px-5 py-3 rounded-2xl text-xs font-black border border-spoil/20 flex items-center animate-grow group">
                {item.name}
                <button onClick={() => setPriorityList(priorityList.filter(p => p.id !== item.id))} className="ml-3 opacity-20 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
               </span>
             ))}
           </div>
        </div>

        <div className={`bg-white/70 dark:bg-forest/10 glass p-10 rounded-[3.5rem] border-b-[16px] border-leaf/20 transition-all hover:shadow-2xl`}>
           <div className="mb-10">
             <h3 className="text-3xl font-black flex items-center"><span className="w-5 h-5 bg-leaf rounded-full mr-4 shadow-lg" /> Pantry Items</h3>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Grains, spices, stable goods</p>
           </div>
           <div className="relative mb-8">
            <input 
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setPantryList([...pantryList, e.currentTarget.value.trim()]);
                  e.currentTarget.value = '';
                }
              }} 
              placeholder="Add staple..." 
              className="w-full bg-cream/50 dark:bg-forest/30 border-2 border-sand dark:border-forest/50 p-6 rounded-3xl shadow-inner focus:outline-none focus:border-leaf/50 transition-all text-sm font-medium" 
            />
           </div>

           <div className="flex flex-wrap gap-3 min-h-[5rem]">
             {pantryList.map((item, i) => (
               <span key={i} className="bg-leaf/10 text-forest-dark dark:text-cream px-5 py-3 rounded-2xl text-xs font-black border border-leaf/30 flex items-center shadow-sm animate-grow group">
                {item}
                <button onClick={() => setPantryList(pantryList.filter((_, idx) => idx !== i))} className="ml-3 opacity-20 group-hover:opacity-100 transition-opacity">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
               </span>
             ))}
           </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center space-y-8 py-10">
        <button 
          onClick={handleGenerate} 
          disabled={loading || priorityList.length === 0} 
          className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-16 py-8 rounded-[3rem] text-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all disabled:opacity-40"
        >
          {loading ? 'Agent Reasoning...' : 'Sync Kitchen Agent'}
        </button>
        {saveMsg && <p className="text-base font-black text-leaf-dark animate-bounce uppercase tracking-[0.3em]">{saveMsg}</p>}
      </div>

      {/* Plan Display */}
      {result && (
        <div className="space-y-16 animate-grow py-20 border-t-4 border-sand dark:border-forest/20">
          <div className="text-center space-y-4">
            <h3 className="text-6xl font-black text-forest-dark dark:text-cream tracking-tighter uppercase">Waste-Free Roadmap</h3>
            <p className="opacity-40 text-xs font-black uppercase tracking-[0.6em]">2-Day Optimized Cycle</p>
          </div>
          <div className="space-y-24">
            {result.plan.map((day, i) => (
              <div key={i} className="bg-leaf/5 dark:bg-forest/5 p-16 rounded-[5rem] border border-leaf/20 relative group overflow-hidden">
                <div className="mb-16 flex items-center space-x-6">
                  <span className="bg-forest-dark text-white dark:bg-lime dark:text-forest-dark px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-2xl">Day {day.day}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <MealCard meal={day.breakfast} type="Breakfast" playTTS={playTTS} />
                  <MealCard meal={day.lunch} type="Lunch" playTTS={playTTS} />
                  <MealCard meal={day.dinner} type="Dinner" playTTS={playTTS} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Branded Copy */}
      <div className="text-center py-20 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.6em]">ZeroPoint Agentic Architecture v2.4</p>
      </div>
    </div>
  );
};

export default Dashboard;
