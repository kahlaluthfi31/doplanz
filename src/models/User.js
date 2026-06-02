import mongoose from 'mongoose';
import { createUUID } from './utils.js';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: createUUID },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true, default: null },
    authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
    avatarUrl: { type: String, default: null },
    phone: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

userSchema.pre('validate', function validateAuthMethod(next) {
  if (!this.passwordHash && !this.googleId) {
    next(new Error('User must have a password or Google account.'));
    return;
  }
  next();
});

export default mongoose.models.User || mongoose.model('User', userSchema);
