import { useState, useRef, useEffect } from 'react';
import './index.css';
import { toISODateString, parseISODateString, INDONESIAN_MONTHS, INDONESIAN_DAYS } from './utils/dummyData';
import { getStatsForDateReal } from './utils/api';

interface HistoryProps {
  onNavigate?: (page: 'home' | 'camera' | 'summary' | 'history') => void;
  activeTab?: 'home' | 'camera' | 'summary';
}

export default function History({ onNavigate, activeTab = 'summary' }: HistoryProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [currentRecord, setCurrentRecord] = useState({
    dayName: INDONESIAN_DAYS[new Date().getDay()],
    dateStr: '',
    fullDateStr: '',
    totalScan: 0,
    healthyPercent: 0,
    earlyBlightPercent: 0,
    severityCounts: { ringan: 0, sedang: 0, parah: 0 },
    needleAngle: 0,
  });

  useEffect(() => {
    let isMounted = true;
    getStatsForDateReal(currentDate).then(stats => {
      if (isMounted) {
        setCurrentRecord(stats);
      }
    });
    return () => { isMounted = false; };
  }, [currentDate]);

  const openCalendar = () => {
    setPickerMonth(currentDate.getMonth());
    setPickerYear(currentDate.getFullYear());
    setIsCalendarOpen(true);
  };

  // Calendar and Date restrictions (future dates disabled)
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const isCurrentDateTodayOrFuture =
    new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime() >= startOfToday;

  const isViewingCurrentOrFutureMonth =
    pickerYear > today.getFullYear() ||
    (pickerYear === today.getFullYear() && pickerMonth >= today.getMonth());

  const handlePrevDay = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      const nextTime = new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime();
      if (nextTime > startOfToday) {
        return prev;
      }
      return next;
    });
  };

  const handleSelectDay = (day: number) => {
    const targetTime = new Date(pickerYear, pickerMonth, day).getTime();
    if (targetTime > startOfToday) {
      return; // Tidak bisa memilih tanggal masa depan
    }
    const newDate = new Date(pickerYear, pickerMonth, day);
    setCurrentDate(newDate);
    setIsCalendarOpen(false);
  };

  const handleSelectToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setPickerMonth(t.getMonth());
    setPickerYear(t.getFullYear());
    setIsCalendarOpen(false);
  };

  const handleSelectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setCurrentDate(yest);
    setPickerMonth(yest.getMonth());
    setPickerYear(yest.getFullYear());
    setIsCalendarOpen(false);
  };

  const handleSelectDaysAgo = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setCurrentDate(d);
    setPickerMonth(d.getMonth());
    setPickerYear(d.getFullYear());
    setIsCalendarOpen(false);
  };

  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isViewingCurrentOrFutureMonth) return;
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(pickerYear, pickerMonth, 1).getDay(); // 0 = Min, 1 = Sen, ...
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

  // Donut Chart calculations (radius = 72, circumference = 2 * pi * 72 = 452.39)
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const healthyStroke = (currentRecord.healthyPercent / 100) * circumference;
  const earlyBlightStroke = (currentRecord.earlyBlightPercent / 100) * circumference;
  const unknownStroke = (currentRecord.unknownPercent / 100) * circumference;

  const totalSick = currentRecord.severityCounts.ringan + currentRecord.severityCounts.sedang + currentRecord.severityCounts.parah;
  const maxBar = Math.max(1, totalSick);

  const handleTabClick = (tab: 'home' | 'camera' | 'summary') => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleBackToSummary = () => {
    if (onNavigate) {
      onNavigate('summary');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 sm:p-4">
      <main className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[min(100dvh-2rem,880px)] bg-gradient-to-b from-[#f9deb7] via-[#fdf5ea] to-[#fffdfa] flex flex-col sm:rounded-[36px] sm:shadow-2xl relative overflow-hidden">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="px-4.5 pt-6 pb-6 flex flex-col gap-3.5 flex-1">
          
          {/* Header Bar with Back Arrow and HISTORY Title */}
          <div className="relative flex items-center justify-center py-2">
            <button
              type="button"
              onClick={handleBackToSummary}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#22252a] hover:bg-black/5 active:scale-90 rounded-full transition-all cursor-pointer"
              aria-label="Kembali ke Summary"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="font-['Poppins'] font-black text-[22px] tracking-wide text-[#22252a]">
              HISTORY
            </h1>
          </div>

          {/* Orange Button: Pilih Hari */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={openCalendar}
              className="w-full bg-[#eb8e2d] hover:brightness-105 active:scale-[0.99] text-white font-semibold text-[13.5px] py-2.5 px-4 rounded-[12px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <svg
                className="w-4.5 h-4.5"
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
              <span>Pilih Hari</span>
            </button>

            {/* Hidden native date input fallback */}
            <input
              ref={dateInputRef}
              type="date"
              max={toISODateString(today)}
              value={toISODateString(currentDate)}
              onChange={(e) => {
                if (e.target.value) {
                  const d = parseISODateString(e.target.value);
                  const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                  if (targetTime <= startOfToday) {
                    setCurrentDate(d);
                    setPickerMonth(d.getMonth());
                    setPickerYear(d.getFullYear());
                  }
                }
              }}
              className="hidden"
              aria-label="Pilih hari dari kalender"
            />
          </div>

          {/* Date Selector Row with Arrows */}
          <div className="flex items-center justify-between px-2 py-1 select-none">
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 flex items-center justify-center text-[#555a64] hover:text-[#22252a] active:scale-90 transition-all cursor-pointer"
              aria-label="Hari sebelumnya"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            <div
              className="text-center cursor-pointer hover:opacity-80 active:scale-95 transition-all"
              onClick={openCalendar}
              title="Klik untuk memilih tanggal"
            >
              <h2 className="font-['Poppins'] font-black text-[20px] text-[#22252a] tracking-tight leading-tight">
                {currentRecord.dayName}
              </h2>
              <span className="text-[12px] font-semibold text-[#666d79]">
                {currentRecord.dateStr}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={isCurrentDateTodayOrFuture}
              title={isCurrentDateTodayOrFuture ? 'Belum ada pemindaian (tanggal mendatang)' : undefined}
              className={`w-8 h-8 flex items-center justify-center transition-all ${
                isCurrentDateTodayOrFuture
                  ? 'text-[#abb1bc] opacity-30 cursor-not-allowed'
                  : 'text-[#555a64] hover:text-[#22252a] active:scale-90 cursor-pointer'
              }`}
              aria-label="Hari berikutnya"
            >
              <svg
                className="w-5 h-5"
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
                  {currentRecord.totalScan}
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
                  {/* Segment 1: Healthy - Olive Green */}
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

                  {/* Segment 2: Early Blight - Dark Maroon/Brown */}
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
                  {currentRecord.totalScan}
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
                  {currentRecord.earlyBlightPercent}%
                </span>
              </div>

              {/* Label Healthy (Right/Bottom-Right) */}
              <div className="absolute top-[52%] -translate-y-1/2 right-[-7%] text-center pointer-events-none">
                <span className="block text-[10.5px] font-semibold text-[#4b5563] leading-tight">
                  Healthy
                </span>
                <span className="block text-[10px] font-medium text-[#4b5563]">
                  {currentRecord.healthyPercent}%
                </span>
              </div>
              {/* Label Unknown (Top-Left) */}
              <div className="absolute top-[12%] left-[0%] text-center pointer-events-none">
                <span className="block text-[10.5px] font-semibold text-[#4b5563] leading-tight">
                  Unknown
                </span>
                <span className="block text-[10px] font-medium text-[#4b5563]">
                  {currentRecord.unknownPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Distribusi keparahan */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col mb-4">
            <h3 className="text-[14px] font-bold text-[#2d3138] mb-4">
              Tingkat keparahan
            </h3>

            {/* Bar Chart */}
            <div className="flex flex-col gap-4">
              {/* Ringan */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Ringan</span>
                  <span>{currentRecord.severityCounts.ringan}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f59e0b] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentRecord.severityCounts.ringan / maxBar) * 100}%` }}
                  />
                </div>
              </div>

              {/* Sedang */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Sedang</span>
                  <span>{currentRecord.severityCounts.sedang}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#f97316] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentRecord.severityCounts.sedang / maxBar) * 100}%` }}
                  />
                </div>
              </div>

              {/* Parah */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>Parah</span>
                  <span>{currentRecord.severityCounts.parah}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ef4444] rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${(currentRecord.severityCounts.parah / maxBar) * 100}%` }}
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

        {/* Calendar Modal */}
        {isCalendarOpen && (
          <div
            className="absolute inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex flex-col justify-end sm:justify-center p-0 sm:p-4 transition-all duration-300"
            onClick={() => setIsCalendarOpen(false)}
          >
            <div
              className="w-full bg-[#fdfbf7] rounded-t-[32px] sm:rounded-[28px] p-5 shadow-2xl flex flex-col border border-orange-100/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#eb8e2d]/15 flex items-center justify-center text-[#eb8e2d]">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-['Poppins'] font-bold text-[16px] text-[#22252a] leading-tight">
                      Pilih Tanggal
                    </h3>
                    <p className="text-[11px] text-[#6b7280]">
                      Lihat riwayat pemindaian harian
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer active:scale-95"
                  aria-label="Tutup kalender"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between py-2.5 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555a64] hover:bg-black/5 hover:text-[#22252a] active:scale-90 transition-all cursor-pointer"
                  aria-label="Bulan sebelumnya"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <span className="font-['Poppins'] font-bold text-[15px] text-[#22252a]">
                  {INDONESIAN_MONTHS[pickerMonth]} {pickerYear}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={isViewingCurrentOrFutureMonth}
                  title={isViewingCurrentOrFutureMonth ? 'Bulan mendatang belum tersedia' : undefined}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isViewingCurrentOrFutureMonth
                      ? 'text-gray-300 opacity-30 cursor-not-allowed'
                      : 'text-[#555a64] hover:bg-black/5 hover:text-[#22252a] active:scale-90 cursor-pointer'
                  }`}
                  aria-label="Bulan berikutnya"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-[#8e95a2] py-1 border-b border-gray-100">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              {/* Day Numbers Grid */}
              <div className="grid grid-cols-7 gap-1.5 pt-2">
                {/* Empty cells for leading offset */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isFutureDate =
                    new Date(pickerYear, pickerMonth, dayNum).getTime() > startOfToday;

                  const isSelected =
                    currentDate.getFullYear() === pickerYear &&
                    currentDate.getMonth() === pickerMonth &&
                    currentDate.getDate() === dayNum;

                  const isTodayDate =
                    today.getFullYear() === pickerYear &&
                    today.getMonth() === pickerMonth &&
                    today.getDate() === dayNum;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isFutureDate}
                      onClick={() => !isFutureDate && handleSelectDay(dayNum)}
                      title={isFutureDate ? 'Belum ada pemindaian (tanggal mendatang)' : undefined}
                      className={`h-9 w-full rounded-[10px] flex flex-col items-center justify-center font-['Poppins'] text-[13px] transition-all ${
                        isFutureDate
                          ? 'text-gray-300 bg-gray-50/40 cursor-not-allowed opacity-35 select-none'
                          : isSelected
                          ? 'bg-[#eb8e2d] text-white font-black shadow-md shadow-[#eb8e2d]/40 scale-105 cursor-pointer active:scale-90'
                          : isTodayDate
                          ? 'border-2 border-[#eb8e2d] text-[#eb8e2d] font-bold hover:bg-orange-50 cursor-pointer active:scale-90'
                          : 'text-[#2d3138] font-medium hover:bg-gray-100/80 cursor-pointer active:scale-90'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isTodayDate && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-[#eb8e2d] -mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#eb8e2d] font-semibold text-[11.5px] text-center transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSelectYesterday}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#4b5563] font-semibold text-[11.5px] text-center transition-colors cursor-pointer"
                >
                  Kemarin
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDaysAgo(7)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#4b5563] font-semibold text-[11.5px] text-center transition-colors cursor-pointer"
                >
                  7 Hari Lalu
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export { History };
