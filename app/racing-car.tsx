/**
 * Decorative hero: an original die-cast-style toy hot rod that races along an
 * orange stunt track, hits a kicker ramp, flies, lands in a shower of sparks
 * and blasts off the page. Pure inline SVG + CSS (see globals.css,
 * "Toy-car stunt hero"); everything is static for prefers-reduced-motion.
 */

const SPOKES = [0, 72, 144, 216, 288];

/** One chrome mag wheel with a red-stripe tire. */
export function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rim = r * 0.62;
  return (
    <g className="rc-wheel">
      <circle cx={cx} cy={cy} r={r} fill="#141417" />
      <circle cx={cx} cy={cy} r={r - 1.2} fill="none" stroke="#2c2c33" strokeWidth="1.4" strokeDasharray="2.2 2.2" />
      <circle cx={cx} cy={cy} r={rim + 2.4} fill="none" stroke="#e8242c" strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r={rim} fill="url(#rcChrome)" stroke="#5b616b" strokeWidth="0.8" />
      {SPOKES.map((a) => (
        <path
          key={a}
          d={`M${cx - rim * 0.18} ${cy} L${cx} ${cy - rim * 0.92} L${cx + rim * 0.18} ${cy} Z`}
          fill="#7d838d"
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={rim * 0.32} fill="#e9edf2" stroke="#7d838d" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={rim * 0.12} fill="#e8242c" />
      {/* specular glint on the rim (rotates with the wheel, reads as spin) */}
      <path
        d={`M${cx - rim * 0.7} ${cy - rim * 0.45} A${rim * 0.85} ${rim * 0.85} 0 0 1 ${cx - rim * 0.1} ${cy - rim * 0.84}`}
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </g>
  );
}

const SPARKS = [
  { dx: -46, dy: -26, r: -151 },
  { dx: -64, dy: -12, r: -169 },
  { dx: -36, dy: -40, r: -132 },
  { dx: -78, dy: -4, r: -177 },
  { dx: -26, dy: -30, r: -131 },
  { dx: -56, dy: -30, r: -152 },
  { dx: -20, dy: -46, r: -113 },
  { dx: -88, dy: -14, r: -171 },
  { dx: -40, dy: -10, r: -166 },
  { dx: 12, dy: -30, r: -68 },
];

export default function RacingCar() {
  return (
    <div className="rc-stage" aria-hidden="true">
      <div className="rc-scene">
        {/* far layer: arena glow + drifting bokeh lights */}
        <div className="rc-sky" />
        <div className="rc-bokeh" />
        <svg className="rc-loop" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="58" fill="none" stroke="#7c2d12" strokeWidth="14" />
          <circle cx="70" cy="70" r="58" fill="none" stroke="#c2410c" strokeWidth="9" />
          <circle cx="70" cy="70" r="62" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="20 6" />
          <path d="M60 128 L66 140 M80 128 L74 140" stroke="#1e3a8a" strokeWidth="4" />
        </svg>

        {/* the track, with connector joints and a kicker ramp */}
        <div className="rc-track">
          <div className="rc-track-top" />
          <div className="rc-track-face" />
        </div>
        <svg className="rc-ramp" viewBox="0 0 120 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rcRampTop" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ff8a1a" />
              <stop offset="1" stopColor="#ffb347" />
            </linearGradient>
          </defs>
          {/* support pylons */}
          <path d="M98 14 L106 12 L106 40 L98 40 Z" fill="#2563eb" />
          <path d="M98 14 L100 13.5 L100 40 L98 40 Z" fill="#93c5fd" />
          <path d="M60 30 L66 28 L66 40 L60 40 Z" fill="#2563eb" />
          <rect x="94" y="37" width="16" height="3" rx="1" fill="#1e3a8a" />
          {/* ramp deck: underside, side rail, lit surface */}
          <path d="M0 40 Q64 34 114 4 L118 5 L118 17 Q72 40 14 40 Z" fill="#9a3412" />
          <path d="M0 40 Q64 34 114 4 L118 5 L118 11 Q68 38 6 40 Z" fill="#ea580c" />
          <path d="M0 40 Q64 33.5 114 4 L118 5 Q66 35 4 40 Z" fill="url(#rcRampTop)" />
          <path d="M10 38.6 Q66 32 114.5 5" stroke="#ffe7c2" strokeWidth="1.4" fill="none" />
        </svg>

        <div className="rc-drive">
          {/* contact shadow stays on the ground while the car flies */}
          <div className="rc-shadow" />

          {/* tire smoke kicked up behind the rear wheel */}
          <div className="rc-dust">
            <i /><i /><i /><i />
          </div>

          <div className="rc-air">
            <div className="rc-squash">
              <svg viewBox="0 0 210 90" className="rc-car">
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
                  <linearGradient id="rcTrail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#ff3b30" stopOpacity="0" />
                    <stop offset="1" stopColor="#ff3b30" stopOpacity="0.55" />
                  </linearGradient>
                  <linearGradient id="rcFire" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0" stopColor="#fffbd1" />
                    <stop offset="0.4" stopColor="#ffd000" />
                    <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* motion streak + speed lines trailing the car */}
                <g className="rc-speed">
                  <path d="M-70 40 L20 30 L20 66 L-70 62 Z" fill="url(#rcTrail)" />
                  <g stroke="#fff" strokeLinecap="round">
                    <line x1="-60" y1="34" x2="-16" y2="34" strokeWidth="2.2" opacity="0.9" />
                    <line x1="-86" y1="48" x2="-8" y2="48" strokeWidth="3" />
                    <line x1="-50" y1="60" x2="-12" y2="60" strokeWidth="2" opacity="0.8" />
                    <line x1="-96" y1="72" x2="-40" y2="72" strokeWidth="1.6" opacity="0.6" />
                  </g>
                </g>

                {/* exhaust fire */}
                <path className="rc-fire" d="M10 54 L-26 49 L-14 55 L-34 58 L-12 61 L-24 67 L10 62 Z" fill="url(#rcFire)" />

                <g className="rc-body">
                  {/* rear wing */}
                  <path d="M16 38 L20 26 L25 26 L23 38 Z" fill="#26262c" />
                  <path d="M2 21 Q16 17 36 20 L36 26 Q16 24 4 27 Z" fill="url(#rcPaint)" stroke="#4a0610" strokeWidth="1" />
                  <path d="M5 21.5 Q18 18.5 34 21" stroke="#ffd2c4" strokeWidth="1.2" fill="none" opacity="0.8" />

                  {/* chassis / pan */}
                  <path d="M14 70 L196 70 L192 74 L20 74 Z" fill="#1b1b20" />

                  {/* main body shell with wheel arches */}
                  <path
                    d="M8 64 L6 46 Q7 39 16 38 L64 37 L80 20 Q83 17 88 17 L110 17 Q115 17 118 21 L130 37
                       Q166 38 186 46 Q199 51 201 60 L201 66 Q200 70 194 70 L181 70
                       A21 21 0 0 0 139 70 L71 70 A27 27 0 0 0 17 70 L12 70 Q8 70 8 64 Z"
                    fill="url(#rcPaint)"
                    stroke="#4a0610"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />

                  {/* glossy top highlight */}
                  <path d="M14 40.5 L64 40 M131 39.5 Q168 41 190 50" stroke="#ffd9cf" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
                  <path d="M150 43 Q176 45 192 53" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
                  {/* lower body shading line */}
                  <path d="M10 60 L19 60 M70 58 L140 58 M181 59 L200 59" stroke="#5e0612" strokeWidth="1.2" fill="none" opacity="0.7" />

                  {/* cabin glass */}
                  <path d="M68 37 L82 22 Q84 20 88 20 L109 20 Q112 20 114 23 L125 37 Z" fill="url(#rcGlass)" stroke="#0d0d10" strokeWidth="1.3" />
                  <path d="M97 20 L95 37" stroke="#4a0610" strokeWidth="3" />
                  {/* driver helmet */}
                  <circle cx="106" cy="29" r="6.2" fill="#ffd400" stroke="#0d0d10" strokeWidth="1" />
                  <path d="M106.5 26 L112 26.8 Q112.5 30 110 31.5 L106.5 31 Z" fill="#111" />
                  <path d="M101 27 Q102 24 105 23.5" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                  {/* glass glare */}
                  <path d="M84 33 L92 23 L96 23 L88 33 Z" fill="#fff" opacity="0.35" />
                  <path d="M116 33 L113 29 L115 28 L119 33 Z" fill="#fff" opacity="0.3" />

                  {/* chrome supercharger poking through the hood */}
                  <g>
                    <rect x="137" y="26" width="24" height="13" rx="2" fill="url(#rcChrome)" stroke="#4b525c" strokeWidth="0.9" />
                    <path d="M141 27.5 L141 37.5 M146 27.5 L146 37.5 M151 27.5 L151 37.5 M156 27.5 L156 37.5" stroke="#6f7782" strokeWidth="1" />
                    <path d="M140 26 L141 18 L157 18 L159 26 Z" fill="#202027" stroke="#0d0d10" strokeWidth="0.9" />
                    <rect x="139" y="16" width="20" height="3" rx="1.2" fill="url(#rcChrome)" stroke="#4b525c" strokeWidth="0.7" />
                    <path d="M143 21 L155 21 M143 23.5 L155 23.5" stroke="#55555f" strokeWidth="1" />
                  </g>

                  {/* flame decal licking back from the nose */}
                  <path
                    d="M199 58 Q186 50 168 50 Q160 47 150 49 L158 53 Q146 51 132 53 L142 56 Q124 56 112 59
                       L130 61 Q118 63 108 67 Q136 66 152 64 L146 67 Q170 66 186 64 Q196 63 199 58 Z"
                    fill="url(#rcFlame)"
                    stroke="#c2410c"
                    strokeWidth="0.9"
                    strokeLinejoin="round"
                  />

                  {/* door roundel */}
                  <circle cx="96" cy="51" r="8.5" fill="#fff" stroke="#111" strokeWidth="1.4" />
                  <text x="96" y="55.4" textAnchor="middle" fontSize="12.5" fontWeight="900" fontStyle="italic" fill="#111" fontFamily="Arial, Helvetica, sans-serif">
                    J
                  </text>
                  {/* lightning bolt on rear quarter */}
                  <path d="M54 44 L44 54 L50 54 L42 63 L57 51 L51 51 L58 44 Z" fill="#ffd400" stroke="#111" strokeWidth="0.9" strokeLinejoin="round" />

                  {/* chrome side pipe */}
                  <rect x="74" y="64" width="62" height="5" rx="2.5" fill="url(#rcChrome)" stroke="#4b525c" strokeWidth="0.7" />
                  <path d="M80 64 L80 69 M88 64 L88 69 M96 64 L96 69" stroke="#9aa1ab" strokeWidth="0.8" />

                  {/* headlight, grille, tail light */}
                  <path d="M193 52 L200.5 55 L200.5 59 L193 57.5 Z" fill="#fffbe0" stroke="#111" strokeWidth="0.8" />
                  <rect x="194" y="62" width="8" height="3.5" rx="1.2" fill="url(#rcChrome)" />
                  <rect x="5.5" y="45" width="4" height="8" rx="1.2" fill="#ffb4a8" stroke="#4a0610" strokeWidth="0.8" />
                </g>

                {/* big-rear / small-front stance */}
                <Wheel cx={44} cy={66} r={22} />
                <Wheel cx={160} cy={71} r={17} />
              </svg>
            </div>
          </div>

          {/* landing impact: flash ring + sparks scraping off the chassis */}
          <div className="rc-impact" />
          {/* landing sparks */}
          <div className="rc-sparks">
            {SPARKS.map((s, i) => (
              <i
                key={i}
                style={
                  {
                    "--dx": `${s.dx}px`,
                    "--dy": `${s.dy}px`,
                    "--r": `${s.r}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
