import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const dailySummarySchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    pendingTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    totalMinutesSpent: { type: Number, default: 0 }
  },
  { timestamps: false }
);

dailySummarySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailySummary || mongoose.model('DailySummary', dailySummarySchema);
