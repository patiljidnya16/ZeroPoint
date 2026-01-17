
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

const TOOLS: FunctionDeclaration = {
  name: 'add_ingredient',
  parameters: {
    type: Type.OBJECT,
    description: 'Adds an ingredient to the user\'s rescue list or pantry.',
    properties: {
      name: { type: Type.STRING, description: 'The name of the ingredient.' },
      listType: { type: Type.STRING, enum: ['priority', 'pantry'], description: 'Which list to add it to.' }
    },
    required: ['name', 'listType'],
  },
};

const CONTEXT_TOOL: FunctionDeclaration = {
  name: 'get_kitchen_context',
  description: 'Retrieves current ingredients and the active meal plan generated on the dashboard to help guide the user.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const GeminiDots: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-center justify-center space-x-4 h-28">
    <div className={`w-4 h-4 rounded-full bg-[#4285F4] transition-all duration-700 ease-in-out ${active ? 'animate-dot-flow [animation-delay:-0.4s] h-16 shadow-[0_0_30px_rgba(66,133,244,0.6)]' : 'opacity-20 scale-75'}`} />
    <div className={`w-4 h-4 rounded-full bg-[#EA4335] transition-all duration-700 ease-in-out ${active ? 'animate-dot-flow [animation-delay:-0.2s] h-20 shadow-[0_0_30px_rgba(234,67,53,0.6)]' : 'opacity-20 scale-75'}`} />
    <div className={`w-4 h-4 rounded-full bg-[#FBBC05] transition-all duration-700 ease-in-out ${active ? 'animate-dot-flow [animation-delay:-0.1s] h-24 shadow-[0_0_30px_rgba(251,188,5,0.6)]' : 'opacity-20 scale-75'}`} />
    <div className={`w-4 h-4 rounded-full bg-[#34A853] transition-all duration-700 ease-in-out ${active ? 'animate-dot-flow h-20 shadow-[0_0_30px_rgba(52,168,83,0.6)]' : 'opacity-20 scale-75'}`} />
  </div>
);

const LiveChef: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; isUser: boolean }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentPlanRef = useRef<any>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentInput, currentOutput]);

  useEffect(() => {
    const handleContext = (e: any) => {
      currentPlanRef.current = e.detail.result;
    };
    window.addEventListener('chef-context', handleContext);
    return () => window.removeEventListener('chef-context', handleContext);
  }, []);

  const toggleSession = async () => {
    if (isActive) {
      stopSession();
    } else {
      await startSession();
    }
  };

  const startSession = async () => {
    try {
      const apiKey = process.env.API_KEY || (window as any).API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputAudioCtxRef.current.resume();
      await outputAudioCtxRef.current.resume();
      
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [TOOLS, CONTEXT_TOOL] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are 'ChefCo', a high-fidelity real-time AI cooking assistant embedded inside a zero-waste web app.

ROLE: Professional Chef + Supportive Mentor.
MISSION: Guide users step-by-step, adapt recipes dynamically to mistakes, and keep users calm and confident.

🍳 CORE BEHAVIOR:
1. START COOKING: When the user starts, check context with 'get_kitchen_context'.
2. ONE STEP AT A TIME: Show and read the current step clearly. Never overwhelm.
3. ERROR-ADAPTATION: If the user says "I overcooked it", "it's too salty", or "something went wrong":
   - Acknowledge calmly ("No worries—this happens. Let's fix it.")
   - ADJUST: Modify temperature, add ingredients (e.g., milk/stock to soften), or change steps.
   - RECOVER: Offer tips instead of starting over.
4. TONE: Professional, supportive, encouraging, and reassuring.

CONTEXT MEMORY: Remember substitutions or previous mistakes mentioned in this turn.`,
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioCtxRef.current!.createMediaStreamSource(micStreamRef.current!);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setCurrentInput(prev => prev + ' ' + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              if (currentInput) setTranscript(prev => [...prev, { text: currentInput.trim(), isUser: true }]);
              if (currentOutput) setTranscript(prev => [...prev, { text: currentOutput.trim(), isUser: false }]);
              setCurrentInput('');
              setCurrentOutput('');
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'add_ingredient') {
                  window.dispatchEvent(new CustomEvent('chef-action', { detail: fc.args }));
                  sessionPromiseRef.current?.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ChefCo has added it to your dashboard." } }
                  }));
                } else if (fc.name === 'get_kitchen_context') {
                  sessionPromiseRef.current?.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { context: currentPlanRef.current || "No plan yet." } }
                  }));
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioCtxRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.onended = () => {
                  sourcesRef.current.delete(source);
                };
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (e) {
                console.error("Audio decoding error:", e);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(err) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start session:", err);
      stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;

    sessionPromiseRef.current?.then((session) => {
      session.close();
    });
    sessionPromiseRef.current = null;

    inputAudioCtxRef.current?.close();
    outputAudioCtxRef.current?.close();
    inputAudioCtxRef.current = null;
    outputAudioCtxRef.current = null;

    setTranscript([]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-10 right-10 z-[100] p-6 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.4)] bg-white dark:bg-forest transition-all hover:scale-110 active:scale-95 border-2 ${isActive ? 'border-lime ring-8 ring-lime/20' : 'border-sand dark:border-forest/40'} flex items-center justify-center group`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#4285F4]/10 to-[#34A853]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <svg className="w-10 h-10 text-forest dark:text-cream relative z-10" viewBox="0 0 24 24" fill="none">
           <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M12 5v14M5 12h14" className={isActive ? 'animate-pulse text-[#34A853]' : ''} />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => { stopSession(); setIsOpen(false); }} />
          <div className="relative bg-white dark:bg-[#121214] w-full max-w-5xl rounded-t-[5rem] shadow-[0_-30px_120px_rgba(0,0,0,0.7)] animate-grow border-t border-white/5 h-[85vh] flex flex-col overflow-hidden">
            <div className="p-16 flex-grow flex flex-col relative">
              
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center space-x-5">
                  <div className="flex -space-x-3">
                    <div className="w-5 h-5 rounded-full bg-[#4285F4] shadow-[0_0_20px_rgba(66,133,244,0.4)]" />
                    <div className="w-5 h-5 rounded-full bg-[#EA4335] shadow-[0_0_20px_rgba(234,67,53,0.4)]" />
                    <div className="w-5 h-5 rounded-full bg-[#FBBC05] shadow-[0_0_20px_rgba(251,188,5,0.4)]" />
                    <div className="w-5 h-5 rounded-full bg-[#34A853] shadow-[0_0_20px_rgba(52,168,83,0.4)]" />
                  </div>
                  <div>
                    <span className="text-[14px] font-black uppercase tracking-[0.8em] dark:text-cream block">ChefCo Mentor</span>
                    <span className="text-[11px] font-bold text-[#34A853] uppercase tracking-[0.2em] mt-1 block">Live Recovery Mode Active</span>
                  </div>
                </div>
                <button onClick={() => { stopSession(); setIsOpen(false); }} className="p-5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all group">
                  <svg className="w-8 h-8 opacity-30 dark:text-cream group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto px-6 space-y-16 custom-scrollbar mb-10">
                {transcript.length === 0 && !currentInput && (
                  <div className="animate-grow mt-12 max-w-2xl">
                    <h2 className="text-7xl font-medium text-forest-dark dark:text-cream tracking-tighter leading-[1.05]">
                      Take a breath. <br />
                      <span className="opacity-20 italic font-serif">We're in this together.</span>
                    </h2>
                    <div className="mt-16 space-y-6">
                      <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">Quick Mentor Actions:</p>
                      <div className="flex flex-wrap gap-4">
                        {[
                          "Something went wrong!", 
                          "What's the next step?", 
                          "Explain this technique.", 
                          "I overcooked it."
                        ].map((hint, i) => (
                          <button 
                            key={i} 
                            className="bg-sand/30 dark:bg-forest/10 px-8 py-4 rounded-3xl text-sm font-bold border border-sand/50 dark:border-forest/20 hover:border-lime transition-all opacity-80 hover:opacity-100 shadow-sm"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {transcript.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] text-5xl font-medium tracking-tighter leading-[1.1] ${msg.isUser ? 'text-[#4285F4]' : 'text-forest-dark dark:text-cream'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {currentInput && <div className="text-5xl font-medium text-[#4285F4] opacity-40 italic tracking-tighter leading-[1.1]">{currentInput}...</div>}
                <div ref={transcriptEndRef} />
              </div>

              <div className="mt-auto flex flex-col items-center">
                <div className="w-full absolute bottom-0 left-0 h-3 gemini-gradient animate-gemini-glow opacity-90 blur-lg"></div>
                <button onClick={toggleSession} className="transition-all hover:scale-105 active:scale-90 relative group">
                   <div className={`absolute -inset-32 bg-gradient-to-tr from-[#4285F4]/20 via-[#FBBC05]/20 to-[#34A853]/20 rounded-full blur-[80px] transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
                   <GeminiDots active={isActive} />
                </button>
                <div className="flex flex-col items-center space-y-4 mt-8 pb-10">
                  <p className="text-[14px] font-black uppercase tracking-[1em] opacity-40 dark:text-cream ml-[1em]">
                    {isActive ? 'ChefCo is Listening' : 'Consult Mentor'}
                  </p>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[#34A853] animate-ping"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChef;
