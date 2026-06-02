import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import UserSettings from '@/models/UserSettings';

const resolveArchiveDays = async (userId, body) => {
  if (body?.days !== undefined) {
    return Number(body.days);
  }
  const settings = await UserSettings.findOne({ userId }).lean();
  return Number(settings?.autoArchiveDays ?? 0);
};

export async function POST(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const days = await resolveArchiveDays(userId, body);
    if (!days || days <= 0) {
      return NextResponse.json({ archivedCount: 0, skipped: true });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await Task.updateMany(
      {
        userId,
        deletedAt: null,
        dueDate: { $lte: cutoff },
        status: { $ne: 'completed' }
      },
      { $set: { deletedAt: new Date() } }
    );

    return NextResponse.json({ archivedCount: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Archive tasks error:', error);
    return NextResponse.json({ message: 'Gagal mengarsipkan tugas.', error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await Task.find({ userId, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .lean();

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Archive list error:', error);
    return NextResponse.json({ message: 'Gagal memuat arsip.', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const result = await Task.deleteMany({ userId, deletedAt: { $ne: null } });
    return NextResponse.json({ deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('Clear archive error:', error);
    return NextResponse.json({ message: 'Gagal menghapus arsip.', error: error.message }, { status: 500 });
  }
}
