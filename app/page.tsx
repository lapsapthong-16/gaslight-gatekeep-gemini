'use client';

import React, { useState, useEffect } from 'react';
import { Send, AlertTriangle, Play } from 'lucide-react';
import { SmartCharacter } from '../components/SmartCharacter';
import { INITIAL_AGENTS } from '../lib/constants';
import { TranscriptLine, Emotion } from '../types';

export default function VisualNovelBoardroom() {
  const [activeLeftAgentId, setActiveLeftAgentId] = useState<string>('cfo');
  const [activeRightAgentId, setActiveRightAgentId] = useState<string>('cpo');
  const [talkingAgentId, setTalkingAgentId] = useState<string | 'player'>('cfo');
  const [inputValue, setInputValue] = useState('');
  
  // State for character emotions
  // Maps agentId -> emotion state
  const [emotions, setEmotions] = useState<Record<string, Emotion>>({
    cfo: 'idle',
    cto: 'idle',
    cpo: 'idle',
  });

  // The "Current Line" to display in the big box
  const [currentLine, setCurrentLine] = useState<TranscriptLine>({
    id: 1, 
    agentId: 'cfo', 
    agentName: 'THE GASLIGHTER', 
    text: "Look at this chart! The red line is NOT going down! That means we fire the interns, right?", 
    timestamp: '09:01 AM' 
  });

  // Simulation Logic
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly pick who talks next between the two active agents
      const speakers = [activeLeftAgentId, activeRightAgentId];
      const nextSpeakerId = speakers[Math.floor(Math.random() * speakers.length)];
      
      setTalkingAgentId(nextSpeakerId);
      
      // Randomly trigger an "Angry" or "Damaged" emotion
      const roll = Math.random();
      let newEmotion: Emotion = 'idle';
      let text = "I'm just circling back on this.";

      const agent = INITIAL_AGENTS.find(a => a.id === nextSpeakerId);

      // Reset everyone to idle first (optional, but keeps it dynamic)
      setEmotions(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = 'idle' });
        return next;
      });

      if (roll > 0.7) {
        newEmotion = 'angry';
        text = "PER MY LAST EMAIL, you are completely wrong!";
      } else if (roll > 0.4) {
        newEmotion = 'idle'; // Will act as 'talking' when speaking
        text = agent?.dialogue || "Synergy.";
      } else {
        newEmotion = 'damaged';
        text = "Wait... are we actually liable for that?";
      }

      setEmotions(prev => ({ ...prev, [nextSpeakerId]: newEmotion }));

      if (agent) {
        handleNewMessage(agent.id, agent.name, text);
      }

      // Occasionally swap the right agent
      if (Math.random() > 0.85) {
         const inactive = INITIAL_AGENTS.find(a => a.id !== activeLeftAgentId && a.id !== activeRightAgentId);
         if (inactive) setActiveRightAgentId(inactive.id);
      }

    }, 5000); // Turn speed
    return () => clearInterval(interval);
  }, [activeLeftAgentId, activeRightAgentId]);

  const handleNewMessage = (id: string, name: string, text: string, isUser = false) => {
    setCurrentLine({
        id: Date.now(),
        agentId: id,
        agentName: name,
        text,
        timestamp: new Date().toLocaleTimeString(),
        isUser
    });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    handleNewMessage('player', 'YOU', inputValue, true);
    setTalkingAgentId('player');
    
    // Everyone feels damaged when the player intervenes
    setEmotions({
        cfo: 'damaged',
        cto: 'damaged',
        cpo: 'damaged'
    });

    setInputValue('');
  };

  const leftAgent = INITIAL_AGENTS.find(a => a.id === activeLeftAgentId)!;
  const rightAgent = INITIAL_AGENTS.find(a => a.id === activeRightAgentId)!;

  const currentAgent = INITIAL_AGENTS.find(a => a.id === currentLine.agentId);
  const nameColor = currentAgent ? currentAgent.color : '#fff';

  // Helper to determine the final state passed to SmartCharacter
  const getAgentState = (agentId: string): Emotion => {
    // Priority 1: Speaking (Talking)
    // Priority 2: Emotion (Angry/Damaged)
    // Priority 3: Idle
    
    const isSpeaking = talkingAgentId === agentId;
    const emotion = emotions[agentId] || 'idle';

    if (isSpeaking) {
        // If speaking, we use talking animation unless they are severely damaged/angry, 
        // but for now, talking takes precedence for liveliness.
        return 'talking';
    }
    
    // Not speaking
    return emotion;
  };

  return (
    <div className="h-screen w-screen bg-black text-slate-200 overflow-hidden flex flex-col relative font-[var(--font-rajdhani)] select-none">
      
      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0">
         {/* Night City Office Background */}
         <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2301&auto=format&fit=crop')` }}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-slate-950/80 mix-blend-multiply" />
      </div>

      {/* --- CENTER HOLOGRAPHIC CHART --- */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-10 w-[400px] md:w-[500px] h-[250px] pointer-events-none">
         <div className="relative w-full h-full border-2 border-cyan-500/30 bg-cyan-950/20 rounded-lg backdrop-blur-sm p-4 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)]">
             {/* Hologram Grid Lines */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px] rounded-lg" />
             
             {/* Header */}
             <div className="flex justify-between w-full mb-4 z-10">
                 <h3 className="text-cyan-400 font-bold tracking-widest text-lg flex items-center gap-2">
                     Q3 REVENUE <span className="text-red-500">(-12%)</span>
                 </h3>
                 <div className="flex items-center gap-1 text-red-500 border border-red-500/50 px-2 py-1 rounded bg-red-950/50 animate-pulse">
                     <AlertTriangle size={16} />
                     <span className="text-xs font-bold uppercase">Risk Alert</span>
                 </div>
             </div>

             {/* The Chart Line */}
             <div className="w-full h-32 relative z-10 flex items-end px-4 pb-2 border-l border-b border-cyan-500/50">
                 <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                     <path 
                        d="M0,10 Q50,5 100,40 T200,80 T300,60 T400,120" 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth="4"
                        filter="drop-shadow(0 0 8px red)"
                     />
                     {/* Area under curve */}
                     <path 
                        d="M0,10 Q50,5 100,40 T200,80 T300,60 T400,120 V150 H0 H0 Z" 
                        fill="url(#gradient)" 
                        opacity="0.3"
                     />
                     <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                     </defs>
                 </svg>
             </div>
             
             {/* Corner Accents */}
             <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
             <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
         </div>
      </div>

      {/* --- CHARACTER STAGE --- */}
      <div className="flex-1 flex items-end justify-between px-0 md:px-10 pb-0 relative z-20 overflow-hidden">
        {/* LEFT AGENT */}
        <div className="w-[45%] h-[85vh] relative flex items-end justify-start -ml-10 md:ml-0">
             <SmartCharacter 
                key={leftAgent.id} 
                assets={leftAgent.images} 
                state={getAgentState(leftAgent.id)}
                alignment="left"
             />
        </div>

        {/* RIGHT AGENT */}
        <div className="w-[45%] h-[85vh] relative flex items-end justify-end -mr-10 md:mr-0">
            <SmartCharacter 
                key={rightAgent.id}
                assets={rightAgent.images} 
                state={getAgentState(rightAgent.id)}
                alignment="right"
             />
        </div>
      </div>

      {/* --- VISUAL NOVEL UI LAYER --- */}
      <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center px-4">
          <div className="max-w-4xl w-full relative">
              
              {/* Speaker Name Tag (Floating above box) */}
              <div 
                className="absolute -top-5 left-6 px-6 py-1 bg-slate-900 border-t border-l border-r border-slate-600 rounded-t-lg z-10 shadow-lg"
              >
                  <span 
                    className="font-bold text-lg uppercase tracking-widest"
                    style={{ color: nameColor, textShadow: `0 0 15px ${nameColor}` }}
                  >
                      {currentLine.agentName} {currentAgent ? `(${currentAgent.role})` : ''}
                  </span>
              </div>

              {/* Main Dialogue Box */}
              <div 
                className="bg-slate-900/80 backdrop-blur-xl border-2 rounded-xl p-6 md:p-8 min-h-[160px] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group"
                style={{ borderColor: nameColor, boxShadow: `0 0 20px ${nameColor}33` }} // 33 is ~20% opacity
              >
                  {/* Text Content */}
                  <p className="text-xl md:text-2xl font-medium leading-relaxed drop-shadow-md text-slate-100 font-[var(--font-inter)]">
                    "{currentLine.text}"
                  </p>

                  {/* Next Arrow Indicator */}
                  <div className="absolute bottom-4 right-6 flex items-center gap-1 animate-pulse cursor-pointer hover:scale-110 transition-transform">
                      <span className="text-sm font-bold tracking-widest uppercase" style={{ color: nameColor }}>NEXT</span>
                      <div className="bg-slate-700 p-1 rounded-full">
                         <Play size={12} fill="currentColor" className="text-white" />
                      </div>
                  </div>

                  {/* Decorative Scanline */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] opacity-20 pointer-events-none" />
              </div>

              {/* Player Input Area (Attached below or floating) */}
              <div className="mt-4 flex gap-2 justify-end opacity-90 hover:opacity-100 transition-opacity">
                 <input 
                    className="bg-black/60 border border-slate-600 rounded px-4 py-2 w-full md:w-1/2 text-white focus:border-emerald-500 focus:outline-none focus:bg-black/80 transition-all font-[var(--font-inter)]"
                    placeholder="Enter response..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 />
                 <button 
                    onClick={handleSendMessage}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded font-bold uppercase tracking-wider flex items-center gap-2"
                 >
                     Send <Send size={16} />
                 </button>
              </div>

          </div>
      </div>

    </div>
  );
}
