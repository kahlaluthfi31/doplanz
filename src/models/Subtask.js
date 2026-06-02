import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const subtaskSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    taskId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    isCompleted: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.models.Subtask || mongoose.model('Subtask', subtaskSchema);
