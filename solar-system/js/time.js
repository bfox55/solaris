// Simulation clock in Julian days. rate = simulated seconds per real second.
import { dateToJD, jdToDate } from './orbits.js';

export const PRESETS = [
  { label: 'Real', rate: 1 },
  { label: '1 hr/s', rate: 3600 },
  { label: '1 day/s', rate: 86400 },
  { label: '1 wk/s', rate: 604800 },
  { label: '1 mo/s', rate: 2629800 },
  { label: '1 yr/s', rate: 31557600 }
];

export class SimClock {
  constructor() {
    this.jd = dateToJD(new Date());
    this.rate = 86400 * 3;
    this.paused = false;
    this.direction = 1;
  }
  tick(dtSeconds) {
    if (this.paused) return;
    this.jd += (this.direction * this.rate * dtSeconds) / 86400;
  }
  setNow() { this.jd = dateToJD(new Date()); }
  get date() { return jdToDate(this.jd); }
  get signedRate() { return this.rate * this.direction; }
}

const UNITS = [
  ['year', 31557600], ['month', 2629800], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]
];

export function formatRate(rate) {
  if (rate === 1) return 'Real time';
  for (const [name, secs] of UNITS) {
    const v = rate / secs;
    if (v >= 1) {
      const str = v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/\.?0+$/, '');
      return `${str} ${name}${v >= 1.995 ? 's' : ''} / sec`;
    }
  }
  return `${rate.toFixed(2)} sec / sec`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const TIME_FMT = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });

export function formatDate(date) {
  if (isNaN(date)) return '—';
  const y = date.getUTCFullYear();
  if (y < 1000 || y > 9999) return `${y < 0 ? Math.abs(y) + ' BC' : y}`;
  return DATE_FMT.format(date);
}
export function formatTime(date) {
  if (isNaN(date)) return '';
  return TIME_FMT.format(date) + ' UTC';
}
