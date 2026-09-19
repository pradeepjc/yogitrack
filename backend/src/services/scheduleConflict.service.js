const ClassSchedule = require('../models/ClassSchedule');
const { timeToMinutes, intervalsOverlap } = require('../utils/dateUtils');

const DEFAULT_DURATION_MINUTES = 60;

// Weekday order for "same day, then nearby days" ranking.
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Hourly slots covering business hours; adjust as the studio's real hours dictate.
const STUDIO_TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

async function getActiveClasses(excludeClassId) {
  const query = { isActive: true };
  if (excludeClassId) query._id = { $ne: excludeClassId };
  return ClassSchedule.find(query);
}

async function findConflict(dayOfWeek, time, durationMinutes = DEFAULT_DURATION_MINUTES, excludeClassId = null) {
  const newStart = timeToMinutes(time);
  const newEnd = newStart + durationMinutes;

  const query = { dayOfWeek, isActive: true };
  if (excludeClassId) query._id = { $ne: excludeClassId };

  const sameDayClasses = await ClassSchedule.find(query).populate(
    'instructor',
    'instructorId firstName lastName'
  );

  for (const cls of sameDayClasses) {
    const existingStart = timeToMinutes(cls.time);
    const existingEnd = existingStart + cls.durationMinutes;
    if (intervalsOverlap(newStart, newEnd, existingStart, existingEnd)) {
      return cls;
    }
  }
  return null;
}

async function suggestAlternatives(
  dayOfWeek,
  time,
  durationMinutes = DEFAULT_DURATION_MINUTES,
  excludeClassId = null,
  limit = 5
) {
  const activeClasses = await getActiveClasses(excludeClassId);
  const intervalsByDay = Object.fromEntries(DAY_ORDER.map((day) => [day, []]));
  for (const cls of activeClasses) {
    const start = timeToMinutes(cls.time);
    intervalsByDay[cls.dayOfWeek].push({ start, end: start + cls.durationMinutes });
  }

  function isFree(day, slotTime) {
    const start = timeToMinutes(slotTime);
    const end = start + durationMinutes;
    return !intervalsByDay[day].some((iv) => intervalsOverlap(start, end, iv.start, iv.end));
  }

  const requestedMinutes = timeToMinutes(time);

  // Same day, other times - ranked by closeness to the requested time.
  const sameDayCandidates = STUDIO_TIME_SLOTS.filter((slot) => slot !== time && isFree(dayOfWeek, slot))
    .map((slot) => ({ dayOfWeek, time: slot, rank: Math.abs(timeToMinutes(slot) - requestedMinutes) }))
    .sort((a, b) => a.rank - b.rank);

  // Same time, other days.
  const sameTimeCandidates = DAY_ORDER.filter((day) => day !== dayOfWeek && isFree(day, time)).map(
    (day) => ({ dayOfWeek: day, time })
  );

  // Remaining free slots (any day/time not already covered above).
  const remainingCandidates = [];
  for (const day of DAY_ORDER) {
    for (const slot of STUDIO_TIME_SLOTS) {
      if (day === dayOfWeek && slot === time) continue;
      if (day === dayOfWeek || slot === time) continue; // already covered above
      if (isFree(day, slot)) remainingCandidates.push({ dayOfWeek: day, time: slot });
    }
  }

  const all = [...sameDayCandidates, ...sameTimeCandidates, ...remainingCandidates];
  return all.slice(0, limit).map(({ dayOfWeek, time }) => ({ dayOfWeek, time }));
}

module.exports = { findConflict, suggestAlternatives, STUDIO_TIME_SLOTS, DEFAULT_DURATION_MINUTES };
