'use client';

import { getUserInitials } from '@/lib/user';

export default function UserAvatar({ user, size = 44, className = '' }) {
  const initials = getUserInitials(user?.fullName);
  const avatarUrl = user?.avatarUrl;
  const sizeClass = size === 44 ? 'h-11 w-11' : size === 40 ? 'h-10 w-10' : '';
  const style = sizeClass ? undefined : { width: size, height: size };

  const ringClass = 'ring-2 ring-indigo-100 shadow-md dark:ring-slate-800';
  const baseClass = `${sizeClass || ''} rounded-full object-cover ${ringClass} ${className}`.trim();

  if (avatarUrl) {
    if (avatarUrl.startsWith('linear-gradient') || avatarUrl.startsWith('background')) {
      return (
        <div
          className={`${baseClass} flex items-center justify-center text-white text-xs font-bold`}
          style={{ ...style, background: avatarUrl }}
        >
          {initials}
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt="User Profile"
        width={size}
        height={size}
        className={baseClass}
        style={style}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${baseClass} flex items-center justify-center bg-indigo-500 text-white text-xs font-bold`}
      style={style}
    >
      {initials}
    </div>
  );
}
