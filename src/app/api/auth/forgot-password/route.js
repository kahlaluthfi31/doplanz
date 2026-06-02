import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email wajib diisi.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });

    if (!user) {
      return NextResponse.json({
        message: 'Jika email terdaftar, instruksi pemulihan akan dikirim.',
        useGoogle: false
      });
    }

    if (user.googleId && !user.passwordHash) {
      return NextResponse.json({
        message: 'Akun ini menggunakan Google. Silakan masuk dengan Google.',
        useGoogle: true
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[forgot-password] Reset link:', resetUrl);
    }

    return NextResponse.json({
      message: 'Jika email terdaftar, cek inbox Anda untuk instruksi reset password.',
      useGoogle: false,
      ...(process.env.NODE_ENV !== 'production' ? { devResetUrl: resetUrl } : {})
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Gagal memproses permintaan.' }, { status: 500 });
  }
}
