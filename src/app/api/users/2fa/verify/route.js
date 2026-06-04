import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyTotpCode } from '@/lib/two-factor';
import UserSettings from '@/models/UserSettings';

export async function POST(req) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ message: 'Kode verifikasi wajib diisi.' }, { status: 400 });
    }

    await connectDB();
    const settings = await UserSettings.findOne({ userId });
    if (!settings?.twoFactorSecret) {
      return NextResponse.json({ message: 'Setup 2FA belum dilakukan.' }, { status: 400 });
    }

    const valid = await verifyTotpCode(settings.twoFactorSecret, code);
    if (!valid) {
      return NextResponse.json({ message: 'Kode TOTP salah.' }, { status: 400 });
    }

    settings.twoFactorEnabled = true;
    await settings.save();

    return NextResponse.json({ message: '2FA berhasil diaktifkan.', twoFactorEnabled: true });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ message: 'Gagal memverifikasi 2FA.' }, { status: 500 });
  }
}
