import { OAuth2Client } from 'google-auth-library';
import User from '@/models/User';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  return ticket.getPayload();
}

export async function findOrCreateGoogleUser(payload) {
  const googleId = payload.sub;
  const email = payload.email?.toLowerCase();
  const fullName = payload.name || payload.given_name || email?.split('@')[0] || 'User';
  const avatarUrl = payload.picture || null;

  if (!email) {
    throw new Error('Email tidak tersedia dari akun Google.');
  }

  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email });
  }

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    if (!user.fullName && fullName) {
      user.fullName = fullName;
    }
    user.authProvider = user.passwordHash ? 'both' : 'google';
    user.isVerified = payload.email_verified ?? user.isVerified;
    await user.save();
    return user;
  }

  user = await User.create({
    fullName,
    email,
    googleId,
    avatarUrl,
    authProvider: 'google',
    isVerified: payload.email_verified ?? true
  });

  return user;
}
