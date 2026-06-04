import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { serializeUser } from '@/lib/auth';
import { clearPendingAuth, isPendingAuthValid, verifyTotpCode } from '@/lib/two-factor';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';

export async function POST(req) {
  try {
    await connectDB();
    const { email, code, pendingToken } = await req.json();

    if (!email || !code || !pendingToken) {
      return NextResponse.json({ message: 'Email, kode TOTP, dan sesi verifikasi wajib diisi.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) {
      return NextResponse.json({ message: 'Verifikasi gagal.' }, { status: 401 });
    }

    const settings = await UserSettings.findOne({ userId: user._id });
    if (!settings?.twoFactorEnabled || !settings.twoFactorSecret) {
      return NextResponse.json({ message: 'TOTP tidak aktif untuk akun ini.' }, { status: 400 });
    }

    if (!isPendingAuthValid(settings, pendingToken)) {
      return NextResponse.json({ message: 'Sesi verifikasi kedaluwarsa. Silakan login ulang.' }, { status: 401 });
    }

    const validTotp = await verifyTotpCode(settings.twoFactorSecret, code);
    if (!validTotp) {
      return NextResponse.json({ message: 'Kode TOTP salah.' }, { status: 401 });
    }

    await clearPendingAuth(settings);

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Verify 2FA login error:', error);
    return NextResponse.json({ message: 'Gagal verifikasi TOTP.' }, { status: 500 });
  }
}
