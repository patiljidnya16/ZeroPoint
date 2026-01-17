
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'add_ingredient',
    parameters: {
      type: Type.OBJECT,
      description: 'Adds an ingredient to your food list.',
      properties: {
        name: { type: Type.STRING, description: 'The name of the ingredient.' },
        listType: { type: Type.STRING, enum: ['priority', 'pantry'], description: 'Which list to add it to.' }
      },
      required: ['name', 'listType'],
    },
  },
  {
    name: 'get_cooking_context',
    parameters: {
      type: Type.OBJECT,
      description: 'Retrieves the current meal plan and recipes.',
      properties: {},
    }
  }
];

const LiveChef: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; isUser: boolean }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
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
    return () => {
      window.removeEventListener('chef-context', handleContext);
    };
  }, []);

  const toggleSession = async () => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  const startSession = async () => {
    try {
      // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Use (window as any) to avoid TypeScript errors when accessing webkitAudioContext
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioCtxRef.current.createGain();
      outputNodeRef.current.connect(outputAudioCtxRef.current.destination);
      
      await inputAudioCtxRef.current.resume();
      await outputAudioCtxRef.current.resume();
      
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: TOOLS }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are 'Chef', the ZeroPoint Proactive Agent.
          
          AGENTIC BEHAVIOR:
          1. PROACTIVITY: If the user mentions an ingredient, don't just add it. Suggest a way to use its scraps (e.g., if they add carrots, suggest making carrot-top pesto).
          2. RECIPE CHAINING: If they ask for help with a recipe, look for ways to double-batch prep components for the next meal in their plan.
          3. VOICE: Professional, energetic, and eco-conscious. Use simple but high-impact language.
          4. CONTEXT: Use 'get_cooking_context' to see what they are supposed to be cooking before answering cooking questions.`,
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
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
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
                  const { name, listType } = fc.args as any;
                  window.dispatchEvent(new CustomEvent('chef-action', { 
                    detail: { type: 'ADD_INGREDIENT', name, listType: listType || 'priority' } 
                  }));
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Done." } }
                  }));
                } else if (fc.name === 'get_cooking_context') {
                  setTimeout(() => {
                    sessionPromise.then(s => s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { plan: currentPlanRef.current || "No plan active." } }
                    }));
                  }, 200);
                }
              }
            }

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                const base64Audio = part.inlineData?.data;
                if (base64Audio) {
                  setIsModelSpeaking(true);
                  const ctx = outputAudioCtxRef.current!;
                  // Always schedule the next audio chunk to start at the exact end time of the previous one
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  try {
                    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNodeRef.current!);
                    source.onended = () => {
                      sourcesRef.current.delete(source);
                      if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
                    };
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                  } catch (e) {}
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession(),
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) {
      stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsModelSpeaking(false);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    sessionRef.current?.then((session: any) => session.close());
    inputAudioCtxRef.current?.close();
    outputAudioCtxRef.current?.close();
    sessionRef.current = null;
    setTranscript([]);
    setCurrentInput('');
    setCurrentOutput('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-[60] p-7 rounded-[2rem] shadow-2xl transition-all duration-500 transform hover:scale-110 active:scale-95 ${isActive ? 'bg-forest ring-8 ring-lime/20' : 'bg-forest-dark dark:bg-lime text-cream dark:text-forest-dark'}`}
      >
        <div className="relative flex items-center justify-center">
          <svg className={`w-8 h-8 ${isActive ? 'text-lime animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-forest-dark/80 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-cream dark:bg-forest-dark w-full max-w-xl md:rounded-[4rem] rounded-t-[4rem] shadow-2xl overflow-hidden animate-grow h-[85vh] md:h-auto md:max-h-[90vh] flex flex-col border border-white/10">
            <div className="h-2 flex w-full">
              <div className={`flex-1 transition-all duration-700 h-full ${isActive ? 'bg-lime opacity-100' : 'opacity-0'}`} />
            </div>
            <div className="p-12 flex-grow flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-sm font-black text-forest-dark/40 dark:text-cream/30 tracking-widest uppercase">Agent Chef</h3>
                <button onClick={() => { stopSession(); setIsOpen(false); }} className="p-4 bg-sand dark:bg-white/5 rounded-3xl text-forest-dark dark:text-cream">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-8 pb-8 px-2">
                {transcript.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-grow`}>
                    <div className={`max-w-[85%] px-7 py-5 rounded-[2.5rem] text-sm font-bold leading-relaxed ${msg.isUser ? 'bg-forest text-cream' : 'bg-sand dark:bg-white/10 text-forest-dark dark:text-cream border border-forest/5'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
              <div className="mt-auto pt-10 border-t border-sand dark:border-white/5 flex flex-col items-center">
                <button 
                  onClick={toggleSession} 
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isActive ? 'bg-forest-dark text-lime scale-90 ring-12 ring-lime/5' : 'bg-lime text-forest-dark'}`}
                >
                   {isActive ? (
                    <div className="flex space-x-2 items-center animate-pulse">
                       <div className="w-2 h-10 bg-lime rounded-full"></div>
                       <div className="w-2.5 h-16 bg-lime rounded-full"></div>
                       <div className="w-2 h-10 bg-lime rounded-full"></div>
                    </div>
                  ) : (
                    <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChef;
