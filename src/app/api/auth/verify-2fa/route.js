import { NextResponse } from 'next/server';
import { verify } from 'otplib';
import { connectDB } from '@/lib/db';
import { serializeUser } from '@/lib/auth';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';

export async function POST(req) {
  try {
    await connectDB();
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ message: 'Email dan kode 2FA wajib diisi.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) {
      return NextResponse.json({ message: 'Verifikasi gagal.' }, { status: 401 });
    }

    const settings = await UserSettings.findOne({ userId: user._id });
    if (!settings?.twoFactorEnabled || !settings.twoFactorSecret) {
      return NextResponse.json({ message: '2FA tidak aktif untuk akun ini.' }, { status: 400 });
    }

    const result = await verify({ token: String(code).trim(), secret: settings.twoFactorSecret });
    if (!result.valid) {
      return NextResponse.json({ message: 'Kode 2FA salah.' }, { status: 401 });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Verify 2FA login error:', error);
    return NextResponse.json({ message: 'Gagal verifikasi 2FA.' }, { status: 500 });
  }
}
