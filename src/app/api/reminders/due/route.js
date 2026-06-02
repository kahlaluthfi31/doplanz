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

    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);

    const reminders = await Reminder.find({
      isSent: false,
      remindAt: { $lte: now, $gte: windowStart }
    }).lean();

    if (!reminders.length) {
      return NextResponse.json([]);
    }

    const taskIds = reminders.map((r) => r.taskId);
    const tasks = await Task.find({
      _id: { $in: taskIds },
      userId,
      deletedAt: null,
      status: { $ne: 'completed' }
    }).lean();

    const taskMap = new Map(tasks.map((t) => [t._id, t]));
    const due = [];

    for (const reminder of reminders) {
      const task = taskMap.get(reminder.taskId);
      if (!task) continue;

      await Reminder.updateOne({ _id: reminder._id }, { $set: { isSent: true } });

      due.push({
        _id: reminder._id,
        taskId: task._id,
        taskTitle: task.title,
        remindAt: reminder.remindAt,
        message: `Pengingat: ${task.title}`
      });
    }

    return NextResponse.json(due);
  } catch (error) {
    console.error('GET due reminders error:', error);
    return NextResponse.json({ message: 'Gagal memuat pengingat.' }, { status: 500 });
  }
}
