import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true, index: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    language: { type: String, default: 'id' },
  defaultView: { type: String, enum: ['today', 'calendar'], default: 'today' },
    weekStartsOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    notifyPush: { type: Boolean, default: true },
    notifyEmail: { type: Boolean, default: false },
    notifySound: { type: Boolean, default: true },
    reminderDefault: { type: Number, default: 15 },
    autoArchiveDays: { type: Number, default: 0 },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
