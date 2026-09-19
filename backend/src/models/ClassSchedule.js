const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema(
  {
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      required: true,
    },
    time: { type: String, required: true }, // "HH:mm" 24h, class start time
    durationMinutes: { type: Number, required: true, default: 60, min: 1 },
    classType: { type: String, enum: ['General', 'Special'], required: true },
    payRate: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Not unique: two classes can only be judged conflict-free by comparing
// [time, time+durationMinutes) intervals, which an equality index can't express.
// This index just speeds up the same-day lookups conflict detection performs.
classScheduleSchema.index({ dayOfWeek: 1, isActive: 1 });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
