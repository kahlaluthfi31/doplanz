import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const attachmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    taskId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.models.Attachment || mongoose.model('Attachment', attachmentSchema);
