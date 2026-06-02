import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: 'Semua kolom password wajib diisi.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: 'Konfirmasi password baru tidak cocok.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password baru minimal 6 karakter.' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          message:
            'Akun Anda menggunakan Google. Atur password dari profil setelah menautkan email, atau gunakan Google untuk masuk.'
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: 'Password lama salah.' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return NextResponse.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('PUT password error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui password.', error: error.message }, { status: 500 });
  }
}
