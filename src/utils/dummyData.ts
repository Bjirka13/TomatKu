export interface DailyRecord {
  dayName: string;
  dateStr: string;
  fullDateStr: string;
  totalScan: number;
  healthyPercent: number;
  earlyBlightPercent: number;
  unknownPercent: number;
  needleAngle: number;
}

export const INDONESIAN_DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format date to YYYY-MM-DD for HTML input[type="date"]
 */
export function toISODateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a Date object safely in local time
 */
export function parseISODateString(isoStr: string): Date {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generate a deterministic pseudo-random integer seed from a string (e.g. date '2024-10-28')
 */
function hashDateString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate dynamic yet consistent dummy data for any specific date
 */
export function getStatsForDate(dateInput: Date | string): DailyRecord {
  const dateObj = typeof dateInput === 'string' ? parseISODateString(dateInput) : dateInput;
  const isoStr = toISODateString(dateObj);
  const seed = hashDateString(isoStr);

  const dayName = INDONESIAN_DAYS[dateObj.getDay()];
  const yy = String(dateObj.getFullYear()).slice(-2);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${dd}/${mm}/${yy}`;
  const fullDateStr = `${dateObj.getDate()} ${INDONESIAN_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  // Variation in total scans for a single day: 25 - 69 scans
  const totalScan = 25 + (seed % 45);

  // Unknown percentage: 5% - 12%
  const unknownPercent = 5 + (seed % 8);
  const remaining = 100 - unknownPercent;

  // Healthy percentage: 50% - 80% of remaining
  const healthyRatio = 0.52 + ((seed % 32) / 100);
  const healthyPercent = Math.round(remaining * healthyRatio);
  const earlyBlightPercent = remaining - healthyPercent;

  // Needle angle calculation:
  // -75 deg = Parah (severe blight), +72 deg = Normal (healthy)
  const healthDiff = (healthyPercent - earlyBlightPercent) / 100; // range roughly -0.2 to +0.65
  const baseAngle = healthDiff * 115;
  const angleJitter = (seed % 9) - 4;
  const needleAngle = Math.max(-75, Math.min(75, Math.round(baseAngle + angleJitter)));

  return {
    dayName,
    dateStr,
    fullDateStr,
    totalScan,
    healthyPercent,
    earlyBlightPercent,
    unknownPercent,
    needleAngle,
  };
}

/**
 * Generate dummy data for period (hari, minggu, bulan, or custom date)
 */
export function getPeriodStats(
  period: 'hari' | 'minggu' | 'bulan' | 'custom',
  customDate?: Date | string
): {
  totalScan: number;
  healthyPercent: number;
  earlyBlightPercent: number;
  unknownPercent: number;
  needleAngle: number;
  label: string;
} {
  if (period === 'minggu') {
    return {
      totalScan: 248,
      healthyPercent: 65,
      earlyBlightPercent: 25,
      unknownPercent: 10,
      needleAngle: 65,
      label: 'Minggu ini',
    };
  }

  if (period === 'bulan') {
    return {
      totalScan: 890,
      healthyPercent: 55,
      earlyBlightPercent: 35,
      unknownPercent: 10,
      needleAngle: 45,
      label: 'Bulan ini',
    };
  }

  // 'hari' or 'custom'
  const dateToUse = period === 'custom' && customDate ? customDate : new Date();
  const dayStats = getStatsForDate(dateToUse);

  return {
    totalScan: dayStats.totalScan,
    healthyPercent: dayStats.healthyPercent,
    earlyBlightPercent: dayStats.earlyBlightPercent,
    unknownPercent: dayStats.unknownPercent,
    needleAngle: dayStats.needleAngle,
    label: period === 'custom' ? dayStats.fullDateStr : 'Hari ini',
  };
}
