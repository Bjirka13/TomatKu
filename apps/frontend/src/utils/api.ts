import { INDONESIAN_DAYS, INDONESIAN_MONTHS, toISODateString } from './dummyData';

export interface ScanRecord {
  scan_id: string;
  detection_id: string | null;
  classification: string | null;
  confidence_pct: number | null;
  image_path: string | null;
  severity_level: string | null;
  severity_pct: number | null;
  detected_at: string | null;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export async function fetchScanHistory(): Promise<ScanRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/history`);
    if (!res.ok) throw new Error('Network error');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Error fetching history:', err);
    return [];
  }
}

export function calculateStats(records: ScanRecord[]): { totalScan: number, healthyPercent: number, earlyBlightPercent: number, needleAngle: number } {
  const totalScan = records.length;
  if (totalScan === 0) {
    return { totalScan: 0, healthyPercent: 0, earlyBlightPercent: 0, needleAngle: 0 };
  }
  
  let healthyCount = 0;
  let earlyBlightCount = 0;
  
  records.forEach(r => {
    if (r.classification === 'healthy') {
      healthyCount++;
    } else if (r.classification === 'early_blight') {
      earlyBlightCount++;
    }
  });

  const healthyPercent = Math.round((healthyCount / totalScan) * 100);
  const earlyBlightPercent = Math.round((earlyBlightCount / totalScan) * 100);
  
  const healthDiff = (healthyPercent - earlyBlightPercent) / 100;
  const needleAngle = Math.max(-75, Math.min(75, Math.round(healthDiff * 75))); 

  return {
    totalScan,
    healthyPercent,
    earlyBlightPercent,
    needleAngle,
  };
}

export async function getStatsForDateReal(dateObj: Date): Promise<any> {
    const history = await fetchScanHistory();
    const targetDate = toISODateString(dateObj);
    const filtered = history.filter(r => {
        if (!r.detected_at) return false;
        const d = new Date(r.detected_at);
        return toISODateString(d) === targetDate;
    });
    
    const stats = calculateStats(filtered);
    
    return {
        ...stats,
        dayName: INDONESIAN_DAYS[dateObj.getDay()],
        dateStr: `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`,
        fullDateStr: `${dateObj.getDate()} ${INDONESIAN_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`
    };
}

export async function getPeriodStatsReal(period: 'hari' | 'minggu' | 'bulan' | 'custom', customDate?: Date): Promise<any> {
    const history = await fetchScanHistory();
    const now = new Date();
    
    let filtered = history;
    let label = '';
    
    if (period === 'hari') {
        const todayStr = toISODateString(now);
        filtered = history.filter(r => r.detected_at && toISODateString(new Date(r.detected_at)) === todayStr);
        label = 'Hari ini';
    } else if (period === 'minggu') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        filtered = history.filter(r => r.detected_at && new Date(r.detected_at) >= sevenDaysAgo);
        label = 'Minggu ini';
    } else if (period === 'bulan') {
        filtered = history.filter(r => {
            if (!r.detected_at) return false;
            const d = new Date(r.detected_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        label = 'Bulan ini';
    } else if (period === 'custom' && customDate) {
        const targetStr = toISODateString(customDate);
        filtered = history.filter(r => r.detected_at && toISODateString(new Date(r.detected_at)) === targetStr);
        label = `${customDate.getDate()} ${INDONESIAN_MONTHS[customDate.getMonth()]} ${customDate.getFullYear()}`;
    }
    
    const stats = calculateStats(filtered);
    return { ...stats, label };
}
