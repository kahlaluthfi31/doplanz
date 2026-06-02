import mongoose from 'mongoose';

export const createUUID = () =>
  globalThis.crypto?.randomUUID?.() || new mongoose.Types.ObjectId().toString();
