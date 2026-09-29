import { useState, useEffect } from 'react';
import './index.css';
import { getPeriodStatsReal } from './utils/api';

interface SummaryProps {
  onNavigate?: (tab: 'home' | 'camera' | 'summary' | 'history') => void;
  activeTab?: 'home' | 'camera' | 'summary';
}

type Period = 'hari' | 'minggu' | 'bulan';

interface RecommendationItem {
  id: number;
  title: string;
  points: string[];
}

const earlyBlightRecommendations: RecommendationItem[] = [
  {
    id: 1,
    title: '1. Sanitasi & Pembersihan',
    points: [
      'Potong daun yang memiliki bercak konsentris cokelat/hitam, prioritaskan daun tua di bagian bawah.',
      'Bakar atau kubur sisa tanaman yang sakit jauh dari lahan. Jangan dijadikan kompos karena spora jamur tetap bisa bertahan hidup.',
      'Bersihkan gunting pangkas atau pisau dengan disinfektan/alkohol sebelum pindah ke tanaman lain agar spora tidak menyebar.',
    ],
  },
  {
    id: 2,
    title: '2. Pengendalian Kelembapan & Pola Siram',
    points: [
      'Basahi tanah langsung di area akar atau gunakan irigasi tetes agar daun tetap kering.',
      'Jika menggunakan semprotan manual, siram di pagi hari agar air yang menempel di daun cepat menguap oleh sinar matahari.',
      'Pasang mulsa plastik atau jerami untuk mencegah percikan air tanah yang membawa spora memantul ke daun bawah.',
    ],
  },
  {
    id: 3,
    title: '3. Pengaturan Sirkulasi Udara',
    points: [
      'Hindari menanam tomat terlalu rapat agar aliran udara antar kanopi lancar dan kelembapan mikro turun',
      'Buang tunas air yang tidak produktif agar tanaman lebih tegak dan daun tidak saling menumpuk',
    ],
  },
  {
    id: 4,
    title: '4. Perlindungan & Pengobatan (Fungisida)',
    points: [
      'Hindari menanam tomat terlalu rapat agar aliran udara antar kanopi lancar dan kelembapan mikro turun',
      'Buang tunas air yang tidak produktif agar tanaman lebih tegak dan daun tidak saling menumpuk',
    ],
  },
];

export default function Summary({ onNavigate, activeTab = 'summary' }: SummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('hari');
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const [currentStats, setCurrentStats] = useState({
    totalScan: 0,
    healthyPercent: 0,
    earlyBlightPercent: 0,
    severityCounts: { ringan: 0, sedang: 0, parah: 0 },
    needleAngle: 0,
    label: ''
  });

  useEffect(() => {
    let isMounted = true;
    getPeriodStatsReal(selectedPeriod).then(stats => {
      if (isMounted) {
        setCurrentStats(stats);
      }
    });
    return () => { isMounted = false; };
  }, [selectedPeriod]);

  // Donut Chart calculations (radius = 72, circumference = 2 * pi * 72 = 452.39)
  const radius = 72;
  const circumference = 2 * Math.PI * radius; // ~452.39
  const healthyStroke = (currentStats.healthyPercent / 100) * circumference;
  const earlyBlightStroke = (currentStats.earlyBlightPercent / 100) * circumference;
  const unknownStroke = (currentStats.unknownPercent / 100) * circumference;

  const totalSick = currentStats.severityCounts.ringan + currentStats.severityCounts.sedang + currentStats.severityCounts.parah;
  const maxBar = Math.max(1, totalSick);

  const handleTabClick = (tab: 'home' | 'camera' | 'summary' | 'history') => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 sm:p-4">
      <main className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[min(100dvh-2rem,880px)] bg-gradient-to-b from-[#f9deb7] via-[#fdf5ea] to-[#fffdfa] flex flex-col sm:rounded-[36px] sm:shadow-2xl relative overflow-hidden">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="px-4.5 pt-6 pb-6 flex flex-col gap-3.5 flex-1">
          
          {/* Top Banner: See the history? */}
          <div
            onClick={() => onNavigate?.('history')}
            className="w-full bg-[#363a40] hover:bg-[#3d4249] rounded-[18px] py-2.5 px-4 flex items-center justify-between shadow-md cursor-pointer transition-colors"
          >
            <span className="text-[13px] font-medium text-white/90">
              See the history?
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('history');
              }}
              className="w-6.5 h-6.5 rounded-[7px] bg-white flex items-center justify-center text-[#363a40] hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label="Lihat riwayat"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Card: Rekomendasi cara penanganan Early Blight */}
          <div className="w-full bg-white rounded-[22px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col">
            <h3 className="text-[13.5px] font-bold text-[#2d3138] mb-3 tracking-tight">
              Rekomendasi cara penanganan Early Blight
            </h3>

            <div className="flex flex-col gap-3">
              {earlyBlightRecommendations.map((item) => {
                const isOpen = openAccordion === item.id;
                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setOpenAccordion(isOpen ? null : item.id)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer"
                    >
                      <span className="text-[13px] font-medium text-[#2d3138] group-hover:text-[#eb8e2d] transition-colors leading-tight">
                        {item.title}
                      </span>
                      <span className="w-5.5 h-5.5 rounded-[5px] bg-[#34363a] text-white flex items-center justify-center flex-shrink-0 group-hover:bg-[#454a52] active:scale-95 transition-all shadow-sm">
                        {isOpen ? (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 5v14M19 12l-7 7-7-7" />
                          </svg>
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-2.5 pl-4 pr-1">
                        <ul className="space-y-1.5 list-disc text-[11.5px] leading-relaxed text-[#4b5563]">
                          {item.points.map((point, idx) => (
                            <li key={idx} className="pl-0.5">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Filter Buttons + Calendar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPeriod('hari')}
              className={`flex-1 py-2 px-3 rounded-[12px] font-semibold text-[13px] transition-all cursor-pointer text-center ${
                selectedPeriod === 'hari'
                  ? 'bg-[#eb8e2d] text-white shadow-sm'
                  : 'bg-[#838891] text-white/90 hover:bg-[#777c86]'
              }`}
            >
              Hari ini
            </button>

            <button
              type="button"
              onClick={() => setSelectedPeriod('minggu')}
              className={`flex-1 py-2 px-3 rounded-[12px] font-semibold text-[13px] transition-all cursor-pointer text-center ${
                selectedPeriod === 'minggu'
                  ? 'bg-[#eb8e2d] text-white shadow-sm'
                  : 'bg-[#838891] text-white/90 hover:bg-[#777c86]'
              }`}
            >
              Minggu ini
            </button>

            <button
              type="button"
              onClick={() => setSelectedPeriod('bulan')}
              className={`flex-1 py-2 px-3 rounded-[12px] font-semibold text-[13px] transition-all cursor-pointer text-center ${
                selectedPeriod === 'bulan'
                  ? 'bg-[#eb8e2d] text-white shadow-sm'
                  : 'bg-[#838891] text-white/90 hover:bg-[#777c86]'
              }`}
            >
              Bulan ini
            </button>

            {/* <button
              type="button"
              onClick={() => onNavigate?.('history')}
              className="py-2 px-2.5 rounded-[12px] bg-[#eb8e2d] hover:brightness-105 active:scale-95 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer flex-shrink-0"
              aria-label="Pilih tanggal di riwayat"
              title="Buka riwayat per tanggal"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.8" />
              </svg>
            </button> */}
          </div>

          {/* Card 1: Total Deteksi */}
          <div className="w-full bg-[#363a40] rounded-[22px] p-5 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
            <h3 className="text-[13.5px] font-bold text-white tracking-tight">
              Total Deteksi
            </h3>
            
            <div className="flex items-center justify-between mt-2.5">
              {/* Glowing Leaf + Magnifier Illustration */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Glow aura */}
                <div className="absolute w-18 h-18 bg-[#95cb4d]/35 rounded-full blur-xl animate-pulse" />
                <div className="absolute w-12 h-12 bg-[#eb8e2d]/30 rounded-full blur-lg translate-x-3 translate-y-3" />

                {/* SVG Leaf and Magnifying Glass */}
                <svg className="w-20 h-20 relative z-10" viewBox="0 0 100 100" fill="none">
                  {/* Leaf */}
                  <path
                    d="M32 78 C25 60 22 35 62 20 C68 45 62 68 32 78 Z"
                    fill="#6e963b"
                    stroke="#8dbd48"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  {/* Leaf center vein */}
                  <path
                    d="M36 74 Q48 50 62 20"
                    stroke="#436322"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Leaf side veins */}
                  <path d="M43 62 Q52 56 56 48" stroke="#436322" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M39 52 Q44 42 50 38" stroke="#436322" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M48 45 Q40 40 34 46" stroke="#436322" strokeWidth="1.6" strokeLinecap="round" />

                  {/* Magnifying Glass */}
                  <g transform="translate(42, 46)">
                    {/* Glass rim */}
                    <circle
                      cx="20"
                      cy="20"
                      r="14"
                      stroke="#eb8e2d"
                      strokeWidth="3.8"
                      fill="#eb8e2d"
                      fillOpacity="0.25"
                    />
                    {/* Glass reflection */}
                    <path
                      d="M14 14 A10 10 0 0 1 24 10"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                    {/* Handle */}
                    <line
                      x1="30"
                      y1="30"
                      x2="40"
                      y2="40"
                      stroke="#eb8e2d"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </div>

              {/* Total Number & Caption */}
              <div className="text-right flex flex-col items-end">
                <span className="text-[52px] font-black leading-none tracking-tight text-white font-['Poppins']">
                  {currentStats.totalScan}
                </span>
                <span className="text-[11.5px] font-medium text-white/75 mt-1.5">
                  Total daun yang dipindai
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Distribusi Hasil Klasifikasi */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col">
            <h3 className="text-[14px] font-bold text-[#2d3138] mb-3">
              Distribusi Hasil Klasifikasi
            </h3>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-[#4b5563] mb-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#788e40]" />
                <span>Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#782c2c]" />
                <span>Early Blight</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" />
                <span>Unknown</span>
              </div>
            </div>

            {/* Donut Chart with Surrounding Labels */}
            <div className="relative w-full max-w-[290px] mx-auto aspect-square flex items-center justify-center">
              
              {/* SVG Donut */}
              <svg className="w-full h-full" viewBox="0 0 240 240">
                <g transform="rotate(-90 120 120)">
                  {/* Segment 1: Healthy (60%) - Olive Green */}
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="#788e40"
                    strokeWidth="32"
                    strokeDasharray={`${healthyStroke} ${circumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* Segment 2: Early Blight (30%) - Dark Maroon/Brown */}
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="#782c2c"
                    strokeWidth="32"
                    strokeDasharray={`${earlyBlightStroke} ${circumference}`}
                    strokeDashoffset={`-${healthyStroke}`}
                    className="transition-all duration-700 ease-out"
                  />

                  {/* Segment 3: Unknown - Gray */}
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="32"
                    strokeDasharray={`${unknownStroke} ${circumference}`}
                    strokeDashoffset={`-${healthyStroke + earlyBlightStroke}`}
                    className="transition-all duration-700 ease-out"
                  />
                </g>

                {/* Donut Center Label */}
                <text
                  x="120"
                  y="118"
                  textAnchor="middle"
                  className="font-['Poppins'] font-black text-[32px] fill-[#22252a]"
                >
                  {currentStats.totalScan}
                </text>
                <text
                  x="120"
                  y="136"
                  textAnchor="middle"
                  className="font-bold text-[10px] fill-[#6b7280] tracking-wider uppercase"
                >
                  TOTAL SCAN
                </text>
              </svg>

              {/* Floating Labels outside Donut */}

              {/* Label Early Blight (Left) */}
              <div className="absolute top-[48%] -translate-y-1/2 left-[-12%] text-center pointer-events-none">
                <span className="block text-[10.5px] font-semibold text-[#4b5563] leading-tight">
                  Early Blight
                </span>
                <span className="block text-[10px] font-medium text-[#4b5563]">
                  {currentStats.earlyBlightPercent}%
                </span>
              </div>

              {/* Label Healthy (Right/Bottom-Right) */}
              <div className="absolute top-[52%] -translate-y-1/2 right-[-7%] text-center pointer-events-none">
                <span className="block text-[10.5px] font-semibold text-[#4b5563] leading-tight">
                  Healthy
                </span>
                <span className="block text-[10px] font-medium text-[#4b5563]">
                  {currentStats.healthyPercent}%
                </span>
              </div>
              {/* Label Unknown (Top-Left) */}
              <div className="absolute top-[12%] left-[0%] text-center pointer-events-none">
                <span className="block text-[10.5px] font-semibold text-[#4b5563] leading-tight">
                  Unknown
                </span>
                <span className="block text-[10px] font-medium text-[#4b5563]">
                  {currentStats.unknownPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Distribusi keparahan */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col mb-4">
            <h3 className="text-[14px] font-bold text-[#2d3138] mb-4">
              Distribusi keparahan
            </h3>

            {/* Bar Chart */}
            <div className="flex flex-col gap-4">
              {/* Ringan */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Ringan</span>
                  <span>{currentStats.severityCounts.ringan}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f59e0b] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentStats.severityCounts.ringan / maxBar) * 100}%` }}
                  />
                </div>
              </div>

              {/* Sedang */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Sedang</span>
                  <span>{currentStats.severityCounts.sedang}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f97316] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentStats.severityCounts.sedang / maxBar) * 100}%` }}
                  />
                </div>
              </div>

              {/* Parah */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Parah</span>
                  <span>{currentStats.severityCounts.parah}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ef4444] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentStats.severityCounts.parah / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Ambient bottom warm glow right above fixed nav */}
        <div className="h-6 bg-gradient-to-t from-[#f5dfc2]/70 via-[#fdf5ea]/20 to-transparent -mb-1 pointer-events-none flex-shrink-0 z-20" />

        {/* Fixed Bottom Navigation Bar */}
        <nav
          className="bg-[#34363a] rounded-t-[28px] pt-4 px-6 pb-5 max-sm:pb-[calc(16px+env(safe-area-inset-bottom,0px))] flex justify-around items-center shadow-[0_-4px_18px_rgba(0,0,0,0.18)] flex-shrink-0 w-full z-30"
          aria-label="Navigasi Utama"
        >
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              activeTab === 'home' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
            }`}
            onClick={() => handleTabClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              activeTab === 'camera' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
            }`}
            onClick={() => handleTabClick('camera')}
          >
            Camera
          </button>
          <button
            type="button"
            className={`bg-transparent border-none cursor-pointer font-['Poppins'] text-[15px] sm:text-[15.5px] tracking-[-0.2px] py-1.5 px-3.5 rounded-[20px] transition-all hover:text-white active:scale-95 ${
              activeTab === 'summary' ? 'text-[#eb8e2d] font-bold' : 'text-[#e2e2e2] font-semibold'
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

export { Summary };
