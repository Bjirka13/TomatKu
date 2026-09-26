import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import Webcam from 'react-webcam';
import './index.css';

interface CameraProps {
  onNavigate?: (tab: 'home' | 'camera' | 'summary' | 'history') => void;
  activeTab?: 'home' | 'camera' | 'summary';
  previousPage?: 'landing' | 'pageone' | 'home' | 'camera' | 'summary' | 'history';
}

export default function Camera({ onNavigate, activeTab = 'camera', previousPage = 'home' }: CameraProps) {
  const [currentTab, setCurrentTab] = useState<'home' | 'camera' | 'summary'>(activeTab);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasAgreedPermission, setHasAgreedPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabClick = (tab: 'home' | 'camera' | 'summary' | 'history') => {
    if (tab === 'home' || tab === 'camera' || tab === 'summary') {
      setCurrentTab(tab);
    }
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleRejectPermission = () => {
    const validTarget =
      previousPage && ['home', 'summary', 'history'].includes(previousPage)
        ? (previousPage as 'home' | 'summary' | 'history')
        : 'home';
    handleTabClick(validTarget);
  };

  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 720 },
    height: { ideal: 1280 },
  };

  // Tangkap foto dari webcam
  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
      }
    }
  }, [webcamRef]);
  void capturePhoto;

  // Ganti kamera depan / belakang
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Upload file dari galeri sebagai alternatif
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kirim hasil scan ke halaman Summary
  const handleProceedToDetect = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      handleTabClick('summary');
    }, 600);
  };

  return (
    <div className="w-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 sm:p-4">
      <main className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[min(100dvh-2rem,880px)] bg-gradient-to-b from-[#f9deb7] via-[#fdf5ea] to-[#fffdfa] flex flex-col sm:rounded-[36px] sm:shadow-2xl relative overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between">
          {/* Modal Minta Izin Kamera (Muncul Sebelum Kamera Aktif) */}
          {!hasAgreedPermission && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-5 animate-fade">
            <div className="w-full max-w-[340px] bg-[#233523]/90 backdrop-blur-xl border border-white/20 rounded-[26px] p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.65)] flex flex-col items-center text-center">
              <h2 className="font-['Poppins'] font-black text-[18px] sm:text-[19px] text-white tracking-wide mb-3 uppercase leading-snug">
                SIAP SCAN DAUN TOMATMU?
              </h2>

              <p className="text-[12.8px] sm:text-[13.5px] font-normal leading-relaxed text-white/90 text-center mb-6">
                izinkan akses kamera untuk mendeteksi kondisi daun tomat. saat ini, sistem fokus mengenali daun sehat dan mendeteksi gejala penyakit bercak kering.
              </p>

              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleRejectPermission}
                  className="w-full py-3 px-3 rounded-[18px] bg-[#752c2c] hover:bg-[#853434] active:scale-95 text-white font-bold text-[14.5px] shadow-md transition-all cursor-pointer"
                >
                  Nanti Saja
                </button>

                <button
                  type="button"
                  onClick={() => setHasAgreedPermission(true)}
                  className="w-full py-3 px-3 rounded-[18px] bg-[#788944] hover:bg-[#879b4d] active:scale-95 text-white font-bold text-[14.5px] shadow-md transition-all cursor-pointer"
                >
                  Izinkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Title */}
        <header className="pt-6 sm:pt-7 px-5 pb-2 text-center flex-shrink-0">
          <h1 className="flex flex-col items-center gap-0.5 font-['Poppins'] font-black text-[clamp(21px,5.8vw,28px)] leading-tight tracking-[-0.3px] text-[#eb8e2d] uppercase select-none text-stroke-title">
            <span>DETEKSI KAMERA</span>
            <span>TOMATKU</span>
          </h1>
        </header>

        {/* Camera Scanner Viewport Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-5 my-auto w-full">
          {capturedImage ? (
            /* Mode Preview Foto yang Berhasil Diambil */
            <div className="w-full max-w-[350px] bg-[#728543] rounded-[28px] p-4 shadow-[0_16px_30px_-4px_rgba(90,115,45,0.38)] flex flex-col items-center animate-fade">
              <div className="w-full aspect-[4/3] h-500px rounded-[20px] overflow-hidden bg-black mb-3.5 relative shadow-inner">
                <img
                  src={capturedImage}
                  alt="Foto Daun Terdeteksi"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Foto Terambil
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleProceedToDetect}
                  disabled={isScanning}
                  className="w-full py-3 px-4 rounded-[20px] bg-gradient-to-r from-[#e58e26] to-[#d47b19] text-white font-bold text-[15px] shadow-[0_8px_20px_rgba(224,137,40,0.45)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menganalisis Daun...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>Periksa Kondisi Daun</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCapturedImage(null)}
                  disabled={isScanning}
                  className="w-full py-2.5 px-4 rounded-[20px] bg-white/15 hover:bg-white/25 text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                >
                  Ambil Ulang Foto
                </button>
              </div>
            </div>
          ) : (
            /* Mode Live Camera Viewfinder */
            <div className="w-full max-w-[360px] flex flex-col items-center">
              {/* Box Frame Kamera */}
              <div className="w-full aspect-[3/4] max-h-[480px] rounded-[28px] overflow-hidden relative shadow-[0_16px_34px_rgba(0,0,0,0.25)] bg-[#1e251a] flex items-center justify-center border-2 border-white/40">
                {hasAgreedPermission ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    onUserMedia={() => setHasPermission(true)}
                    onUserMediaError={() => setHasPermission(false)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1e251a] flex items-center justify-center text-white/50 text-xs">
                    Kamera menunggu izin...
                  </div>
                )}

                {/* Target Frame / Reticle di tengah kamera */}
                <div className="absolute inset-8 pointer-events-none flex flex-col justify-between items-stretch">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-3 border-l-3 border-[#eb8e2d] rounded-tl-lg" />
                    <div className="w-6 h-6 border-t-3 border-r-3 border-[#eb8e2d] rounded-tr-lg" />
                  </div>

                  {/* Laser Scan line effect */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#eb8e2d] to-transparent opacity-80 animate-pulse-prompt" />

                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-3 border-l-3 border-[#eb8e2d] rounded-bl-lg" />
                    <div className="w-6 h-6 border-b-3 border-r-3 border-[#eb8e2d] rounded-br-lg" />
                  </div>
                </div>

                {/* Hint Text */}
                <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                  <span className="bg-black/50 backdrop-blur-md text-white text-[11.5px] px-3.5 py-1 rounded-full font-medium shadow-sm">
                    Posisikan daun tomat di tengah kotak
                  </span>
                </div>

                {/* Fallback Jika Akses Kamera Ditolak / Tidak Tersedia */}
                {hasPermission === false && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-20">
                    {/* <div className="text-3xl mb-2">📷⚠️</div> */}
                    <h3 className="text-white font-bold text-[15px] mb-1">Akses Kamera Belum Diizinkan</h3>
                    <p className="text-white/70 text-[12px] mb-4">
                      Silakan izinkan akses kamera di browser Anda atau upload foto daun dari galeri.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-4 bg-[#eb8e2d] hover:bg-[#d87f22] rounded-full text-white text-[12.5px] font-bold cursor-pointer mb-2.5 transition-all"
                    >
                      Pilih Foto dari Galeri
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectPermission}
                      className="text-white/75 hover:text-white text-[12px] underline transition-colors cursor-pointer"
                    >
                      Kembali ke halaman sebelumnya
                    </button>
                  </div>
                )}
              </div>

              {/* Mode Selector (Portrait / Photo / Night) */}
              {/* <div className="flex items-center justify-center gap-7 mt-3 text-[12.5px] font-semibold select-none"> */}
                {/* <span className="text-gray-400">Portrait</span> */}
                {/* <span className="text-[#eb8e2d] font-bold underline underline-offset-4">Photo</span> */}
                {/* <span className="text-gray-400">Night</span> */}
              {/* </div> */}

              {/* Shutter & Controls Bar */}
              <div className="w-full flex items-center justify-between px-6 mt-2.5 sm:mt-3">
                {/* Tombol Upload File */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                  aria-label="Upload dari galeri"
                  title="Upload dari galeri"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Tombol Jepret Kamera Utama */}
                {/* <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-15 h-15 rounded-full border-4 border-[#eb8e2d] bg-white shadow-[0_4px_16px_rgba(235,142,45,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-90 cursor-pointer group"
                  aria-label="Ambil foto"
                >
                  <div className="w-10 h-10 rounded-full bg-[#eb8e2d] group-active:scale-90 transition-transform" />
                </button> */}

                {/* Tombol Ganti Kamera Depan / Belakang */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="w-11 h-11 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                  aria-label="Ganti kamera"
                  title="Ganti kamera"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          </div>
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

export { Camera };
