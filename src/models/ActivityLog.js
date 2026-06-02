import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const activityLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    taskId: { type: String, default: null },
    action: { type: String, required: true, trim: true, maxlength: 50 },
    oldValue: { type: Object, default: null },
    newValue: { type: Object, default: null },
    description: { type: String, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
