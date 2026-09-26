import daunSehatImg from './assets/daun-sehat.jpg';
import { useState } from 'react';

interface PageOneProps {
  onContinue?: () => void;
}

export default function PageOne({ onContinue }: PageOneProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleContinue = () => {
    setIsExiting(true);

    setTimeout(() => {
        if (onContinue) {
            onContinue();
        }
    }, 200)
  };

  return (
    <div className={`w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 sm:p-4 transition-all duration-300 ease-out ${ isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100' }`}>
      <main className="w-full sm:max-w-[430px] min-h-[100dvh] sm:min-h-0 sm:h-[min(100dvh-2rem,880px)] relative overflow-hidden sm:rounded-[36px] sm:shadow-2xl flex items-center justify-center p-5 select-none">
        {/* Blurred Foliage Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={daunSehatImg}
            alt="Background Tanaman Tomat"
            className="w-full h-full object-cover scale-110 filter blur-[4px] brightness-[0.72]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/45" />
        </div>

        {/* Glassmorphism Dialog Card */}
        <div className="relative z-10 w-full max-w-[340px] bg-[#1e3419]/75 backdrop-blur-xl border border-white/20 rounded-[28px] p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.55)] flex flex-col items-center animate-fade">
          <h2 className="font-['Poppins'] font-extrabold text-[22px] sm:text-[23px] text-white tracking-tight mb-3 text-center leading-snug">
            Siap Scan Daun Tomatmu?
          </h2>

          <p className="text-[13px] sm:text-[13.5px] font-normal leading-relaxed text-white/90 text-left mb-6 tracking-[0.1px]">
            Saat ini, sistem fokus mengenali kondisi daun sehat serta mendeteksi penyakit Bercak Kering (Early Blight) secara spesifik.
          </p>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-3.5 px-6 rounded-[22px] bg-gradient-to-r from-[#e58e26] via-[#df8621] to-[#d67b17] text-white font-bold text-[15px] sm:text-[16px] shadow-[0_8px_22px_rgba(224,137,40,0.48)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border border-white/20 tracking-wide"
          >
            Saya Paham!
          </button>
        </div>
      </main>
    </div>
  );
}

export { PageOne };
