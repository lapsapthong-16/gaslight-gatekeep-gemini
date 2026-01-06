import React from 'react';
import { Agent, GameTheme } from '../types';

export const THEME: GameTheme = {
  bg: "bg-slate-950",
  text: "text-emerald-400",
  panel: "bg-slate-900/80 border border-slate-700",
  accent: "border-emerald-500",
  font: "font-sans", 
};

// Using placehold.co to simulate the "Art Assets" until real images are provided.
// In a real app, these would be local paths like "/assets/cfo_attack.png"
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
      talking: '/characters/gemini/talking.png',
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
      idle: getAvatar('CTO\n(Idle)', '7c2d12', 'fb923c'),
      talking: getAvatar('CTO\n(Explaining)', '9a3412', 'fdba74'),
      angry: getAvatar('CTO\n(REJECTING PR)', '7c2d12', 'ffffff'),
      damaged: getAvatar('CTO\n(Server Down)', '431407', 'fb923c'),
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
      idle: getAvatar('CTO\n(Idle)', '7c2d12', 'fb923c'),
      talking: getAvatar('CTO\n(Explaining)', '9a3412', 'fdba74'),
      angry: getAvatar('CTO\n(REJECTING PR)', '7c2d12', 'ffffff'),
      damaged: getAvatar('CTO\n(Server Down)', '431407', 'fb923c'),
    },
    dialogue: "I've analyzed the trajectory. It is... suboptimal.",
  }
];
