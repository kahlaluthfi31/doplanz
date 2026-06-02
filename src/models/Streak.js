import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const streakSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    tasksCompleted: { type: Number, default: 0 },
    tasksTotal: { type: Number, default: 0 },
    isStreakBroken: { type: Boolean, default: false }
  },
  { timestamps: false }
);

streakSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Streak || mongoose.model('Streak', streakSchema);
