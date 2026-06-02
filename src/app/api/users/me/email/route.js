import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function PUT(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email baru wajib diisi.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Format email tidak valid.' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    // Check if email already in use
    const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
    if (emailExists) {
      return NextResponse.json({ message: 'Email sudah digunakan oleh akun lain.' }, { status: 400 });
    }

    user.email = email.toLowerCase();
    user.isVerified = true; // Instantly verify for simplicity of the prototype, or we can toggle verification
    await user.save();

    return NextResponse.json({
      message: 'Email berhasil diperbarui.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    console.error('PUT email error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui email.', error: error.message }, { status: 500 });
  }
}
