import React from 'react';
import { Agent, GameTheme } from '../types';

export const THEME: GameTheme = {
  bg: "bg-slate-950",
  text: "text-emerald-400",
  panel: "bg-slate-900/80 border border-slate-700",
  accent: "border-emerald-500",
  font: "font-sans", 
};

const getAvatar = (text: string, bg: string, color: string) => 
  `https://placehold.co/400x600/${bg}/${color}.png?text=${encodeURIComponent(text)}&font=rajdhani`;

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'cfo',
    name: 'THE GEMINI',
    role: 'CFO',
    color: '#34d399', // Emerald 400
    gradient: 'from-emerald-900 to-slate-900',
    images: {
      idle: '/characters/gemini/idle.png',
      talking: '/characters/gemini/talk.png',
      angry: '/characters/gemini/angry.png',
      damaged: '/characters/gemini/idle.png',
    },
    dialogue: "Those numbers aren't real if we don't look at them.",
  },
  {
    id: 'cto',
    name: 'THE GATEKEEPER',
    role: 'CTO',
    color: '#fb923c', // Orange 400
    gradient: 'from-orange-900 to-slate-900',
    images: {
      idle: '/characters/gatekeep/idle.png',
      talking: '/characters/gatekeep/talk.png',
      angry: '/characters/gatekeep/angry.png',
      damaged: '/characters/gatekeep/idle.png',
    },
    dialogue: "We can't ship that. The tech debt would kill us.",
  },
  {
    id: 'cpo',
    name: 'THE GASLIGHTER',
    role: 'CPO',
    color: '#e879f9', // Fuchsia 400
    gradient: 'from-fuchsia-900 to-slate-900',
    images: {
      idle: '/characters/gaslight/idle.png',
      talking: '/characters/gaslight/talk.png',
      angry: '/characters/gaslight/angry.png',
      damaged: '/characters/gaslight/idle.png',
    },
    dialogue: "I've analyzed the trajectory. It is... suboptimal.",
  }
];
