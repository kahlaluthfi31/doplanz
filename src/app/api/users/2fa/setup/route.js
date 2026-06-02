import { NextResponse } from 'next/server';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { connectDB } from '@/lib/db';
import UserSettings from '@/models/UserSettings';
import User from '@/models/User';
import { createUUID } from '@/models/utils';

export async function POST(req) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

  const secret = generateSecret();
    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = new UserSettings({
        _id: createUUID ? createUUID() : Math.random().toString(36).substring(2, 15),
        userId
      });
    }

    settings.twoFactorSecret = secret;
    settings.twoFactorEnabled = false;
    await settings.save();

    const issuer = 'doplanZ';
  const otpauth = generateURI({ issuer, label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({
      secret,
      qrCodeDataUrl,
      otpauth
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ message: 'Gagal menyiapkan 2FA.' }, { status: 500 });
  }
}
