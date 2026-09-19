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

module.exports = {
  DAYS,
  dayOfWeekFromDate,
  isValidTimeString,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
};
