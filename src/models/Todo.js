import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        category: { type: String, default: 'General' },
        priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
        isCompleted: { type: Boolean, default: false },
        dueDate: { type: Date }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.Todo || mongoose.model('Todo', todoSchema);

// DATABASE SCHEMA, sama kaya di laravel aja