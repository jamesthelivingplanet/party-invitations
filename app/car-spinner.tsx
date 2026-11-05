import { CarBody, CarDefs, Wheel } from "./racing-car";

/**
 * Small racing-car loading spinner: the same classic blue hot rod as the home-screen car (see
 * racing-car.tsx), sharing its gradients, body and redline wheels. The wheels spin and the car bobs
 * over a moving road; all of it stands still under prefers-reduced-motion (see globals.css, "Car spinner").
 */
export default function CarSpinner({ label = "Loading", size = 96 }: { label?: string; size?: number }) {
  return (
    <div role="status" aria-live="polite" className="car-spinner inline-flex flex-col items-center gap-1">
      <svg viewBox="0 0 210 100" width={size} height={(size * 100) / 210} aria-hidden="true">
        <defs>
          <CarDefs />
        </defs>
        <g className="car-spinner-road" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 18">
          <line x1="-30" y1="94" x2="250" y2="94" />
        </g>
        <g className="car-spinner-body">
          <CarBody />
          <Wheel cx={44} cy={66} r={22} />
          <Wheel cx={160} cy={71} r={17} />
        </g>
      </svg>
      <span className="text-sm font-medium text-zinc-500">{label}</span>
    </div>
  );
}
