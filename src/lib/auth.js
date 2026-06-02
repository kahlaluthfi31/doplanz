export function serializeUser(user) {
  return {
    id: user._id,
    full_name: user.fullName,
    email: user.email,
    avatar_url: user.avatarUrl,
    phone: user.phone,
    is_verified: user.isVerified,
    auth_provider: user.authProvider || 'local',
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}
