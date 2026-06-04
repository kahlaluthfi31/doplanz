export function normalizeUser(data) {
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.fullName || data.full_name || '',
    email: data.email || '',
    avatarUrl: data.avatarUrl || data.avatar_url || null,
    phone: data.phone || '',
    isVerified: data.isVerified ?? data.is_verified ?? false,
    authProvider: data.authProvider || data.auth_provider || 'local',
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at
  };
}

export function getUserInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function persistUser(user) {
  if (typeof window === 'undefined' || !user?.id) return;
  window.localStorage.setItem('todo_user', JSON.stringify(user));
}

export async function syncUserFromApi(userId) {
  if (!userId) return null;
  try {
    const res = await fetch('/api/users/me', {
      headers: { 'x-user-id': userId }
    });
    if (!res.ok) return null;
    const data = normalizeUser(await res.json());
    persistUser(data);
    return data;
  } catch {
    return null;
  }
}

export function loadStoredUser() {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem('todo_user');
  if (!stored) return null;
  try {
    return normalizeUser(JSON.parse(stored));
  } catch {
    return null;
  }
}
