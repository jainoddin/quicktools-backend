import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { User, IUser } from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

const DEACTIVATION_GRACE_DAYS = 15;

async function handleExistingUser(user: IUser, avatar: string, done: VerifyCallback) {
  // Reactivate if within 15-day grace period; otherwise permanently delete
  if (user.deactivatedAt) {
    const daysSince =
      (Date.now() - new Date(user.deactivatedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= DEACTIVATION_GRACE_DAYS) {
      user.deactivatedAt = null;
      // Only sync Google photo if user hasn't uploaded a custom avatar
      if (!user.customAvatar && avatar && user.avatar !== avatar) {
        user.avatar = avatar;
      }
      await user.save();
      console.log(`✅ Reactivated account for ${user.email} (logged in within ${DEACTIVATION_GRACE_DAYS} days)`);
      return done(null, user);
    }

    await User.deleteOne({ _id: user._id });
    console.log(`🗑️ Permanently deleted deactivated account ${user.email} (grace period expired)`);
    return done(null, false, { message: 'account_permanently_deleted' } as any);
  }

  // Don't overwrite a user-uploaded profile photo with Google avatar
  if (!user.customAvatar && avatar && user.avatar !== avatar) {
    user.avatar = avatar;
    await user.save();
  }
  return done(null, user);
}

// Ensure credentials exist (we'll log a warning if they don't during dev)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'missing_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret';
// Use the exact callback URL registered in Google Cloud Console
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        // Extract required fields from Google profile
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '';
        const name = profile.displayName;

        if (!email) {
          return done(new Error('No email found in Google Profile'), false);
        }

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return handleExistingUser(user, avatar, done);
        }

        // Check if a user with this email exists (e.g. they signed up another way previously)
        user = await User.findOne({ email });
        
        if (user) {
           // Link the google account to the existing email account
           user.googleId = profile.id;
           return handleExistingUser(user, avatar, done);
        }

        // Create a new user
        user = new User({
          googleId: profile.id,
          email,
          name,
          avatar,
        });

        await user.save();
        return done(null, user);
      } catch (error: any) {
        return done(error, false);
      }
    }
  )
);

export default passport;
