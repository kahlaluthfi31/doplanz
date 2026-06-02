import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const reminderSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    taskId: { type: String, required: true, index: true },
    remindAt: { type: Date, required: true },
    type: { type: String, enum: ['push', 'email', 'both'], default: 'push' },
    isSent: { type: Boolean, default: false }
  },
  { timestamps: false }
);

export default mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
