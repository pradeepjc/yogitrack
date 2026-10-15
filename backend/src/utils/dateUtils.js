const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayOfWeekFromDate(date) {
  return DAYS[date.getDay()];
}

function isValidTimeString(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function partsInZone(date, timeZone, options) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, ...options }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

// Day, minutes past midnight and calendar date of `date` as seen in `timeZone`.
function zonedParts(date, timeZone) {
  const p = partsInZone(date, timeZone, {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return {
    dayOfWeek: p.weekday,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    dateKey: `${p.year}-${p.month}-${p.day}`,
  };
}

// dd/mm/yy and hh:mm am/pm in `timeZone`, as used in check-in messages.
function formatDateTime12h(date, timeZone) {
  const p = partsInZone(date, timeZone, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { date: `${p.day}/${p.month}/${p.year}`, time: `${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}` };
}

module.exports = {
  DAYS,
  dayOfWeekFromDate,
  isValidTimeString,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  zonedParts,
  formatDateTime12h,
};
