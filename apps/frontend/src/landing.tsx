import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import tomatkuIcon from './assets/tomatku-icon.png';

interface LandingProps {
  onStart?: () => void;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

export default function Landing({
  onStart,
}: LandingProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    const switchTimer = setTimeout(() => {
      if (onStart) onStart();
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(switchTimer);
    };
  }, [onStart]);

  const handleClick = () => {
    if (onStart) {
      onStart();
    }
  };

  return (
    <div
      className={`w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] sm:p-4 transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <main
        className="w-full sm:max-w-[430px] min-h-[100dvh] sm:min-h-0 sm:h-[min(100dvh-2rem,880px)] bg-white flex flex-col justify-center items-center relative cursor-pointer select-none overflow-hidden p-6 sm:rounded-[36px] sm:shadow-2xl"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label="Masuk ke TomatKU"
        onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
      >
        {/* Brand Logo & Name */}
        <div
          className={`flex flex-col items-center justify-center transition-transform duration-300 ease-out animate-entrance ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        >
          <div className="flex items-center justify-center gap-0">
            <img
              src={tomatkuIcon}
              alt="Logo TomatKU"
              className="w-[clamp(100px,28vw,136px)] h-[clamp(100px,28vw,136px)] object-contain drop-shadow-md transition-transform duration-300"
            />
            <h1 className="-ml-3 sm:-ml-4 font-['Poppins'] font-extrabold text-[clamp(48px,15vw,50px)] text-[#383a3f] tracking-tight leading-none flex items-center">
              <span>Tomat</span>
              <span>KU</span>
            </h1>
          </div>
        </div>
      </main>
    </div>
  );
}

export { Landing };
