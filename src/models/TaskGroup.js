import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const taskGroupSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    icon: { type: String, default: null },
    color: { type: String, default: null },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.TaskGroup || mongoose.model('TaskGroup', taskGroupSchema);
