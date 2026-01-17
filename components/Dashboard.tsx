
import React, { useState, useEffect, useRef } from 'react';
import { generateWasteFreePlan, analyzeImage, searchRecipes } from '../services/geminiService';
import { Ingredient, PlannerResponse, UsedIngredient, Meal } from '../types';

const Confetti = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10%`,
            backgroundColor: ['#B5E61D', '#A8D5BA', '#4A7C59', '#F4D03F', '#4285F4', '#EA4335'][Math.floor(Math.random() * 6)],
            width: `${Math.random() * 14 + 6}px`,
            height: `${Math.random() * 14 + 6}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${Math.random() * 2.5 + 1.5}s`,
            animationDelay: `${Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
};

const MealCard: React.FC<{ meal: Meal, type?: string }> = ({ meal, type }) => {
  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const persistenceKey = `chefco-progress-${meal.title.replace(/\s+/g, '-').toLowerCase()}`;

  useEffect(() => {
    const savedProgress = localStorage.getItem(persistenceKey);
    if (savedProgress) {
      try {
        setCompletedSteps(JSON.parse(savedProgress));
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }
  }, [persistenceKey]);

  const toggleStep = (index: number) => {
    const isChecking = !completedSteps.includes(index);
    const newSteps = isChecking
      ? [...completedSteps, index]
      : completedSteps.filter(i => i !== index);
    
    setCompletedSteps(newSteps);
    localStorage.setItem(persistenceKey, JSON.stringify(newSteps));

    if (isChecking && newSteps.length === meal.recipe.steps.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);
    }
  };

  const progress = meal.recipe.steps.length > 0 
    ? Math.round((completedSteps.length / meal.recipe.steps.length) * 100) 
    : 0;

  return (
    <div className={`transition-all duration-700 rounded-[3.5rem] p-1 bg-gradient-to-br from-sand to-white dark:from-forest/20 dark:to-forest/5 shadow-xl group relative ${expanded ? 'col-span-full ring-4 ring-leaf/20' : ''}`}>
      {showConfetti && <Confetti />}
      
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[3.4rem] p-8 md:p-10 h-full flex flex-col border border-sand dark:border-forest/20 overflow-hidden">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {type && (
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-leaf-dark mb-2 block opacity-80">
                {type}
              </span>
            )}
            <h5 className="text-3xl md:text-4xl font-bold text-forest-dark dark:text-cream leading-none tracking-tight group-hover:text-forest transition-colors">
              {meal.title}
            </h5>
          </div>
        </div>

        <p className="text-base opacity-50 mb-8 leading-relaxed font-medium max-w-2xl">
          {meal.description}
        </p>

        {/* Tags with Source Indicators */}
        <div className="flex flex-wrap gap-2.5 mb-10">
          {meal.ingredientsUsed.map((ing, i) => (
            <span 
              key={i} 
              title={ing.source === 'priority' ? 'Rescued Item' : 'Pantry Stock'}
              className={`text-[10px] px-5 py-2 rounded-full font-black uppercase tracking-widest border transition-colors flex items-center ${ing.source === 'priority' ? 'bg-spoil/10 border-spoil/20 text-spoil' : 'bg-leaf/10 border-leaf/20 text-forest'}`}
            >
              {ing.source === 'priority' ? (
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              )}
              {ing.name}
            </span>
          ))}
          <span className="text-[10px] px-5 py-2 rounded-full font-black uppercase tracking-widest border bg-forest/5 border-forest/10 text-forest/60 flex items-center">
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {meal.recipe.prepTime}
          </span>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)} 
          className={`w-full py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.5em] transition-all duration-500 flex items-center justify-center space-x-4
            ${expanded ? 'bg-forest-dark text-cream shadow-inner' : 'bg-sand/40 hover:bg-leaf/20 dark:bg-white/5 dark:hover:bg-forest/30 shadow-md'}`}
        >
          <span>{expanded ? 'Hide Recipe' : 'Start Cooking Experience'}</span>
          <svg className={`w-5 h-5 transition-transform duration-700 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-12 space-y-16 animate-grow">
            {/* Sticky Progress Hub */}
            <div className="sticky top-0 z-30 -mx-10 px-10 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl py-8 border-b border-sand dark:border-forest/20">
              <div className="flex justify-between items-end mb-5">
                <div>
                  <h6 className="text-[10px] font-black uppercase tracking-[0.5em] text-forest/40 dark:text-cream/40 mb-2">Current Completion</h6>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-5xl font-black text-forest-dark dark:text-cream tracking-tighter tabular-nums">
                      {progress}%
                    </span>
                    {progress === 100 && (
                      <span className="text-xs font-black uppercase tracking-widest text-lime bg-forest-dark px-3 py-1 rounded-lg animate-bounce">
                        Mastered
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div 
                className="h-6 bg-sand/30 dark:bg-forest/20 rounded-full overflow-hidden p-1.5 border border-sand dark:border-forest/10 shadow-inner"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Recipe Progress"
              >
                <div 
                  className={`h-full rounded-full bg-gradient-to-r from-forest via-leaf to-lime transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(181,230,29,0.4)] ${progress > 0 && progress < 100 ? 'animate-pulse-soft' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Steps List */}
              <div className="lg:col-span-2 space-y-10">
                <div>
                  <h6 className="text-[11px] font-black uppercase tracking-[0.5em] text-leaf-dark mb-8 opacity-60 flex items-center">
                    <span className="w-8 h-px bg-leaf-dark mr-4 opacity-30"></span>
                    The Teaching Path
                  </h6>
                  <div className="space-y-6">
                    {meal.recipe.steps.map((step, i) => {
                      const isCompleted = completedSteps.includes(i);
                      return (
                        <div 
                          key={i}
                          onClick={() => toggleStep(i)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleStep(i)}
                          className={`group flex items-start p-8 rounded-[3rem] cursor-pointer transition-all duration-500 border-2 outline-none focus-visible:ring-4 focus-visible:ring-leaf/40
                            ${isCompleted 
                              ? 'bg-lime/5 border-lime/30 opacity-60 scale-[0.99] translate-x-2' 
                              : 'bg-white dark:bg-forest/5 border-transparent hover:border-sand dark:hover:border-forest/30 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
                          role="checkbox"
                          aria-checked={isCompleted}
                          tabIndex={0}
                        >
                          <div className={`flex-shrink-0 w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 mr-8 shadow-lg
                            ${isCompleted 
                              ? 'bg-lime text-forest-dark rotate-[360deg] scale-110 shadow-lime/20' 
                              : 'bg-sand dark:bg-white/10 text-forest-dark dark:text-cream font-black text-xl'}`}>
                            {isCompleted ? (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (i + 1)}
                          </div>
                          <div className="flex-grow pt-1">
                            <h4 className={`text-xs font-black uppercase tracking-[0.3em] mb-2 transition-opacity ${isCompleted ? 'opacity-30' : 'opacity-60'}`}>
                              Step {i + 1}
                            </h4>
                            <p className={`text-xl font-medium leading-relaxed transition-all duration-500 ${isCompleted ? 'line-through decoration-lime decoration-2 italic opacity-50' : 'text-forest-dark dark:text-cream'}`}>
                              {step}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-12">
                {/* Waste-Free Hacks Section */}
                <div className="bg-lime/10 dark:bg-lime/5 p-10 rounded-[4rem] border-2 border-lime/30 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-20">
                     <svg className="w-16 h-16 text-lime" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 001.038 1.744l6.162 3.423a2 2 0 001.924 0l6.162-3.423A2 2 0 0019 11.268V4a1 1 0 10-2 0v7.268l-6 3.333-6-3.333V4z"/></svg>
                   </div>
                   <h6 className="text-[10px] font-black uppercase tracking-[0.5em] text-forest mb-8 flex items-center">
                     <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     Zero-Waste Hacks
                   </h6>
                   <div className="space-y-6 relative z-10">
                     {meal.wasteFreeHacks?.map((hack, i) => (
                       <div key={i} className="flex items-start space-x-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-lime mt-2 flex-shrink-0"></div>
                         <p className="text-sm font-bold text-forest-dark dark:text-cream leading-relaxed">{hack}</p>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Spices Card */}
                <div className="bg-sand/30 dark:bg-forest/10 p-10 rounded-[4rem] border border-sand dark:border-forest/20 shadow-inner">
                   <h6 className="text-[10px] font-black uppercase tracking-[0.5em] text-leaf-dark mb-10 opacity-70 flex items-center">
                     <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                     Pantry Staples
                   </h6>
                   <div className="grid grid-cols-2 gap-4">
                     {meal.recipe.masalas?.map((m, i) => (
                       <div key={i} className="px-5 py-4 bg-white/60 dark:bg-forest-dark/40 rounded-3xl shadow-sm border border-sand/50 flex flex-col justify-center transition-all hover:scale-105">
                         <span className="text-xs font-black text-forest-dark dark:text-cream leading-tight">{m}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <button 
                  onClick={() => {
                    if (window.confirm("Start this recipe fresh?")) {
                      setCompletedSteps([]);
                      localStorage.removeItem(persistenceKey);
                    }
                  }}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-[0.4em] text-spoil opacity-40 hover:opacity-100 transition-opacity"
                >
                  Reset Instruction Progress
                </button>
              </div>
            </div>
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

  return (
    <div className="max-w-7xl mx-auto space-y-24 pb-48 pt-10">
      <section className="text-center space-y-12 animate-leaf-fade">
        <h2 className="text-6xl md:text-[8rem] font-black text-forest-dark dark:text-cream leading-none tracking-tighter">
          EVERY INGREDIENT<br />
          <span className="text-leaf italic underline decoration-lime/30 decoration-8 underline-offset-[1rem]">DESERVES A SECOND CHANCE.</span>
        </h2>
        <p className="text-2xl opacity-40 max-w-2xl mx-auto font-bold tracking-tight">Zero-waste kitchen teacher for your home. Transform expiring groceries into Michelin-level meals.</p>
        
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="What's in your fridge? (e.g. Wilted spinach and paneer)"
            className="flex-grow bg-white dark:bg-forest/10 border-2 border-sand dark:border-forest/40 px-12 py-8 rounded-[3rem] focus:outline-none focus:border-leaf shadow-inner transition-all text-xl font-medium"
          />
          <button onClick={handleSearch} disabled={loading} className="bg-forest-dark dark:bg-lime dark:text-forest-dark text-cream px-16 py-8 rounded-[3rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all">
            {loading ? 'Consulting...' : 'Teach Me'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="bg-white/50 dark:bg-forest/5 glass p-16 rounded-[4.5rem] border-b-[16px] border-spoil/10 transition-all hover:border-spoil/30">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-4xl font-black tracking-tighter">Save List</h3>
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-black uppercase text-white bg-forest-dark dark:bg-lime dark:text-forest-dark px-8 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl">
              {isLensLoading ? 'Scanning...' : 'Vision Lens'}
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
          {loading ? 'Planning...' : 'Reskue Mission'}
        </button>
      </div>

      {/* Static Scrap Inspiration Section */}
      <section className="bg-sand/20 dark:bg-white/5 rounded-[4rem] p-16 border-2 border-sand/40 dark:border-forest/20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h3 className="text-5xl font-black tracking-tighter mb-4">Scrap Inspiration</h3>
          <p className="text-xl opacity-60 font-medium">Common kitchen items that are often tossed but can be delicious.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { item: "Potato Peels", hack: "Deep fry or bake them with chili powder and salt for the ultimate crispy snack." },
            { item: "Bread Crusts", hack: "Blitz into breadcrumbs or cut into cubes for restaurant-style croutons." },
            { item: "Bread Heels", hack: "Don't discard! They make the best toasted base for savory bruschetta." },
            { item: "Broccoli Stems", hack: "Peel the tough outer skin, slice into coins, and stir-fry for a crunchy texture." },
            { item: "Onion Skins", hack: "Clean well and simmer with other veg scraps to make a dark, rich broth." },
            { item: "Leftover Rice", hack: "Perfect for fried rice! Overnight chill makes it dry enough for that perfect toss." },
            { item: "Coffee Grounds", hack: "Mix with brown sugar and oil for a natural, zero-waste body scrub." }
          ].map((scrap, i) => (
            <div key={i} className="bg-white dark:bg-forest/20 p-8 rounded-[3rem] shadow-sm border border-sand/50 dark:border-forest/30 hover:scale-105 transition-transform duration-500">
              <h4 className="text-xl font-black mb-4 text-leaf-dark uppercase tracking-widest">{scrap.item}</h4>
              <p className="text-base opacity-70 leading-relaxed font-medium">{scrap.hack}</p>
            </div>
          ))}
        </div>
      </section>

      {(result || searchResults.length > 0) && (
        <div className="space-y-24 animate-grow px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-6xl font-black tracking-tighter">{searchResults.length > 0 ? 'Chef Curations' : 'The Reskue Plan'}</h3>
            <div className="h-1 flex-grow mx-12 bg-sand/30 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {searchResults.length > 0 ? (
              searchResults.map((meal, i) => <MealCard key={i} meal={meal} />)
            ) : (
              result?.plan.flatMap((day) => [
                <MealCard key={`${day.day}-b`} meal={day.breakfast} type={`Day ${day.day} • Breakfast`} />,
                <MealCard key={`${day.day}-l`} meal={day.lunch} type={`Day ${day.day} • Lunch`} />,
                <MealCard key={`${day.day}-d`} meal={day.dinner} type={`Day ${day.day} • Dinner`} />
              ])
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
