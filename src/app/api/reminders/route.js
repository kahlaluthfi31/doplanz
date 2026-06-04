import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Reminder from '@/models/Reminder';
import Task from '@/models/Task';

export async function GET(req) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const tasks = await Task.find({
      userId,
      deletedAt: null,
      status: { $ne: 'completed' }
    })
      .select('_id title dueDate dueTime')
      .lean();

    if (!tasks.length) {
      return NextResponse.json([]);
    }

    const taskIds = tasks.map((t) => t._id);
    const taskMap = new Map(tasks.map((t) => [t._id, t]));

    const now = new Date();
    const reminders = await Reminder.find({
      taskId: { $in: taskIds },
      isSent: false,
      remindAt: { $gte: now }
    })
      .sort({ remindAt: 1 })
      .limit(50)
      .lean();

    const items = reminders.map((reminder) => {
      const task = taskMap.get(reminder.taskId);
      return {
        _id: reminder._id,
        taskId: reminder.taskId,
        taskTitle: task?.title || 'Tugas',
        remindAt: reminder.remindAt,
        dueDate: task?.dueDate || null,
        dueTime: task?.dueTime || null
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET reminders error:', error);
    return NextResponse.json({ message: 'Gagal memuat notifikasi.' }, { status: 500 });
  }
}
