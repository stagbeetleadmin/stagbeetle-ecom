import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  lightMode?: boolean;
}

export default function Logo({ className = "h-8 w-auto", showText = false, lightMode = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${lightMode ? 'text-on-surface' : 'text-on-surface'}`}>
      {/* High-Definition SVG Stag Beetle Logo adapted from user request */}
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          {/* Gold Gradient */}
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F3E5AB" />
            <stop offset="100%" stopColor="#AA7C11" />
          </linearGradient>
        </defs>

        {/* Outer Circle Ring */}
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
        <circle cx="50" cy="50" r="43" stroke="#C5A059" strokeWidth="0.5" strokeOpacity="0.4" />

        <g transform="translate(10, 8) scale(0.8)">
          {/* Antennas / Horns (Mandibles) */}
          <path 
            d="M 37 32 C 34 22, 40 10, 48 8 C 45 13, 44 20, 47 25" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 63 32 C 66 22, 60 10, 52 8 C 55 13, 56 20, 53 25" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Inner Horn Spikes */}
          <path d="M 43 14 Q 40 18 45 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M 57 14 Q 60 18 55 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          {/* Head */}
          <path 
            d="M 45 27 L 55 27 L 57 33 L 43 33 Z" 
            fill="url(#gold-grad)" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinejoin="round" 
          />

          {/* Eyes */}
          <circle cx="42" cy="30" r="1.2" fill="currentColor" />
          <circle cx="58" cy="30" r="1.2" fill="currentColor" />

          {/* Thorax (Middle Segment) */}
          <path 
            d="M 41 36 L 59 36 L 61 46 L 39 46 Z" 
            fill="url(#gold-grad)" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinejoin="round" 
          />

          {/* Abdomen / Wings (Body) */}
          <path 
            d="M 39 49 C 39 49, 39 72, 50 78 C 61 72, 61 49, 61 49 Z" 
            fill="url(#gold-grad)" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinejoin="round" 
          />
          
          {/* Center line dividing wings */}
          <line x1="50" y1="49" x2="50" y2="77.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          {/* Legs (Symmetric line segments) */}
          {/* Top Legs */}
          <path d="M 38 40 L 29 35 L 29 27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 62 40 L 71 35 L 71 27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Middle Legs */}
          <path d="M 38 45 L 27 48 L 25 56" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 62 45 L 73 48 L 75 56" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Back Legs */}
          <path d="M 42 60 L 31 66 L 32 76" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 58 60 L 69 66 L 68 76" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {showText && (
        <span className="font-label-caps text-label-caps tracking-[0.25em] font-semibold text-on-surface">
          STAG BEETLE
        </span>
      )}
    </div>
  );
}
