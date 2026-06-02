import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserSettings from '@/models/UserSettings';
import { createUUID } from '@/models/utils';

export async function GET(req) {
  try {
    await connectDB();
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      // Create default settings if not exists
      settings = new UserSettings({
        _id: createUUID ? createUUID() : Math.random().toString(36).substring(2, 15),
        userId,
        theme: 'light',
        language: 'id',
        defaultView: 'today',
        weekStartsOn: 'monday',
        timeFormat: '24h',
        dateFormat: 'DD/MM/YYYY',
        notifyPush: true,
        notifyEmail: false,
        notifySound: true,
        reminderDefault: 15,
  autoArchiveDays: 0
      });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ message: 'Gagal memuat preferensi.', error: error.message }, { status: 500 });
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

    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = new UserSettings({
        _id: createUUID ? createUUID() : Math.random().toString(36).substring(2, 15),
        userId
      });
    }

    // Update keys that are passed
    if (body.theme !== undefined) settings.theme = body.theme;
    if (body.language !== undefined) settings.language = body.language;
    if (body.defaultView !== undefined) settings.defaultView = body.defaultView;
    if (body.weekStartsOn !== undefined) settings.weekStartsOn = body.weekStartsOn;
    if (body.timeFormat !== undefined) settings.timeFormat = body.timeFormat;
    if (body.dateFormat !== undefined) settings.dateFormat = body.dateFormat;
    
    if (body.notifyPush !== undefined) settings.notifyPush = body.notifyPush;
    if (body.notifyEmail !== undefined) settings.notifyEmail = body.notifyEmail;
    if (body.notifySound !== undefined) settings.notifySound = body.notifySound;
    if (body.reminderDefault !== undefined) settings.reminderDefault = body.reminderDefault;
    if (body.autoArchiveDays !== undefined) settings.autoArchiveDays = body.autoArchiveDays;
    if (body.twoFactorEnabled !== undefined) settings.twoFactorEnabled = body.twoFactorEnabled;

    await settings.save();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('PUT settings error:', error);
    return NextResponse.json({ message: 'Gagal menyimpan preferensi.', error: error.message }, { status: 500 });
  }
}
