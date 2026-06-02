'use client';

import { useEffect, useRef } from 'react';
import { playNotificationSound, requestNotificationPermission, showTaskNotification } from '@/lib/notification-sound';
import { useSettings } from './SettingsProvider';

const firedKeys = new Set();

export default function TaskReminderListener() {
  const { settings, userId } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!userId) return;

    const poll = async () => {
      try {
        const res = await fetch('/api/reminders/due', {
          headers: { 'x-user-id': userId }
        });
        if (!res.ok) return;

        const reminders = await res.json();
        const current = settingsRef.current;

        for (const item of reminders) {
          const key = item._id;
          if (firedKeys.has(key)) continue;
          firedKeys.add(key);

          if (current.notifyPush) {
            await requestNotificationPermission();
            showTaskNotification({
              title: item.taskTitle || 'Pengingat Tugas',
              body: item.message || 'Waktunya mengerjakan tugas Anda.'
            });
          }

          if (current.notifySound) {
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('Reminder poll error:', error);
      }
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  return null;
}
