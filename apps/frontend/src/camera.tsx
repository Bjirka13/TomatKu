import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import Webcam from 'react-webcam';
import { API_BASE_URL } from './utils/api';
import './index.css';

interface CameraProps {
  onNavigate?: (tab: 'home' | 'camera' | 'summary' | 'history') => void;
  activeTab?: 'home' | 'camera' | 'summary';
  previousPage?: 'landing' | 'pageone' | 'home' | 'camera' | 'summary' | 'history';
}

interface LightingAssessment {
  isChecking: boolean;
  brightness: number;
  isTooDark: boolean;
  isTooBright: boolean;
}

const analyzeImageBrightness = (
  imageSrc: string
): Promise<{ brightness: number; isTooDark: boolean; isTooBright: boolean }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({ brightness: 128, isTooDark: false, isTooBright: false });
          return;
        }
        ctx.drawImage(img, 0, 0, 100, 100);
        const { data } = ctx.getImageData(0, 0, 100, 100);
        let total = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = Math.round(total / pixelCount);
        resolve({
          brightness: avg,
          isTooDark: avg < 60,
          isTooBright: avg > 235,
        });
      } catch {
        resolve({ brightness: 128, isTooDark: false, isTooBright: false });
      }
    };
    img.onerror = () => {
      resolve({ brightness: 128, isTooDark: false, isTooBright: false });
    };
    img.src = imageSrc;
  });
};

export default function Camera({ onNavigate, activeTab = 'camera', previousPage = 'home' }: CameraProps) {
  const [currentTab, setCurrentTab] = useState<'home' | 'camera' | 'summary'>(activeTab);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasAgreedPermission, setHasAgreedPermission] = useState(() => {
    return sessionStorage.getItem('camera_permission_granted') === 'true';
  });
  const [showTutorial, setShowTutorial] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isRealtimeScanning, setIsRealtimeScanning] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('');
  const [realtimeFramesSeen, setRealtimeFramesSeen] = useState(0);
  const [realtimePrediction, setRealtimePrediction] = useState<any>(null);
  const [realtimeFrameSize, setRealtimeFrameSize] = useState({ width: 1, height: 1 });
  const [realtimeStableResult, setRealtimeStableResult] = useState<any>(null);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [lightingAssessment, setLightingAssessment] = useState<LightingAssessment | null>(null);
  const [liveIsTooDark, setLiveIsTooDark] = useState(false);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeIntervalRef = useRef<number | null>(null);
  const realtimeFrameInFlightRef = useRef(false);
  const realtimeActiveRef = useRef(false);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // Real-time live check pada viewfinder kamera
  useEffect(() => {
    if (!hasAgreedPermission || capturedImage || showTutorial) return;

    const interval = setInterval(() => {
      if (webcamRef.current) {
        const video = webcamRef.current.video;
        if (video && video.readyState >= 2) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 60;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, 60, 60);
              const data = ctx.getImageData(0, 0, 60, 60).data;
              let sum = 0;
              for (let i = 0; i < data.length; i += 4) {
                sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              }
              const avg = sum / (data.length / 4);
              setLiveIsTooDark(avg < 55);
            }
          } catch {
            // Abaikan kesalahan pembacaan canvas cross-origin
          }
        }
      }
    }, 800);

    return () => clearInterval(interval);
  }, [hasAgreedPermission, capturedImage, showTutorial]);

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

  // Simpan foto dan lakukan evaluasi pencahayaan
  const handleSetCapturedImage = async (imageSrc: string | null) => {
    setCapturedImage(imageSrc);
    setScanErrorMessage(null);
    if (!imageSrc) {
      setLightingAssessment(null);
      return;
    }
    setLightingAssessment({ isChecking: true, brightness: 0, isTooDark: false, isTooBright: false });
    const result = await analyzeImageBrightness(imageSrc);
    setLightingAssessment({
      isChecking: false,
      brightness: result.brightness,
      isTooDark: result.isTooDark,
      isTooBright: result.isTooBright,
    });
  };

  const stopRealtimeStream = useCallback(() => {
    realtimeActiveRef.current = false;
    realtimeFrameInFlightRef.current = false;
    if (realtimeIntervalRef.current !== null) {
      window.clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
    const socket = realtimeSocketRef.current;
    realtimeSocketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, 'Camera scan stopped');
    }
    setIsRealtimeScanning(false);
  }, []);

  useEffect(() => stopRealtimeStream, [stopRealtimeStream]);
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopRealtimeStream();
    }
  }, [activeTab, stopRealtimeStream]);

  const startRealtimeStream = () => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setRealtimeStatus('Kamera belum siap. Izinkan akses kamera terlebih dahulu.');
      return;
    }

    stopRealtimeStream();
    setDetectionResult(null);
    setRealtimeFramesSeen(0);
    setRealtimePrediction(null);
    setRealtimeStableResult(null);
    setRealtimeStatus('Menghubungkan ke server...');
    setIsRealtimeScanning(true);
    realtimeActiveRef.current = true;

    const socketUrl = new URL(`${API_BASE_URL}/api/detect/realtime/stream`);
    socketUrl.protocol = 'wss:';
    const socket = new WebSocket(socketUrl);
    realtimeSocketRef.current = socket;

    socket.onopen = () => {
      setRealtimeStatus('Terhubung. Menunggu server siap...');
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data);
      if (message.type === 'ready') {
        setRealtimeStatus('Pemindaian realtime berjalan...');
        const intervalMs = 1000 / message.frame_rate;
        realtimeIntervalRef.current = window.setInterval(async () => {
          if (
            !realtimeActiveRef.current
            || realtimeFrameInFlightRef.current
            || socket.readyState !== WebSocket.OPEN
          ) {
            return;
          }

          const videoElement = webcamRef.current?.video;
          if (
            !videoElement
            || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            return;
          }

          realtimeFrameInFlightRef.current = true;
          const scale = Math.min(
            1,
            640 / Math.max(videoElement.videoWidth, videoElement.videoHeight),
          );
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(videoElement.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(videoElement.videoHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            realtimeFrameInFlightRef.current = false;
            setRealtimeStatus('Browser tidak dapat menyiapkan frame kamera.');
            return;
          }
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (
                !blob
                || !realtimeActiveRef.current
                || socket.readyState !== WebSocket.OPEN
              ) {
                realtimeFrameInFlightRef.current = false;
                return;
              }
              try {
                socket.send(blob);
              } catch {
                realtimeFrameInFlightRef.current = false;
                setRealtimeStatus('Frame kamera gagal dikirim ke server.');
              }
            },
            'image/jpeg',
            0.9,
          );
        }, intervalMs);
        return;
      }

      if (message.type === 'skipped') {
        realtimeFrameInFlightRef.current = false;
        setRealtimeStatus('Frame dilewati agar antrean pemrosesan tidak menumpuk.');
        return;
      }

      if (message.type === 'prediction') {
        realtimeFrameInFlightRef.current = false;
        setRealtimeFramesSeen(message.frames_seen);
        setRealtimeFrameSize({
          width: message.frame_width,
          height: message.frame_height,
        });
        setRealtimePrediction(message.prediction);
        if (message.stable_result) {
          setRealtimeStableResult(message.stable_result.prediction);
          setRealtimeStatus(
            `Hasil ${message.stable_result.prediction.classification} stabil dan tersimpan; deteksi realtime berlanjut.`,
          );
        } else {
          setRealtimeStatus(
            `Realtime: ${message.prediction.classification} • frame ${message.frames_seen}`,
          );
        }
        return;
      }

      realtimeFrameInFlightRef.current = false;
      if (message.type === 'progress') {
        if (typeof message.frames_seen === 'number') {
          setRealtimeFramesSeen(message.frames_seen);
        }
        setRealtimeStatus(
          `Menganalisis frame ${message.frames_ready}/${message.window_frames}...`,
        );
        return;
      }

      if (message.type === 'result') {
        setDetectionResult(message.data.prediction);
        setRealtimeStatus('Hasil deteksi tersimpan.');
      }
    };
    socket.onerror = () => {
      setRealtimeStatus('Koneksi realtime gagal. Periksa koneksi backend.');
    };
    socket.onclose = (event) => {
      if (realtimeSocketRef.current === socket) {
        realtimeSocketRef.current = null;
      }
      realtimeFrameInFlightRef.current = false;
      if (realtimeIntervalRef.current !== null) {
        window.clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      realtimeActiveRef.current = false;
      setIsRealtimeScanning(false);
      if (event.code !== 1000) {
        setRealtimeStatus(
          event.reason || 'Koneksi realtime terputus sebelum hasil ditemukan.',
        );
      }
    };
  };

  // Tangkap foto dari webcam
  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      stopRealtimeStream();
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        handleSetCapturedImage(imageSrc);
      }
    }
  }, [stopRealtimeStream]);

  // Ganti kamera depan / belakang
  const toggleCamera = () => {
    stopRealtimeStream();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Upload file dari galeri sebagai alternatif
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopRealtimeStream();
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSetCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kirim hasil scan ke halaman Summary (dicegah jika pencahayaan gelap)
  const handleProceedToDetect = async () => {
    if (!capturedImage) return;
    if (lightingAssessment?.isTooDark) {
      setScanErrorMessage('Pencahayaan foto terlalu gelap. Harap cari tempat yang lebih terang dan ambil ulang foto.');
      return;
    }
    setIsScanning(true);
    setScanErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_base64: capturedImage }),
      });
      
      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errorDetail = errorJson?.detail || 'Deteksi daun gagal.';
        setScanErrorMessage(errorDetail);
        console.error('Detection failed', errorDetail);
      } else {
        const json = await response.json();
        setDetectionResult(json.data.prediction);
      }
    } catch (error) {
      console.error('Error during detection:', error);
      setScanErrorMessage('Gagal terhubung ke server backend.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[100dvh] flex justify-center items-center bg-[#ede6d9] p-0 md:p-4">
      <main className="w-full md:max-w-[430px] h-[100dvh] md:h-[min(100dvh-2rem,880px)] bg-gradient-to-b from-[#f9deb7] via-[#fdf5ea] to-[#fffdfa] flex flex-col md:rounded-[36px] md:shadow-2xl relative overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between">
          {/* Modal Tutorial (Muncul Pertama Kali) */}
          {showTutorial && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-5 animate-fade">
              <div className="w-full max-w-[340px] bg-white rounded-[26px] p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.65)] flex flex-col items-center text-center">
                <h2 className="font-['Poppins'] font-bold text-[18px] text-[#2d3138] mb-4">
                  Panduan Scan Daun
                </h2>
                <ul className="text-left text-[13.5px] text-[#4b5563] space-y-4 mb-7 w-full px-1">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#eb8e2d]/20 text-[#eb8e2d] flex items-center justify-center font-bold text-[12px]">1</span>
                    <span className="leading-snug">Posisikan daun tomat dengan jelas di tengah kamera.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#eb8e2d]/20 text-[#eb8e2d] flex items-center justify-center font-bold text-[12px]">2</span>
                    <span className="leading-snug">Pastikan pencahayaan cukup terang dan stabil.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#eb8e2d]/20 text-[#eb8e2d] flex items-center justify-center font-bold text-[12px]">3</span>
                    <span className="leading-snug">Tekan tombol foto untuk memulai deteksi penyakit.</span>
                  </li>
                </ul>
                <button
                  onClick={() => {
                    setShowTutorial(false);
                  }}
                  className="w-full py-3 rounded-[18px] bg-[#eb8e2d] hover:bg-[#d68026] text-white font-bold text-[14.5px] shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </div>
          )}

          {/* Modal Minta Izin Kamera (Muncul Setelah Tutorial Jika Belum Diizinkan) */}
          {!showTutorial && !hasAgreedPermission && (
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
                  onClick={() => {
                    setHasAgreedPermission(true);
                    sessionStorage.setItem('camera_permission_granted', 'true');
                  }}
                  className="w-full py-3 px-3 rounded-[18px] bg-[#788944] hover:bg-[#879b4d] active:scale-95 text-white font-bold text-[14.5px] shadow-md transition-all cursor-pointer"
                >
                  Izinkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Hasil Deteksi */}
        {detectionResult && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-5 animate-fade">
          <div className="w-full max-w-[340px] bg-white rounded-[26px] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.65)] flex flex-col items-center text-center border-2 border-[#eb8e2d]">
            <h2 className="font-['Poppins'] font-black text-[20px] text-[#22252a] tracking-wide mb-3 uppercase leading-snug">
              Hasil Deteksi
            </h2>
            <div className="w-full bg-gray-50 rounded-[16px] p-4 mb-5 flex flex-col gap-3 shadow-inner">
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-gray-500 font-medium">Klasifikasi</span>
                <span className={`font-bold uppercase ${detectionResult.classification === 'healthy' ? 'text-[#788944]' : 'text-[#d43939]'}`}>
                  {detectionResult.classification === 'healthy' ? 'Sehat' : detectionResult.classification === 'early_blight' ? 'Bercak Kering' : 'Tidak Diketahui'}
                </span>
              </div>
              {detectionResult.classification === 'early_blight' && (
                <div className="flex justify-between items-center text-[13.5px]">
                  <span className="text-gray-500 font-medium">Keparahan</span>
                  <span className="font-bold text-[#d43939] uppercase">
                    {detectionResult.severity_level}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-gray-500 font-medium">Kepercayaan</span>
                <span className="font-bold text-[#34363a]">
                  {detectionResult.confidence_pct}%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDetectionResult(null);
                handleTabClick('summary');
              }}
              className="w-full py-3 px-3 rounded-[18px] bg-gradient-to-r from-[#e58e26] to-[#d47b19] hover:brightness-110 active:scale-95 text-white font-bold text-[14.5px] shadow-[0_8px_20px_rgba(224,137,40,0.45)] transition-all cursor-pointer"
            >
              Lanjutkan ke Summary
            </button>
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
              <div className="w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-black mb-3 relative shadow-inner">
                <img
                  src={capturedImage}
                  alt="Foto Daun Terdeteksi"
                  className="w-full h-full object-cover"
                />

                {/* Badge Status Pencahayaan di Atas Foto */}
                {lightingAssessment?.isChecking ? (
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin"></span>
                    Mengevaluasi Cahaya...
                  </div>
                ) : lightingAssessment?.isTooDark ? (
                  <div className="absolute top-2.5 left-2.5 bg-[#b91c1c]/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md border border-red-300/30">
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                    ⚠️ Terlalu Gelap ({lightingAssessment.brightness}/255)
                  </div>
                ) : lightingAssessment?.isTooBright ? (
                  <div className="absolute top-2.5 left-2.5 bg-amber-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md border border-amber-300/30">
                    <span className="w-2 h-2 rounded-full bg-yellow-200"></span>
                    ⚠️ Terlalu Silau ({lightingAssessment.brightness}/255)
                  </div>
                ) : (
                  <div className="absolute top-2.5 left-2.5 bg-emerald-700/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    ✓ Pencahayaan Baik
                  </div>
                )}
              </div>

              {/* Banner Peringatan "Cari Tempat Terang" jika Terlalu Gelap */}
              {lightingAssessment && lightingAssessment.isTooDark && (
                <div className="w-full bg-[#2a1313]/90 border border-red-400/50 rounded-[18px] p-3 mb-3 text-left flex items-start gap-2.5 shadow-lg animate-fade">
                  <div className="w-7 h-7 rounded-full bg-red-500/25 text-red-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-bold text-[#fca5a5] leading-snug">
                      Pencahayaan Kurang Optimal
                    </p>
                    <p className="text-[11.5px] text-white/85 leading-snug mt-0.5">
                      Foto terlalu gelap untuk AI. Silakan <strong>cari tempat terang</strong> dan ambil ulang foto agar hasil diagnosis akurat.
                    </p>
                  </div>
                </div>
              )}

              {/* Banner Peringatan jika Terlalu Silau */}
              {lightingAssessment && lightingAssessment.isTooBright && (
                <div className="w-full bg-[#2a1d13]/90 border border-amber-400/50 rounded-[18px] p-3 mb-3 text-left flex items-start gap-2.5 shadow-lg animate-fade">
                  <div className="w-7 h-7 rounded-full bg-amber-500/25 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-bold text-[#fde047] leading-snug">
                      Pencahayaan Terlalu Silau
                    </p>
                    <p className="text-[11.5px] text-white/85 leading-snug mt-0.5">
                      Silakan hindari pantulan cahaya langsung dan ambil ulang foto di tempat teduh.
                    </p>
                  </div>
                </div>
              )}

              {/* Error dari Backend jika ada */}
              {scanErrorMessage && (
                <div className="w-full bg-[#3a1414]/90 border border-red-500/70 rounded-[16px] p-2.5 mb-2.5 text-center text-red-200 text-[11.5px] shadow-sm">
                  {scanErrorMessage}
                </div>
              )}

              <div className="w-full flex flex-col gap-2.5">
                {/* Tombol Periksa Kondisi Daun (Terkunci jika terlalu gelap) */}
                <button
                  type="button"
                  onClick={handleProceedToDetect}
                  disabled={isScanning || lightingAssessment?.isChecking || lightingAssessment?.isTooDark}
                  className={`w-full py-3 px-4 rounded-[20px] font-bold text-[14.5px] transition-all flex items-center justify-center gap-2 ${
                    lightingAssessment?.isTooDark
                      ? 'bg-black/25 text-white/40 cursor-not-allowed border border-white/10 shadow-none'
                      : 'bg-gradient-to-r from-[#e58e26] to-[#d47b19] text-white shadow-[0_8px_20px_rgba(224,137,40,0.45)] hover:brightness-110 active:scale-95 cursor-pointer'
                  }`}
                  title={lightingAssessment?.isTooDark ? 'Pencahayaan kurang: cari tempat terang dahulu' : 'Kirim foto ke AI'}
                >
                  {isScanning ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menganalisis Daun...</span>
                    </>
                  ) : lightingAssessment?.isTooDark ? (
                    <>
                      <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Terkunci (Cari Tempat Terang)</span>
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

                {/* Tombol Ambil Ulang Foto (Menjadi tombol utama mencolok jika foto terlalu gelap) */}
                <button
                  type="button"
                  onClick={() => handleSetCapturedImage(null)}
                  disabled={isScanning}
                  className={`w-full py-2.5 px-4 rounded-[20px] font-semibold text-[13.5px] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    lightingAssessment?.isTooDark
                      ? 'bg-[#eb8e2d] hover:bg-[#d68026] text-white shadow-md font-bold'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{lightingAssessment?.isTooDark ? 'Ambil Ulang di Tempat Terang' : 'Ambil Ulang Foto'}</span>
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

                {/* Real-time Live Lighting Warning Banner */}
                {liveIsTooDark && (
                  <div className="absolute top-11 inset-x-3 flex justify-center pointer-events-none z-20 animate-fade">
                    <div className="bg-[#b91c1c]/90 backdrop-blur-md text-white text-[11.5px] px-3.5 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-2 border border-red-300/40">
                      <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
                      <span>⚠️ Cahaya Terlalu Redup, Cari Tempat Terang</span>
                    </div>
                  </div>
                 )}
                {isRealtimeScanning && realtimePrediction && (
                  <svg
                    className="absolute inset-0 h-full w-full pointer-events-none"
                    viewBox={`0 0 ${realtimeFrameSize.width} ${realtimeFrameSize.height}`}
                    preserveAspectRatio="xMidYMid slice"
                    role="img"
                    aria-label="Bounding box deteksi realtime"
                  >
                    {realtimePrediction.boxes.map((box: any, index: number) => {
                      const color = box.classification === 'early_blight'
                        ? '#ef4444'
                        : box.classification === 'healthy'
                          ? '#22c55e'
                          : '#f59e0b';
                      const labelY = Math.max(18, box.y1 - 6);
                      return (
                        <g key={`${index}-${box.x1}-${box.y1}`}>
                          <rect
                            x={box.x1}
                            y={box.y1}
                            width={Math.max(0, box.x2 - box.x1)}
                            height={Math.max(0, box.y2 - box.y1)}
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                          />
                          <text
                            x={box.x1}
                            y={labelY}
                            fill={color}
                            stroke="#111827"
                            strokeWidth="0.8"
                            paintOrder="stroke"
                            fontSize="16"
                            fontWeight="700"
                          >
                            {`${box.classification} ${box.confidence_pct.toFixed(1)}%`}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
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
                      onClick={() => {
                        stopRealtimeStream();
                        fileInputRef.current?.click();
                      }}
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
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-15 h-15 rounded-full border-4 border-[#eb8e2d] bg-white shadow-[0_4px_16px_rgba(235,142,45,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-90 cursor-pointer group"
                  aria-label="Ambil foto"
                >
                  <div className="w-10 h-10 rounded-full bg-[#eb8e2d] group-active:scale-90 transition-transform" />
                </button> 

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

              <div className="w-full max-w-[350px] mt-4 text-center">
                <button
                  type="button"
                  onClick={
                    isRealtimeScanning
                      ? () => {
                          stopRealtimeStream();
                          setRealtimeStatus('Scan realtime dihentikan.');
                        }
                      : startRealtimeStream
                  }
                  disabled={hasPermission !== true}
                  className={`w-full py-3 px-4 rounded-[18px] text-white font-bold text-[14px] shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRealtimeScanning
                      ? 'bg-[#752c2c] hover:bg-[#853434]'
                      : 'bg-[#788944] hover:bg-[#68783b]'
                  }`}
                >
                  {isRealtimeScanning
                    ? 'Hentikan Scan Realtime'
                    : 'Mulai Scan Realtime'}
                </button>
                {realtimeStatus && (
                  <p className="mt-2 text-[12px] text-[#4b5563]" role="status">
                    {realtimeStatus}
                  </p>
                )}
                {realtimeStableResult && (
                  <p className="mt-1 text-[11px] font-semibold text-[#52652f]">
                    Tersimpan: {realtimeStableResult.classification}
                  </p>
                )}
                {isRealtimeScanning && (
                  <p className="mt-1 text-[11px] text-[#6b7280]">
                    Frame terkirim: {realtimeFramesSeen}
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <nav
          className="bg-[#34363a] rounded-t-[28px] pt-4 px-6 pb-[calc(16px+env(safe-area-inset-bottom,0px))] md:pb-5 flex justify-around items-center shadow-[0_-4px_18px_rgba(0,0,0,0.18)] flex-shrink-0 w-full z-30"
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
