import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TaskGroup from '@/models/TaskGroup';

export async function GET(req) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const groups = await TaskGroup.find({ userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(groups);
}

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  if (!body?.name?.trim()) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  await connectDB();

  const group = await TaskGroup.create({
    userId,
    name: body.name.trim(),
    icon: body.icon || null,
    color: body.color || null,
    sortOrder: body.sortOrder ?? 0
  });

  return NextResponse.json(group, { status: 201 });
}
