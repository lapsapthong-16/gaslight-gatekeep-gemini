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
    name: 'THE BULL',
    role: 'Aggressive / Risk-Lover',
    color: '#10b981', // Emerald 500
    gradient: 'from-emerald-900 to-slate-900',
    images: {
      idle: '/characters/gemini/idle.png',
      talking: '/characters/gemini/talk.png',
      angry: '/characters/gemini/angry.png',
      damaged: '/characters/gemini/idle.png',
    },
    dialogue: "LEVERAGE IS THE ONLY TRUTH!",
  },
  {
    id: 'cto',
    name: 'THE GUARDIAN',
    role: 'Paranoid / Risk-Averse',
    color: '#f97316', // Orange 500
    gradient: 'from-orange-900 to-slate-900',
    images: {
      idle: '/characters/gatekeep/idle.png',
      talking: '/characters/gatekeep/talk.png',
      angry: '/characters/gatekeep/angry.png',
      damaged: '/characters/gatekeep/idle.png',
    },
    dialogue: "We are one vulnerability away from total collapse.",
  },
  {
    id: 'cpo',
    name: 'THE SCOUT',
    role: 'Gen-Z / Trend-Obsessed',
    color: '#f472b6', // Pink 400
    gradient: 'from-pink-900 to-slate-900',
    images: {
      idle: '/characters/gaslight/idle.png',
      talking: '/characters/gaslight/talk.png',
      angry: '/characters/gaslight/angry.png',
      damaged: '/characters/gaslight/idle.png',
    },
    dialogue: "The vibes are actually rancid right now.",
  }
];
