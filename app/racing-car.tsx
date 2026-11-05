/**
 * Decorative hero: an original classic die-cast-style hot rod (late-60s custom look: Spectraflame blue,
 * low raked body, big exposed rear wheel, small front wheel, redline tires, tinted bubble canopy, chrome
 * engine stacks and side pipes, hot-rod flames) that races along an orange stunt track, hits a kicker
 * ramp, flies, lands in a shower of sparks and blasts off the page. Pure inline SVG + CSS (see
 * globals.css, "Toy-car stunt hero"); everything is static for prefers-reduced-motion.
 *
 * Geometry contract with globals.css: viewBox 0 0 210 90, tires touch y = 88, rear wheel at x = 44
 * (the .rc-air pivot). The car-spinner reuses CarDefs, CarBody and Wheel.
 */

const HOLES = [0, 72, 144, 216, 288];

/**
 * Gradients shared by the hero and the car spinner. Both SVGs render this same component, so any
 * duplicate ids on a page are identical definitions.
 */
export function CarDefs() {
  return (
    <>
      {/* Spectraflame blue: light #6ec1ff through #1e7bff to deep #06246b */}
      <linearGradient id="rcPaint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6ec1ff" />
        <stop offset="0.3" stopColor="#1e7bff" />
        <stop offset="0.7" stopColor="#0a47c4" />
        <stop offset="1" stopColor="#06246b" />
      </linearGradient>
      <linearGradient id="rcChrome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor="#c3c9d2" />
        <stop offset="0.55" stopColor="#6f7782" />
        <stop offset="1" stopColor="#eef1f5" />
      </linearGradient>
      <linearGradient id="rcGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9fdcff" stopOpacity="0.75" />
        <stop offset="0.45" stopColor="#2a6aa0" stopOpacity="0.62" />
        <stop offset="1" stopColor="#0a1c33" stopOpacity="0.88" />
      </linearGradient>
      <linearGradient id="rcFlame" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#fff36b" />
        <stop offset="0.45" stopColor="#ffb000" />
        <stop offset="1" stopColor="#ff3d00" />
      </linearGradient>
      {/* the red planet on the door: lit from the upper left */}
      <radialGradient id="rcPlanet" cx="0.36" cy="0.32" r="0.78">
        <stop offset="0" stopColor="#ffb07a" />
        <stop offset="0.45" stopColor="#ec5e2a" />
        <stop offset="1" stopColor="#9c2c12" />
      </radialGradient>
      <clipPath id="rcPlanetClip">
        <circle cx="90" cy="55.8" r="7.4" />
      </clipPath>
    </>
  );
}

/** One redline wheel: narrow black tire, thin red stripe, big chrome five-hole mag hub. */
export function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const hub = r * 0.72;
  return (
    <g className="rc-wheel">
      <circle cx={cx} cy={cy} r={r} fill="#0f0f12" />
      <circle cx={cx} cy={cy} r={r - 1.4} fill="none" stroke="#2a2a31" strokeWidth="1.2" strokeDasharray="2.4 2" />
      {/* the red line on the sidewall */}
      <circle cx={cx} cy={cy} r={hub + r * 0.09} fill="none" stroke="#ff2a2a" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={hub} fill="url(#rcChrome)" stroke="#4b525c" strokeWidth="0.9" />
      <circle cx={cx} cy={cy} r={hub * 0.8} fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.7" />
      {HOLES.map((a) => (
        <circle
          key={a}
          cx={cx}
          cy={cy - hub * 0.5}
          r={hub * 0.2}
          fill="#3d434c"
          stroke="#9aa1ab"
          strokeWidth="0.6"
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={hub * 0.26} fill="#eef1f5" stroke="#5b616b" strokeWidth="0.9" />
      <circle cx={cx} cy={cy} r={hub * 0.1} fill="#5b616b" />
      {/* specular glint on the hub (rotates with the wheel, reads as spin) */}
      <path
        d={`M${cx - hub * 0.78} ${cy - hub * 0.3} A${hub * 0.84} ${hub * 0.84} 0 0 1 ${cx - hub * 0.2} ${cy - hub * 0.8}`}
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

/** Body, canopy, chrome engine, flames and Planet door emblem; the wheels are drawn separately on top. */
export function CarBody() {
  return (
    <g>
      {/* chassis pan */}
      <path d="M12 69 L198 69 L194 73 L18 73 Z" fill="#141418" />

      {/* chrome velocity stacks and blower poking up through the hood */}
      <g stroke="#3f454e" strokeWidth="0.9">
        <rect x="132" y="35" width="32" height="10" rx="2" fill="url(#rcChrome)" />
        <rect x="135" y="28" width="26" height="8" rx="1.5" fill="url(#rcChrome)" />
        <path d="M137 29.5 L137 34.5 M141.5 29.5 L141.5 34.5 M146 29.5 L146 34.5 M150.5 29.5 L150.5 34.5 M155 29.5 L155 34.5" stroke="#6f7782" />
        {[137, 143.5, 150, 156.5].map((x) => (
          <g key={x}>
            <path d={`M${x} 28 L${x - 0.6} 18 L${x + 4.6} 18 L${x + 4} 28 Z`} fill="url(#rcChrome)" />
            <ellipse cx={x + 2} cy={18} rx={2.9} ry={1.1} fill="#22252b" />
          </g>
        ))}
      </g>

      {/* main body: tail, flared rear fender, long hood raked down to the nose, wheel arches */}
      <path
        d="M6 63 L6 50 Q6 46.5 10 46.5 L21.6 46.5 A30 30 0 0 1 66.4 46.5 L126 44.5
           Q170 44 194 51 Q205 54.5 205 60 L204.5 65 Q203.5 69 197 69 L179.8 69
           A20 20 0 0 0 140.2 69 L68.8 69 A25 25 0 0 0 19.2 69 L11 69 Q6 69 6 63 Z"
        fill="url(#rcPaint)"
        stroke="#041a52"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Spectraflame shine: crisp specular streak with a dark horizon reflection under it */}
      <path d="M72 49 L126 47.6 Q166 47 190 53" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.95" />
      <path d="M73 52.4 L126 51.2 Q164 50.8 186 56" stroke="#041a52" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M22 44 A27 27 0 0 1 58 40" stroke="#e4f3ff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M9 50 L18 50" stroke="#e4f3ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      {/* lower body reflection */}
      <path d="M74 64 L138 64 M181 64 L201 63" stroke="#06246b" strokeWidth="1.4" fill="none" opacity="0.8" />

      {/* driver seen through the tinted bubble canopy */}
      <path d="M92 45 Q93 33 101 31 L108 31 Q112 33 112 45 Z" fill="#0b1426" opacity="0.8" />
      <circle cx="103" cy="33" r="5.6" fill="#f4f6fa" stroke="#0d0d10" strokeWidth="1" />
      <path d="M97.6 31.6 Q103 30.4 108.4 31.6" stroke="#ff2a2a" strokeWidth="1.6" fill="none" />
      <path d="M103.6 32.8 L108.6 33.2 Q108.6 36 106.6 37 L103.6 36.6 Z" fill="#111" />
      {/* bubble canopy */}
      <path
        d="M70 45.6 C72 31 86 22 101 21.5 C117 21 129 30 132 44.8 Z"
        fill="url(#rcGlass)"
        stroke="#0d0d10"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M70 45.6 L132 45" stroke="#dfe4ea" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M77 39 C80 31 88 26 97 25.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M119 26 Q125 30 128 36" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* hot-rod flames licking back from the nose */}
      <path
        d="M203 59 Q190 52 172 53.5 Q164 51 152 52.5 L160 55.5 Q146 54.5 132 56 L143 58.5 Q126 58.5 114 61
           L131 62.5 Q120 64.5 110 67 Q136 66.5 152 65 L147 67.5 Q172 67 190 65.5 Q201 64 203 59 Z"
        fill="url(#rcFlame)"
        stroke="#9a1a00"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* door emblem: the red planet (the birthday kid is Alex Planet) */}
      <circle cx="90" cy="55.8" r="8.5" fill="#ffd9b8" opacity="0.5" />
      <circle cx="90" cy="55.8" r="7.4" fill="url(#rcPlanet)" />
      <g clipPath="url(#rcPlanetClip)">
        {/* darker surface bands */}
        <path d="M81 54.2 Q85 52 89 53.7 Q93 55.2 99 53 L99 56.6 Q94 58.8 89.6 57.3 Q85.4 55.9 81 57.8 Z" fill="#9a2d12" opacity="0.65" />
        <path d="M82 60.2 Q87 58.8 91 60.4 Q95 61.8 98 60.2 L98 65 L82 65 Z" fill="#8a2410" opacity="0.5" />
        {/* polar ice cap */}
        <ellipse cx="89.2" cy="49.2" rx="3.6" ry="1.7" fill="#fff6ee" />
        {/* craters: a light rim peeking out below a dark pit */}
        {[
          [93.6, 51.6, 1.1],
          [86.4, 59.6, 1],
          [94.4, 58.6, 0.75],
        ].map(([x, y, r]) => (
          <g key={x}>
            <circle cx={x + 0.3} cy={y + 0.3} r={r} fill="#ffb98f" opacity="0.6" />
            <circle cx={x} cy={y} r={r} fill="#8f2a10" />
          </g>
        ))}
      </g>
      {/* soft highlight and thin dark outline */}
      <ellipse cx="86.8" cy="52.6" rx="2.4" ry="1.5" fill="#fff" opacity="0.45" transform="rotate(-30 86.8 52.6)" />
      <circle cx="90" cy="55.8" r="7.4" fill="none" stroke="#3a0d05" strokeWidth="0.9" />

      {/* chrome headers dropping out of the body into a side pipe */}
      <g stroke="#3f454e" strokeWidth="0.8">
        <path d="M128 56 Q132 62 132 66 L128 66 Q128 62 124.5 57 Z" fill="url(#rcChrome)" />
        <path d="M134 56 Q138 62 138 66 L134 66 Q134 62 130.5 57 Z" fill="url(#rcChrome)" />
        <rect x="72" y="64.5" width="68" height="5" rx="2.5" fill="url(#rcChrome)" />
      </g>
      <path d="M80 64.5 L80 69.5 M86 64.5 L86 69.5 M92 64.5 L92 69.5" stroke="#8a919b" strokeWidth="0.9" />

      {/* chrome rear bumper + twin exhaust tips under the tail */}
      <rect x="3" y="54" width="5" height="9" rx="1.5" fill="url(#rcChrome)" stroke="#3f454e" strokeWidth="0.8" />
      <rect x="4.5" y="47.5" width="3.5" height="5" rx="1" fill="#ff4d4d" stroke="#041a52" strokeWidth="0.7" />

      {/* headlight and front bumper */}
      <path d="M196 53 L203.5 56 L204 59.5 L196.5 58 Z" fill="#fffbe0" stroke="#111" strokeWidth="0.8" />
      <rect x="196" y="64" width="9.5" height="3.6" rx="1.5" fill="url(#rcChrome)" stroke="#3f454e" strokeWidth="0.6" />
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
                  <CarDefs />
                  <linearGradient id="rcTrail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#38a3ff" stopOpacity="0" />
                    <stop offset="1" stopColor="#38a3ff" stopOpacity="0.55" />
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

                {/* exhaust fire from the chrome tips at the tail (right edge = tip mouth, x 3) */}
                <path className="rc-fire" d="M3 54.5 L-30 52 L-18 57 L-36 58.5 L-16 61 L-26 65.5 L3 62.5 Z" fill="url(#rcFire)" />

                <g className="rc-body">
                  <CarBody />
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
