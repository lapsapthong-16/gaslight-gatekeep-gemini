import React, { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Emotion } from '../types';

// Define the animation "Personalities"
const ANIMATIONS: Variants = {
  idle: {
    y: [0, -5, 0],
    scale: 1,
    filter: "brightness(1)",
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  },
  talking: {
    y: [0, -10, 0],
    scale: 1.02,
    filter: "brightness(1.1)",
    transition: { duration: 0.4, repeat: Infinity, ease: "easeOut" }
  },
  angry: {
    x: [-2, 2, -2, 2, 0],
    y: 0,
    scale: 1.1, // Zoom in slightly for intimidation
    filter: "brightness(1.2) contrast(1.2) sepia(0.2)", // Red/Angry tint
    transition: { duration: 0.2, repeat: Infinity } // Vibrate
  },
  damaged: {
    x: [0, 5, -5, 5, 0],
    y: [0, 5, 0],
    rotate: [0, -2, 2, 0],
    filter: "brightness(0.8) sepia(0.4)",
    transition: { duration: 0.5, repeat: Infinity }
  }
};

interface CharacterProps {
  assets: Record<Emotion, string>;
  state: Emotion;
  alignment: 'left' | 'right';
}

export const SmartCharacter: React.FC<CharacterProps> = ({ assets, state, alignment }) => {
  // 1. Image Preloader (Prevents flashing white when swapping PNGs)
  useEffect(() => {
    Object.values(assets).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [assets]);

  // Determine which image to show
  const currentSrc = assets[state] || assets.idle;

  return (
    <div className={`
        relative h-full w-full flex flex-col justify-end pointer-events-none
        ${alignment === 'right' ? 'items-end' : 'items-start'}
    `}>
      <motion.img
        key={state} // This forces a re-render of animation when state changes
        src={currentSrc}
        alt="Character"
        className="w-auto h-[90%] max-w-none object-contain drop-shadow-2xl"
        
        // Apply the animation variants defined above
        variants={ANIMATIONS}
        initial="idle"
        animate={state}
        
        // Add a "Squish" effect when they appear or change state
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        
        // Note: Flipping via scaleX(-1) would mirror text in placeholder images, so we omit it for now.
        // In a real app with sprites, you might use: style={alignment === 'right' ? { transform: "scaleX(-1)" } : {}} 
      />
      
      {/* Optional: Floor Shadow to ground the character */}
      <div className="absolute bottom-0 w-48 h-6 bg-black/40 blur-xl rounded-[100%] z-[-1] translate-y-2" />
    </div>
  );
};

export default SmartCharacter;
