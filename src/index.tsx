import { useState, useEffect } from 'react';
import type { TouchEvent } from 'react';
import './index.css';
import daunSehatImg from './assets/daun-sehat.jpg';
import bercakDaunImg from './assets/bercak-daun.jpg';

export interface LeafCondition {
  id: string;
  title: string;
  description: string;
  status: string;
  badgeBg: string;
  image: string;
}

const conditions: LeafCondition[] = [
  {
    id: 'sehat',
    title: 'Daun Sehat',
    description: 'Daun tomat dalam kondisi sehat ditandai dengan warna hijau segar yang merata serta tekstur helaian yang kokoh. Kondisi ini menunjukkan proses fotosintesis dan produksi klorofil berjalan optimal, serapan air stabil, serta kebutuhan nutrisi makro dan mikro tercukupi dengan baik tanpa adanya gejala infeksi jamur, bakteri, maupun serangan hama.',
    status: 'Kondisi Prima',
    badgeBg: '#4E7728',
    image: daunSehatImg,
  },
  {
    id: 'bercak',
    title: 'Early Blight',
    description: 'Early blight pada tomat ditandai dengan bercak gelap kecokelatan pada daun, seringkali berbentuk konsentris mirip mata atau target, dengan bagian tepi yang sedikit meninggi. Penyakit yang disebabkan oleh jamur patogen Alternaria solani ini dapat berkembang pesat pada kondisi lembap dan hangat, menyebabkan daun menguning, kering, kemudian gugur sebelum waktunya sehingga mengurangi kemampuan tanaman berfotosintesis dan memengaruhi kualitas serta kuantitas hasil panen secara signifikan.',
    status: 'Perlu Perawatan',
    badgeBg: '#C05621',
    image: bercakDaunImg,
  },
];

interface HomeProps {
  onNavigate?: (tab: 'home' | 'camera' | 'summary') => void;
  activeTab?: 'home' | 'camera' | 'summary';
}

export default function Home({ onNavigate, activeTab = 'home' }: HomeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTab, setCurrentTab] = useState<'home' | 'camera' | 'summary'>(activeTab);
  const [animDirection, setAnimDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handlePrev = () => {
    setAnimDirection('left');
    setCurrentIndex((prev) => (prev === 0 ? conditions.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setAnimDirection('right');
    setCurrentIndex((prev) => (prev === conditions.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStart(null);
  };

  const handleTabClick = (tab: 'home' | 'camera' | 'summary') => {
    setCurrentTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const currentCondition = conditions[currentIndex];

  return (
    <div className="w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 sm:p-4">
      <main className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[min(100dvh-2rem,880px)] bg-gradient-to-b from-[#f9deb7] via-[#fdf5ea] to-[#fffdfa] flex flex-col sm:rounded-[36px] sm:shadow-2xl relative overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {/* Header Title */}
          <header className="pt-20 sm:pt-16 pb-1 text-center flex-shrink-0">
          <h1 className="flex flex-col items-center gap-0.5 font-['Poppins'] font-black text-[clamp(21px,5.8vw,28px)] leading-tight tracking-[-0.3px] text-[#eb8e2d] uppercase select-none text-stroke-title">
            <span>KENALI KONDISI</span>
            <span>DAUN TOMATMU</span>
          </h1>
        </header>

        {/* Main Card */}
        <section
          className="mx-4 sm:mx-[18px] mt-4 sm:mt-5 mb-6 bg-[#728543] rounded-[28px] p-4 sm:p-[20px_14px_14px_14px] shadow-[0_16px_30px_-4px_rgba(90,115,45,0.38),0_8px_14px_-3px_rgba(0,0,0,0.1)] flex flex-col relative select-none touch-pan-y flex-shrink-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription="carousel"
          aria-label="Kondisi Daun Tomat"
        >
          {/* Card Top Text & Navigation */}
          <div className="flex flex-col mb-3 sm:mb-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#adc278] hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                onClick={handlePrev}
                aria-label="Kondisi Sebelumnya"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1 text-center px-1">
                <h2
                  className={`font-['Poppins'] text-[21px] sm:text-[23px] font-extrabold text-white tracking-tight mb-1 ${
                    animDirection ? 'animate-fade' : ''
                  }`}
                  key={currentCondition.id + '-title'}
                >
                  {currentCondition.title}
                </h2>
                <p
                  className={`text-[11.5px] text-justify sm:text-[12.2px] font-medium leading-relaxed text-[#edf2d8] mx-auto max-w-[270px] ${
                    animDirection ? 'animate-fade' : ''
                  }`}
                  key={currentCondition.id + '-desc'}
                >
                  {currentCondition.description}
                </p>
              </div>

              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#adc278] hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                onClick={handleNext}
                aria-label="Kondisi Berikutnya"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Leaf Photo */}
          <div className="w-full max-h-[360px] sm:max-h-[300px] aspect-square rounded-[20px] overflow-hidden bg-[#5d6f35] relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)] mx-auto">
            <img
              src={currentCondition.image}
              alt={currentCondition.title}
              className={`w-full h-full object-cover block transition-transform duration-300 ${
                animDirection ? 'animate-fade' : ''
              }`}
              key={currentCondition.id + '-img'}
              loading="eager"
            />
          </div>

          {/* Indicator dots */}
          <div className="flex justify-center items-center gap-1.5 mt-3 sm:mt-3.5">
            {conditions.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`h-[7px] rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-5 bg-white' : 'w-[7px] bg-white/40'
                }`}
                onClick={() => {
                  setAnimDirection(idx > currentIndex ? 'right' : 'left');
                  setCurrentIndex(idx);
                }}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </section>
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <nav
          className="bg-[#34363a] rounded-t-[28px] pt-4 px-6 pb-5 max-sm:pb-[calc(16px+env(safe-area-inset-bottom,0px))] flex justify-around items-center shadow-[0_-4px_18px_rgba(0,0,0,0.18)] flex-shrink-0 w-full z-30"
          aria-label="Navigasi Utama"
        >
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              currentTab === 'home' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
            }`}
            onClick={() => handleTabClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              currentTab === 'camera' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
            }`}
            onClick={() => handleTabClick('camera')}
          >
            Camera
          </button>
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              currentTab === 'summary' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
            }`}
            onClick={() => handleTabClick('summary')}
          >
            Summary
          </button>
        </nav>
      </main>
    </div>
  );
}

export { Home };
