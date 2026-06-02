import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import TaskGroup from '@/models/TaskGroup';
import ActivityLog from '@/models/ActivityLog';
import Streak from '@/models/Streak';

const parseDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapActionType = (action = '') => {
  const normalized = action.toLowerCase();
  if (normalized.includes('create')) return 'Created';
  if (normalized.includes('complete')) return 'Completed';
  if (normalized.includes('delete')) return 'Deleted';
  if (normalized.includes('edit') || normalized.includes('update')) return 'Edited';
  return 'Edited';
};

const computeStreakStats = (streaks = []) => {
  let current = 0;
  let longest = 0;
  let running = 0;

  streaks.forEach((entry, index) => {
    const hasCompleted = entry.tasksCompleted > 0;
    if (index === 0) {
      running = hasCompleted ? 1 : 0;
      current = running;
    } else if (hasCompleted) {
      running += 1;
    } else {
      longest = Math.max(longest, running);
      running = 0;
    }
    longest = Math.max(longest, running);
  });

  return { current, longest };
};

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const period = searchParams.get('period') || 'week';

    if (!userId || !startParam || !endParam) {
      return NextResponse.json({ message: 'Missing required parameters.' }, { status: 400 });
    }

    const startDate = parseDate(startParam);
    const endDate = parseDate(endParam);

    if (!startDate || !endDate) {
      return NextResponse.json({ message: 'Invalid date range.' }, { status: 400 });
    }

    const now = new Date();
    const rangeMatch = {
      userId,
      deletedAt: null,
      dueDate: { $gte: startDate, $lte: endDate }
    };

    const [total, completed, pending, overdue] = await Promise.all([
      Task.countDocuments(rangeMatch),
      Task.countDocuments({ ...rangeMatch, status: 'completed' }),
      Task.countDocuments({ ...rangeMatch, status: { $in: ['pending', 'in_progress'] } }),
      Task.countDocuments({
        ...rangeMatch,
        status: { $ne: 'completed' },
        dueDate: { $gte: startDate, $lte: endDate, $lt: now }
      })
    ]);

    const dateFormat = period === 'today' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
    const [createdSeries, completedSeries] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            userId,
            deletedAt: null,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            created: { $sum: 1 }
          }
        }
      ]),
      Task.aggregate([
        {
          $match: {
            userId,
            deletedAt: null,
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$completedAt' } },
            completed: { $sum: 1 }
          }
        }
      ])
    ]);

    const productivityMap = new Map();
    createdSeries.forEach((item) => {
      productivityMap.set(item._id, {
        date: item._id,
        created: item.created,
        completed: 0
      });
    });
    completedSeries.forEach((item) => {
      const existing = productivityMap.get(item._id) || {
        date: item._id,
        created: 0,
        completed: 0
      };
      productivityMap.set(item._id, {
        ...existing,
        completed: item.completed
      });
    });
    const productivity = Array.from(productivityMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const priorities = await Task.aggregate([
      { $match: rangeMatch },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const groups = await TaskGroup.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'tasks',
          let: { groupId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$groupId', '$$groupId'] },
                    { $eq: ['$userId', userId] },
                    { $gte: ['$dueDate', startDate] },
                    { $lte: ['$dueDate', endDate] },
                    { $eq: ['$deletedAt', null] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'taskStats'
        }
      },
      {
        $addFields: {
          count: { $ifNull: [{ $arrayElemAt: ['$taskStats.count', 0] }, 0] }
        }
      },
      { $project: { taskStats: 0 } },
      { $sort: { count: -1 } }
    ]);

    const streaks = await Streak.find({ userId })
      .sort({ date: -1 })
      .limit(21)
      .lean();

    const streakStats = computeStreakStats(streaks);
    const completionRate = streaks.length
      ? Math.round(
          (streaks.reduce((acc, item) => acc + (item.tasksCompleted || 0), 0) /
            streaks.reduce((acc, item) => acc + (item.tasksTotal || 0), 0)) * 100
        )
      : 0;

    const activityLogs = await ActivityLog.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task'
        }
      },
      {
        $addFields: {
          taskTitle: { $arrayElemAt: ['$task.title', 0] },
          type: { $literal: '' }
        }
      },
      { $project: { task: 0 } }
    ]);

    const activityWithTypes = activityLogs.map((log) => ({
      ...log,
      type: mapActionType(log.action)
    }));

    const topDay = await Task.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$completedAt' },
          tasksCompleted: { $sum: 1 }
        }
      },
      { $sort: { tasksCompleted: -1 } },
      { $limit: 1 }
    ]);

    const efficiencyBaseMatch = {
      ...rangeMatch,
      status: 'completed',
      actualMinutes: { $ne: null }
    };

    const avgEfficiency = await Task.aggregate([
      { $match: efficiencyBaseMatch },
      { $group: { _id: null, averageMinutes: { $avg: '$actualMinutes' } } }
    ]);

    const fastest = await Task.find(efficiencyBaseMatch)
      .sort({ actualMinutes: 1 })
      .limit(1)
      .lean();

    const longest = await Task.find(efficiencyBaseMatch)
      .sort({ actualMinutes: -1 })
      .limit(1)
      .lean();

    const ratio = await Task.aggregate([
      {
        $match: {
          ...rangeMatch,
          status: 'completed',
          actualMinutes: { $ne: null },
          estimatedMinutes: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRatio: { $avg: { $divide: ['$actualMinutes', '$estimatedMinutes'] } }
        }
      }
    ]);

    let trend = 'Not enough data';
    if (ratio[0]?.avgRatio) {
      const delta = Math.round(Math.abs(1 - ratio[0].avgRatio) * 100);
      trend = ratio[0].avgRatio < 1
        ? `Estimates are ${delta}% more optimistic`
        : `Estimates are ${delta}% more conservative`;
    }

    return NextResponse.json({
      summary: { total, completed, pending, overdue },
      productivity,
      priorities: priorities.map((item) => ({
        priority: item._id,
        count: item.count
      })),
      groups: groups.map((group) => ({
        id: group._id,
        name: group.name,
        color: group.color,
        count: group.count
      })),
      streaks,
      streakStats: {
        current: streakStats.current,
        longest: streakStats.longest,
        completionRate: Number.isFinite(completionRate) ? completionRate : 0
      },
      activityLogs: activityWithTypes,
      insight: {
        dayOfWeek: topDay[0]?._id ?? null,
        tasksCompleted: topDay[0]?.tasksCompleted ?? 0
      },
      efficiency: {
        averageMinutes: avgEfficiency[0]?.averageMinutes ?? null,
        fastest: fastest[0] ? { title: fastest[0].title, minutes: fastest[0].actualMinutes } : null,
        longest: longest[0] ? { title: longest[0].title, minutes: longest[0].actualMinutes } : null,
        trend
      }
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ message: 'Failed to load reports.', error: error.message }, { status: 500 });
  }
}
