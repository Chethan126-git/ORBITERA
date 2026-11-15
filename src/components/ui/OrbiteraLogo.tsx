import React from 'react';

export function OrbiteraLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-[#155EEF] to-[#0284C7] text-white shadow-xs ring-1 ring-white/15 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[72%] w-[72%]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Planetary Globe Sphere & Parallels */}
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.92" />
        <ellipse
          cx="12"
          cy="12"
          rx="3.4"
          ry="7.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.72"
        />
        <path d="M4.8 12H19.2" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.72" />
        {/* Tilted Orbital Detection Trajectory */}
        <ellipse
          cx="12"
          cy="12"
          rx="10.4"
          ry="3.6"
          transform="rotate(-24 12 12)"
          stroke="#7DD3FC"
          strokeWidth="1.35"
        />
        {/* Active Orbital Sensor Node */}
        <circle cx="19.6" cy="8.5" r="1.7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.8" />
      </svg>
    </span>
  );
}
