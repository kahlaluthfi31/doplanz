import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const labelSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    color: { type: String, required: true }
  },
  { timestamps: false }
);

export default mongoose.models.Label || mongoose.model('Label', labelSchema);
