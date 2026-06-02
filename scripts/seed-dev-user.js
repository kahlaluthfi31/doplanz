import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import { createUUID } from '../src/models/utils.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todo_db';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    try {
      await mongoose.connection.db.collection('users').dropIndex('userId_1');
    } catch (error) {
      if (error?.codeName !== 'IndexNotFound') {
        console.warn('Index cleanup warning:', error.message);
      }
    }

  const email = 'kahla@demo.com';
  const password = 'Dev12345!';

    const existing = await User.findOne({ email });
    const passwordHash = await bcrypt.hash(password, 10);
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.fullName = existing.fullName || 'Kahla Luthfiyah';
      existing.phone = existing.phone || '081234567890';
      existing.isVerified = true;
      await existing.save();
      console.log('Demo user updated:', email, 'password:', password);
      return;
    }

    await User.create({
      _id: createUUID(),
      fullName: 'Kahla Luthfiyah',
      email,
      passwordHash,
      phone: '081234567890',
      isVerified: true
    });

    console.log('Demo user created:', email, 'password:', password);
  } catch (error) {
    console.error('Seed error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
