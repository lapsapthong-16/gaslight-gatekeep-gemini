'use client';

import React, { useState, useEffect } from 'react';
import {
  Send, AlertTriangle, Play, Pause, Square,
  FileText, X, History, Settings, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartCharacter } from '../components/SmartCharacter';
import { INITIAL_AGENTS } from '../lib/constants';
import { TranscriptLine, Emotion } from '../types';

// --- HUD Components ---

const TranscriptSidebar = ({ isOpen, transcript, onClose }: { isOpen: boolean, transcript: TranscriptLine[], onClose: () => void }) => (
  <motion.div
    initial={{ x: -350 }}
    animate={{ x: isOpen ? 0 : -350 }}
    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    className="fixed top-0 left-0 h-full w-[350px] bg-black/60 backdrop-blur-2xl border-r border-white/10 z-[100] flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.5)]"
  >
    {/* Header */}
    <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-white/5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
          <History size={18} />
        </div>
        <span className="font-sans font-bold text-sm tracking-widest text-white/90">MEETING LOGS</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white cursor-pointer">
          <X size={18} />
        </button>
        <button
          onClick={() => {
            if (confirm("Clear meeting logs?")) {
              (window as any).clearLogs?.();
            }
          }}
          className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-white/30 hover:text-red-400 cursor-pointer"
          title="Clear History"
        >
          <History size={16} />
        </button>
      </div>
    </div>

    {/* Chat Feed */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {transcript.map((entry, i) => {
        const color = entry.agentColor || '#34d399';

        return (
          <div
            key={i}
            className="relative p-4 rounded-xl border bg-white/[0.03] border-white/10"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            {/* Tiny Role Tag */}
            <div
              className="absolute -top-3 left-4 px-2 py-0.5 bg-slate-900 border border-white/10 text-[10px] font-bold uppercase tracking-wider rounded"
              style={{ color }}
            >
              {entry.agentRole || 'SYSTEM'}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-mono mt-1 opacity-90">
              {entry.text}
            </p>
          </div>
        );
      })}
    </div>
  </motion.div>
);

// UploadModal removed

interface ControlBarProps {
  isPlaying: boolean;
  isDebating: boolean;
  lastDigest: any;
  onTogglePlay: () => void;
  onStop: () => void;
}

// ControlBar removed

export default function VisualNovelBoardroom() {
  const [activeLeftAgentId, setActiveLeftAgentId] = useState<string>('cfo');
  const [activeRightAgentId, setActiveRightAgentId] = useState<string>('cpo');
  const [talkingAgentId, setTalkingAgentId] = useState<string | 'player' | null>(null);
  const [inputValue, setInputValue] = useState('');

  // HUD States
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptLine[]>([]);
  const stopDebateRef = React.useRef(false);

  // State for character emotions
  // Maps agentId -> emotion state
  const [emotions, setEmotions] = useState<Record<string, Emotion>>({
    cfo: 'idle',
    cto: 'idle',
    cpo: 'idle',
  });

  // Attach clearLogs for the sidebar button to find
  useEffect(() => {
    (window as any).clearLogs = () => {
      setTranscriptHistory([]);
      localStorage.removeItem('debate_transcript');
    };
  }, []);

  // Persistence Layer
  useEffect(() => {
    const saved = localStorage.getItem('debate_transcript');
    if (saved) {
      try {
        setTranscriptHistory(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (transcriptHistory.length > 0) {
      localStorage.setItem('debate_transcript', JSON.stringify(transcriptHistory));
    }
  }, [transcriptHistory]);


  // The "Current Line" to display in the big box
  const [currentLine, setCurrentLine] = useState<TranscriptLine>({
    id: 1,
    agentId: 'system',
    agentName: 'SYSTEM',
    text: "Boardroom standby. Enter a topic below to initiate the simulation...",
    timestamp: new Date().toLocaleTimeString()
  });

  // Typewriter Effect State
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Sequencer State
  const [conversationQueue, setConversationQueue] = useState<any[]>([]);
  const [isDebating, setIsDebating] = useState(false);

  const runDebate = async (topic: string) => {
    setIsDebating(true);
    stopDebateRef.current = false;

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });

      const data = await response.json();
      if (data.success && data.transcript) {
        setConversationQueue(data.transcript);
      }
    } catch (error) {
      console.error("Debate failure:", error);
    } finally {
      setIsDebating(false);
    }
  };

  // The Sequencer Effect
  useEffect(() => {
    if (conversationQueue.length === 0 || stopDebateRef.current || isTyping) return;

    const showNextLine = async () => {
      const [nextLine, ...remaining] = conversationQueue;
      
      // Map speaker names to IDs
      const agentMap: Record<string, string> = {
        "The Bull": "cfo",
        "The Guardian": "cto",
        "The Scout": "cpo"
      };
      const agentId = agentMap[nextLine.speaker] || "cfo";
      const agent = INITIAL_AGENTS.find(a => a.id === agentId);

      setTalkingAgentId(agentId);
      setEmotions(prev => ({ ...prev, [agentId]: nextLine.emotion || 'talking' }));

      // Auto-swap characters onto the stage if the speaker is hidden
      if (agentId !== activeLeftAgentId && agentId !== activeRightAgentId) {
        // If we need to bring someone on, replace the one that ISN'T currentLine.agentId 
        // (the previous speaker) to keep the "back and forth" feel
        if (activeLeftAgentId === currentLine.agentId) {
          setActiveRightAgentId(agentId);
        } else {
          setActiveLeftAgentId(agentId);
        }
      }
      
      const newLine: TranscriptLine = {
        id: Date.now(),
        agentId: agentId,
        agentName: nextLine.speaker,
        agentRole: agent?.role || '',
        agentColor: agent?.color || '#fff',
        text: nextLine.message,
        timestamp: new Date().toLocaleTimeString(),
      };

      setCurrentLine(newLine);
      setTranscriptHistory(prev => [newLine, ...prev].slice(0, 50));
      setConversationQueue(remaining);
    };

    const timer = setTimeout(showNextLine, 1800); // 1.8s pause for "thinking" and "reacting"
    return () => clearTimeout(timer);
  }, [conversationQueue, isTyping]);

  // Typewriter Effect
  useEffect(() => {
    if (!currentLine.text) return;
    
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const fullText = currentLine.text;
    
    const interval = setInterval(() => {
      setDisplayedText(fullText.substring(0, i + 1));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30); // 30ms per char as per spec

    return () => clearInterval(interval);
  }, [currentLine]);

  // Simulation Logic removed

  const handleNewMessage = (id: string, name: string, text: string, isUser = false) => {
    const agent = INITIAL_AGENTS.find(a => a.id === id);
    const newLine: TranscriptLine = {
      id: Date.now(),
      agentId: id,
      agentName: name,
      agentRole: agent?.role || (isUser ? 'YOU' : ''),
      agentColor: agent?.color || (isUser ? '#10b981' : '#fff'),
      text,
      timestamp: new Date().toLocaleTimeString(),
      isUser
    };
    setCurrentLine(newLine);
    setTranscriptHistory(prev => [newLine, ...prev].slice(0, 50));
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isDebating) return;
    
    const topic = inputValue;
    handleNewMessage('system', 'SYSTEM', `Initializing simulation for: "${topic}"`, false);
    setTalkingAgentId(null); 

    // Start the debate with the topic
    runDebate(topic);

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

      {/* --- HUD OVERLAYS --- */}
      <TranscriptSidebar
        isOpen={showTranscript}
        transcript={transcriptHistory}
        onClose={() => setShowTranscript(false)}
      />
      {/* UploadModal removed */}

      {/* Top Left: Transcript Toggle removed */}

      {/* Top Right: Meeting Controls removed */}

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
        <div 
          className="w-[45%] h-[85vh] relative flex items-end justify-start -ml-10 md:ml-0 transition-all duration-500"
          style={{ 
            filter: talkingAgentId === leftAgent.id ? `drop-shadow(0 0 20px ${leftAgent.color}88)` : 'none'
          }}
        >
          <SmartCharacter
            key={leftAgent.id}
            assets={leftAgent.images}
            state={getAgentState(leftAgent.id)}
            alignment="left"
          />
        </div>

        {/* RIGHT AGENT */}
        <div 
          className="w-[45%] h-[85vh] relative flex items-end justify-end -mr-10 md:mr-0 transition-all duration-500"
          style={{ 
            filter: talkingAgentId === rightAgent.id ? `drop-shadow(0 0 20px ${rightAgent.color}88)` : 'none'
          }}
        >
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
              "{displayedText}"{isTyping && <span className="animate-pulse">|</span>}
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
          <div className="mt-4 flex gap-4 items-stretch mb-8 px-4 relative z-50">
            {/* Briefcase icon removed, we only use input now */}

            {/* Main Input Bar (Capsule) */}
            <div className="flex-1 h-14 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-2 shadow-2xl focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-all">

              {/* Mic Icon */}
              <div className="w-10 h-10 flex items-center justify-center rounded-xl text-white/20 hover:text-white/80 cursor-pointer transition-colors">
                <Mic size={20} />
              </div>

              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-white px-2 font-mono text-sm placeholder:text-white/20 h-full"
                placeholder="Interrupt the board..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />

              {/* Send Button (Pill) */}
              <button
                onClick={handleSendMessage}
                className="h-10 pl-4 pr-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 cursor-pointer"
              >
                Send <Send size={14} />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
