export function serializeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    isVerified: user.isVerified,
    authProvider: user.authProvider || 'local',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
