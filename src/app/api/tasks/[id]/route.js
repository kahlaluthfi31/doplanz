import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';

export async function PATCH(req, { params }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  await connectDB();

  const { id } = await params;

  if (body.status === 'completed') {
    body.completedAt = body.completedAt || new Date();
  } else if (body.status) {
    body.completedAt = null;
  }

  const updated = await Task.findOneAndUpdate(
    { _id: id, userId },
    { $set: body },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return NextResponse.json({ message: 'Task tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const deleted = await Task.findOneAndUpdate(
    { _id: id, userId },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );

  if (!deleted) {
    return NextResponse.json({ message: 'Task tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Deleted' });
}
