import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { verifyTotpCode } from '@/lib/two-factor';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { email, totpCode, newPassword } = body;

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

    const settings = await UserSettings.findOne({ userId: user._id });

    if (settings?.twoFactorEnabled && settings.twoFactorSecret) {
      if (!totpCode || !newPassword) {
        return NextResponse.json({
          requiresTwoFactor: true,
          email: user.email,
          message: 'Masukkan kode TOTP dari aplikasi autentikator dan password baru Anda.'
        });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ message: 'Password minimal 6 karakter.' }, { status: 400 });
      }

      const validTotp = await verifyTotpCode(settings.twoFactorSecret, totpCode);
      if (!validTotp) {
        return NextResponse.json({ message: 'Kode TOTP salah.' }, { status: 401 });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return NextResponse.json({
        message: 'Password berhasil direset. Silakan masuk dengan password baru.',
        useGoogle: false,
        resetComplete: true
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
