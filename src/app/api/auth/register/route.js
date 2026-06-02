import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { serializeUser } from '@/lib/auth';
import User from '@/models/User';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

  const { fullName, email, password, phone } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: 'Nama lengkap, email, dan password wajib diisi.' }, { status: 400 });
    }

    const existing = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (existing) {
      if (existing.googleId && !existing.passwordHash) {
        return NextResponse.json(
          {
            message: 'Email sudah terdaftar dengan Google. Silakan masuk dengan Google.',
            useGoogle: true
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ message: 'Email sudah terdaftar.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      authProvider: 'local'
    });

    return NextResponse.json(serializeUser(user), { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Gagal registrasi.', error: error.message }, { status: 500 });
  }
}
