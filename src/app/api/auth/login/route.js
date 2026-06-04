import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { serializeUser } from '@/lib/auth';
import { issuePendingAuth } from '@/lib/two-factor';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import { createUUID } from '@/models/utils';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) {
      return NextResponse.json({ message: 'Email atau password salah.' }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          message: 'Akun ini terdaftar dengan Google. Silakan masuk dengan Google.',
          useGoogle: true
        },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: 'Email atau password salah.' }, { status: 401 });
    }

    let settings = await UserSettings.findOne({ userId: user._id });
    if (!settings) {
      settings = new UserSettings({ _id: createUUID(), userId: user._id });
    }

    if (settings.twoFactorEnabled && settings.twoFactorSecret) {
      const pendingToken = await issuePendingAuth(settings);
      return NextResponse.json({
        requiresTwoFactor: true,
        email: user.email,
        pendingToken,
        message: 'Masukkan kode TOTP dari aplikasi autentikator Anda.'
      });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Gagal login.', error: error.message }, { status: 500 });
  }
}
