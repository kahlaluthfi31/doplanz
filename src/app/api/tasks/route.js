import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import Reminder from '@/models/Reminder';
import UserSettings from '@/models/UserSettings';

const buildReminderDate = ({ dueDate, dueTime, isAllDay }) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (!Number.isNaN(date.getTime())) {
    if (!isAllDay && dueTime) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      if (!Number.isNaN(hours)) {
        date.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
      }
    } else {
      date.setHours(9, 0, 0, 0);
    }
    return date;
  }
  return null;
};

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  if (!body?.title?.trim()) {
    return NextResponse.json({ message: 'Title is required' }, { status: 400 });
  }

  await connectDB();

  const task = await Task.create({
    userId,
    title: body.title.trim(),
    description: body.description || null,
    groupId: body.groupId || null,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    dueTime: body.dueTime || null,
    isAllDay: body.isAllDay ?? true,
    priority: body.priority || 'medium',
    estimatedMinutes: body.estimatedMinutes ?? null,
    status: 'pending'
  });

  await ActivityLog.create({
    userId,
    taskId: task._id,
    action: 'Created Task',
    newValue: {
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime
    },
    description: `Task "${task.title}" dibuat.`
  });

  let reminderMinutes = null;
  if (body.hasCustomReminder === true && body.reminderMinutes != null) {
    reminderMinutes = Number(body.reminderMinutes);
  } else if (body.skipReminder !== true && task.dueDate) {
    const userSettings = await UserSettings.findOne({ userId });
    reminderMinutes = userSettings?.reminderDefault ?? 15;
  }

  if (reminderMinutes > 0 && task.dueDate) {
    const baseDate = buildReminderDate({
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      isAllDay: task.isAllDay
    });
    if (baseDate) {
      const remindAt = new Date(baseDate.getTime() - reminderMinutes * 60000);
      await Reminder.create({
        taskId: task._id,
        remindAt,
        type: 'push'
      });
    }
  }

  return NextResponse.json(task, { status: 201 });
}

export async function GET(req) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  const query = { userId, deletedAt: null };
  if (groupId) {
    query.groupId = groupId;
  }
  const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json(tasks);
}
