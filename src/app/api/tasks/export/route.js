import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import TaskGroup from '@/models/TaskGroup';
import Reminder from '@/models/Reminder';

const escapeCsv = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const statusLabel = (status) => {
  const map = {
    pending: 'Todo',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return map[status] || status;
};

export async function GET(req) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    await connectDB();

    const [tasks, groups] = await Promise.all([
      Task.find({ userId, deletedAt: null }).sort({ createdAt: -1 }).lean(),
      TaskGroup.find({ userId }).lean()
    ]);

    const groupMap = new Map(groups.map((g) => [g._id, g.name]));
    const taskIds = tasks.map((t) => t._id);
    const reminders = await Reminder.find({ taskId: { $in: taskIds } }).lean();
    const reminderMap = new Map(reminders.map((r) => [r.taskId, r]));

    const rows = tasks.map((task) => {
      const reminder = reminderMap.get(task._id);
      return {
        id: task._id,
        title: task.title,
        description: task.description || '',
        group: groupMap.get(task.groupId) || '',
        status: statusLabel(task.status),
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
        dueTime: task.dueTime || '',
        isAllDay: task.isAllDay,
        reminderAt: reminder?.remindAt ? new Date(reminder.remindAt).toISOString() : '',
        completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : '',
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : '',
        updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : ''
      };
    });

    const exportedAt = new Date().toISOString();
    const payload = {
      exportedAt,
      userId,
      totalTasks: rows.length,
      tasks: rows
    };

    if (format === 'csv') {
      const headers = [
        'ID',
        'Title',
        'Description',
        'Group',
        'Status',
        'Priority',
        'Due Date',
        'Due Time',
        'All Day',
        'Reminder At',
        'Completed At',
        'Created At',
        'Updated At'
      ];
      const csvRows = rows.map((row) =>
        [
          row.id,
          row.title,
          row.description,
          row.group,
          row.status,
          row.priority,
          row.dueDate,
          row.dueTime,
          row.isAllDay ? 'Yes' : 'No',
          row.reminderAt,
          row.completedAt,
          row.createdAt,
          row.updatedAt
        ]
          .map(escapeCsv)
          .join(',')
      );
      const csv = [headers.join(','), ...csvRows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="doplanz_tasks_${exportedAt.slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json(payload, {
      headers: {
        'Content-Disposition': `attachment; filename="doplanz_tasks_${exportedAt.slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    console.error('Export tasks error:', error);
    return NextResponse.json({ message: 'Gagal mengekspor data.' }, { status: 500 });
  }
}
