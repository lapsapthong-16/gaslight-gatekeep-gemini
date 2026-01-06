import { ReactNode } from 'react';

export type Emotion = 'idle' | 'talking' | 'angry' | 'damaged';

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  gradient: string; // CSS gradient string
  images: Record<Emotion, string>;
  dialogue: string;
}

export interface TranscriptLine {
  id: number;
  agentId: string; // references Agent.id or 'player'
  agentName: string;
  text: string;
  timestamp: string;
  isUser?: boolean;
}

export interface GameTheme {
  bg: string;
  text: string;
  panel: string;
  accent: string;
  font: string;
}
