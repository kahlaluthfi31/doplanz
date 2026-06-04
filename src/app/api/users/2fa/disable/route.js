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
    await connectDB();
    const settings = await UserSettings.findOne({ userId });

    if (!settings?.twoFactorEnabled) {
      return NextResponse.json({ message: '2FA tidak aktif.' }, { status: 400 });
    }

    if (settings.twoFactorSecret) {
      const valid = await verifyTotpCode(settings.twoFactorSecret, code);
      if (!valid) {
        return NextResponse.json({ message: 'Kode TOTP salah.' }, { status: 400 });
      }
    }

    settings.twoFactorEnabled = false;
    settings.twoFactorSecret = null;
    await settings.save();

    return NextResponse.json({ message: '2FA dinonaktifkan.', twoFactorEnabled: false });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ message: 'Gagal menonaktifkan 2FA.' }, { status: 500 });
  }
}
