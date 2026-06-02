import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    groupId: { type: String, default: null },
    parentTaskId: { type: String, default: null },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    dueDate: { type: Date, default: null },
    dueTime: { type: String, default: null },
    isAllDay: { type: Boolean, default: true },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: { type: Object, default: null },
    estimatedMinutes: { type: Number, default: null },
    actualMinutes: { type: Number, default: null },
    sortOrder: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
