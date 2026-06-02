import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized. x-user-id header is missing.' }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json({ message: 'Gagal memuat profil.', error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, phone, avatarUrl } = body;

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    return NextResponse.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('PUT profile error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui profil.', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ message: 'Password konfirmasi wajib diisi.' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { message: 'Akun Google tidak memerlukan password untuk dihapus. Hubungi dukungan.' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: 'Password konfirmasi salah.' }, { status: 401 });
    }

    // Soft delete or hard delete depending on preference, we can do hard delete or soft delete
    user.deletedAt = new Date();
    await user.save();

    // Or do a hard delete: await User.findByIdAndDelete(userId);
    
    return NextResponse.json({ message: 'Akun berhasil dihapus secara permanen.' });
  } catch (error) {
    console.error('DELETE profile error:', error);
    return NextResponse.json({ message: 'Gagal menghapus akun.', error: error.message }, { status: 500 });
  }
}
