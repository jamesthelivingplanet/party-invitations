import { Wheel } from "./racing-car";

/**
 * Small racing-car loading spinner, drawn from the home-screen car (see racing-car.tsx): same paint,
 * chrome mag wheels and flame decal. The wheels spin and the car bobs over a moving road; all of it
 * stands still under prefers-reduced-motion (see globals.css, "Car spinner").
 */
export default function CarSpinner({ label = "Loading", size = 96 }: { label?: string; size?: number }) {
  return (
    <div role="status" aria-live="polite" className="car-spinner inline-flex flex-col items-center gap-1">
      <svg viewBox="0 0 210 100" width={size} height={(size * 100) / 210} aria-hidden="true">
        <defs>
          <linearGradient id="rcPaint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6b4a" />
            <stop offset="0.35" stopColor="#f0182b" />
            <stop offset="0.75" stopColor="#a50d1e" />
            <stop offset="1" stopColor="#5e0612" />
          </linearGradient>
          <linearGradient id="rcChrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#c3c9d2" />
            <stop offset="0.55" stopColor="#6f7782" />
            <stop offset="1" stopColor="#eef1f5" />
          </linearGradient>
          <linearGradient id="rcGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7fd3ff" />
            <stop offset="0.5" stopColor="#1f5f8f" />
            <stop offset="1" stopColor="#0b2236" />
          </linearGradient>
          <linearGradient id="rcFlame" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#fff36b" />
            <stop offset="0.55" stopColor="#ffb000" />
            <stop offset="1" stopColor="#ff6a00" />
          </linearGradient>
        </defs>
        <g className="car-spinner-road" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 18">
          <line x1="-30" y1="94" x2="250" y2="94" />
        </g>
        <g className="car-spinner-body">
          <path d="M16 38 L20 26 L25 26 L23 38 Z" fill="#26262c" />
          <path d="M2 21 Q16 17 36 20 L36 26 Q16 24 4 27 Z" fill="url(#rcPaint)" stroke="#4a0610" strokeWidth="1" />
          <path d="M14 70 L196 70 L192 74 L20 74 Z" fill="#1b1b20" />
          <path
            d="M8 64 L6 46 Q7 39 16 38 L64 37 L80 20 Q83 17 88 17 L110 17 Q115 17 118 21 L130 37
               Q166 38 186 46 Q199 51 201 60 L201 66 Q200 70 194 70 L181 70
               A21 21 0 0 0 139 70 L71 70 A27 27 0 0 0 17 70 L12 70 Q8 70 8 64 Z"
            fill="url(#rcPaint)"
            stroke="#4a0610"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M68 37 L82 22 Q84 20 88 20 L109 20 Q112 20 114 23 L125 37 Z" fill="url(#rcGlass)" stroke="#0d0d10" strokeWidth="1.3" />
          <circle cx="106" cy="29" r="6.2" fill="#ffd400" stroke="#0d0d10" strokeWidth="1" />
          <path
            d="M199 58 Q186 50 168 50 Q160 47 150 49 L158 53 Q146 51 132 53 L142 56 Q124 56 112 59
               L130 61 Q118 63 108 67 Q136 66 152 64 L146 67 Q170 66 186 64 Q196 63 199 58 Z"
            fill="url(#rcFlame)"
            stroke="#c2410c"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <circle cx="96" cy="51" r="8.5" fill="#fff" stroke="#111" strokeWidth="1.4" />
          <text x="96" y="55.4" textAnchor="middle" fontSize="12.5" fontWeight="900" fontStyle="italic" fill="#111" fontFamily="Arial, Helvetica, sans-serif">
            J
          </text>
          <path d="M193 52 L200.5 55 L200.5 59 L193 57.5 Z" fill="#fffbe0" stroke="#111" strokeWidth="0.8" />
          <Wheel cx={44} cy={66} r={22} />
          <Wheel cx={160} cy={71} r={17} />
        </g>
      </svg>
      <span className="text-sm font-medium text-zinc-500">{label}</span>
    </div>
  );
}
