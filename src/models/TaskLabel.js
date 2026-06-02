import mongoose from 'mongoose';

const taskLabelSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, index: true },
    labelId: { type: String, required: true, index: true }
  },
  { timestamps: false }
);

taskLabelSchema.index({ taskId: 1, labelId: 1 }, { unique: true });

export default mongoose.models.TaskLabel || mongoose.model('TaskLabel', taskLabelSchema);
