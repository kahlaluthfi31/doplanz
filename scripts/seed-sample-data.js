import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createUUID } from '../src/models/utils.js';
import User from '../src/models/User.js';
import TaskGroup from '../src/models/TaskGroup.js';
import Project from '../src/models/Project.js';
import Task from '../src/models/Task.js';
import Todo from '../src/models/Todo.js';
import Subtask from '../src/models/Subtask.js';
import Label from '../src/models/Label.js';
import TaskLabel from '../src/models/TaskLabel.js';
import Attachment from '../src/models/Attachment.js';
import Reminder from '../src/models/Reminder.js';
import ActivityLog from '../src/models/ActivityLog.js';
import Streak from '../src/models/Streak.js';
import UserSettings from '../src/models/UserSettings.js';
import DailySummary from '../src/models/DailySummary.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todo_db';

const seed = async () => {
    try {
        await mongoose.connect(MONGODB_URI);

            try {
                await mongoose.connection.db.collection('users').dropIndex('userId_1');
            } catch (error) {
                if (error?.codeName !== 'IndexNotFound') {
                    console.warn('Index cleanup warning:', error.message);
                }
            }

        try {
            await mongoose.connection.db.collection('todos').dropIndex('username_1');
        } catch (error) {
            if (error?.codeName !== 'IndexNotFound') {
                console.warn('Todo index cleanup warning:', error.message);
            }
        }

        await Promise.all([
            User.deleteMany({}),
            TaskGroup.deleteMany({}),
            Project.deleteMany({}),
            Task.deleteMany({}),
            Todo.deleteMany({}),
            Subtask.deleteMany({}),
            Label.deleteMany({}),
            TaskLabel.deleteMany({}),
            Attachment.deleteMany({}),
            Reminder.deleteMany({}),
            ActivityLog.deleteMany({}),
            Streak.deleteMany({}),
            UserSettings.deleteMany({}),
            DailySummary.deleteMany({})
        ]);

        const userId = createUUID();
        const passwordHash = await bcrypt.hash('Dev12345!', 10);

        await User.create({
            _id: userId,
            fullName: 'Kahla Luthfiyah',
            email: 'kahla@demo.com',
            passwordHash,
            avatarUrl: null,
            phone: '081234567890',
            isVerified: true
        });

        await UserSettings.create({
            _id: userId,
            userId,
            theme: 'light',
            language: 'id',
            defaultView: 'today',
            autoArchiveDays: 0
        });

        const groups = [
            { _id: createUUID(), userId, name: 'Office Project', icon: 'briefcase', color: '#6C5CE7', sortOrder: 1 },
            { _id: createUUID(), userId, name: 'Personal Project', icon: 'home', color: '#FF9F1C', sortOrder: 2 },
            { _id: createUUID(), userId, name: 'Daily Study', icon: 'book', color: '#2EC4B6', sortOrder: 3 }
        ];

        await TaskGroup.insertMany(groups);

        const projects = [
            {
                _id: createUUID(),
                userId,
                groupId: groups[0]._id,
                name: 'Grocery Shopping App Design',
                description: 'Design UI flow for grocery shopping app',
                color: '#A29BFE',
                icon: 'shopping-bag',
                status: 'active',
                progress: 68,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
            },
            {
                _id: createUUID(),
                userId,
                groupId: groups[1]._id,
                name: 'Uber Eats Redesign Challenge',
                description: 'Improve onboarding and checkout flow',
                color: '#FFD6A5',
                icon: 'sparkles',
                status: 'active',
                progress: 45,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8)
            }
        ];

        await Project.insertMany(projects);

        const daysAgo = (offset) => {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            date.setHours(12, 0, 0, 0);
            return date;
        };

        const tasks = [
            {
                _id: createUUID(),
                userId,
                projectId: projects[0]._id,
                groupId: groups[0]._id,
                title: 'Create wireframe for checkout flow',
                description: 'Draft checkout flow for grocery app',
                status: 'in_progress',
                priority: 'high',
                dueDate: daysAgo(0),
                isAllDay: false,
                estimatedMinutes: 180
            },
            {
                _id: createUUID(),
                userId,
                projectId: projects[1]._id,
                groupId: groups[1]._id,
                title: 'User journey mapping',
                description: 'Map user journey for delivery flow',
                status: 'pending',
                priority: 'medium',
                dueDate: daysAgo(1),
                isAllDay: true
            },
            {
                _id: createUUID(),
                userId,
                groupId: groups[2]._id,
                title: 'Daily study: React Native layout',
                status: 'completed',
                priority: 'low',
                dueDate: daysAgo(2),
                completedAt: daysAgo(2),
                actualMinutes: 45,
                estimatedMinutes: 60
            },
            {
                _id: createUUID(),
                userId,
                projectId: projects[0]._id,
                groupId: groups[0]._id,
                title: 'Define checkout UX copy',
                status: 'completed',
                priority: 'medium',
                dueDate: daysAgo(3),
                completedAt: daysAgo(3),
                actualMinutes: 30,
                estimatedMinutes: 45
            },
            {
                _id: createUUID(),
                userId,
                projectId: projects[0]._id,
                groupId: groups[0]._id,
                title: 'Prototype delivery tracking',
                status: 'in_progress',
                priority: 'high',
                dueDate: daysAgo(4),
                estimatedMinutes: 150
            },
            {
                _id: createUUID(),
                userId,
                projectId: projects[1]._id,
                groupId: groups[1]._id,
                title: 'Illustration concept',
                status: 'completed',
                priority: 'urgent',
                dueDate: daysAgo(5),
                completedAt: daysAgo(5),
                actualMinutes: 95,
                estimatedMinutes: 120
            },
            {
                _id: createUUID(),
                userId,
                groupId: groups[1]._id,
                title: 'Review onboarding flow',
                status: 'pending',
                priority: 'low',
                dueDate: daysAgo(6)
            },
            {
                _id: createUUID(),
                userId,
                groupId: groups[2]._id,
                title: 'Daily study: Motion design basics',
                status: 'completed',
                priority: 'medium',
                dueDate: daysAgo(6),
                completedAt: daysAgo(6),
                actualMinutes: 50,
                estimatedMinutes: 50
            },
            {
                _id: createUUID(),
                userId,
                projectId: projects[1]._id,
                groupId: groups[1]._id,
                title: 'Competitive analysis summary',
                status: 'completed',
                priority: 'high',
                dueDate: daysAgo(7),
                completedAt: daysAgo(7),
                actualMinutes: 70,
                estimatedMinutes: 80
            },
            {
                _id: createUUID(),
                userId,
                groupId: groups[0]._id,
                title: 'Prepare stakeholder update',
                status: 'cancelled',
                priority: 'medium',
                dueDate: daysAgo(8)
            }
        ];

        await Task.insertMany(tasks);

        await Todo.insertMany([
            {
                title: 'Grocery shopping app design',
                description: 'Design checkout flow and delivery steps',
                category: 'Office Project',
                priority: 'High',
                isCompleted: false,
                dueDate: new Date()
            },
            {
                title: 'Uber Eats redesign challenge',
                description: 'Improve onboarding and checkout flow',
                category: 'Personal Project',
                priority: 'Medium',
                isCompleted: false,
                dueDate: new Date()
            },
            {
                title: 'Daily study: React Native layout',
                description: 'Practice layout for mobile UI',
                category: 'Daily Study',
                priority: 'Low',
                isCompleted: true,
                dueDate: new Date()
            }
        ]);

        await Subtask.insertMany([
            { _id: createUUID(), taskId: tasks[0]._id, title: 'Sketch payment screen', sortOrder: 1 },
            { _id: createUUID(), taskId: tasks[0]._id, title: 'Review with team', sortOrder: 2, isCompleted: true }
        ]);

        const labels = await Label.insertMany([
            { _id: createUUID(), userId, name: 'UI Design', color: '#6C5CE7' },
            { _id: createUUID(), userId, name: 'Bug', color: '#FF6B6B' }
        ]);

        await TaskLabel.insertMany([
            { taskId: tasks[0]._id, labelId: labels[0]._id },
            { taskId: tasks[1]._id, labelId: labels[0]._id }
        ]);

        await Attachment.create({
            _id: createUUID(),
            taskId: tasks[0]._id,
            fileName: 'wireframe.pdf',
            fileUrl: 'https://example.com/files/wireframe.pdf',
            fileType: 'application/pdf',
            fileSize: 120034
        });

        await Reminder.create({
            _id: createUUID(),
            taskId: tasks[0]._id,
            remindAt: new Date(Date.now() + 1000 * 60 * 60),
            type: 'push'
        });

        await ActivityLog.insertMany([
            {
                _id: createUUID(),
                userId,
                taskId: tasks[0]._id,
                projectId: projects[0]._id,
                action: 'updated',
                description: 'Progress updated to 68%'
            },
            {
                _id: createUUID(),
                userId,
                taskId: tasks[2]._id,
                projectId: null,
                action: 'completed',
                description: 'Daily study completed'
            },
            {
                _id: createUUID(),
                userId,
                taskId: tasks[3]._id,
                projectId: projects[0]._id,
                action: 'completed',
                description: 'Checkout copy finalized'
            },
            {
                _id: createUUID(),
                userId,
                taskId: tasks[5]._id,
                projectId: projects[1]._id,
                action: 'completed',
                description: 'Illustration concept delivered'
            },
            {
                _id: createUUID(),
                userId,
                taskId: tasks[6]._id,
                projectId: projects[1]._id,
                action: 'created',
                description: 'New onboarding review task created'
            }
        ]);

        const streakEntries = Array.from({ length: 10 }, (_, idx) => {
            const date = daysAgo(idx);
            const tasksCompleted = Math.max(0, 3 - (idx % 4));
            const tasksTotal = 3 + (idx % 3);
            return {
                _id: createUUID(),
                userId,
                date,
                tasksCompleted,
                tasksTotal,
                isStreakBroken: tasksCompleted === 0
            };
        });

        await Streak.insertMany(streakEntries);

        await DailySummary.create({
            _id: createUUID(),
            userId,
            date: daysAgo(0),
            totalTasks: 6,
            completedTasks: 3,
            pendingTasks: 2,
            overdueTasks: 1,
            completionRate: 50,
            totalMinutesSpent: 245
        });

        console.log('Sample data seeded successfully.');
    } catch (error) {
        console.error('Seed error:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

seed();
