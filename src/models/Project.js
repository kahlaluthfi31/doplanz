import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    groupId: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null },
    color: { type: String, default: null },
    icon: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active'
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    deadline: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
