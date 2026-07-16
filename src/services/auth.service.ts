import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { User, IUser } from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

const DEACTIVATION_GRACE_DAYS = 15;

async function handleExistingUser(user: IUser, avatar: string, done: VerifyCallback) {
  if (user.deactivatedAt) {
    const daysSince =
      (Date.now() - new Date(user.deactivatedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= DEACTIVATION_GRACE_DAYS) {
      user.deactivatedAt = null;
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

  if (!user.customAvatar && avatar && user.avatar !== avatar) {
    user.avatar = avatar;
    await user.save();
  }
  return done(null, user);
}

// ─── Google ───────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'missing_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret';
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '';
        const name = profile.displayName;

        if (!email) {
          return done(new Error('No email found in Google Profile'), false);
        }

        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return handleExistingUser(user, avatar, done);
        }

        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          return handleExistingUser(user, avatar, done);
        }

        user = new User({
          googleId: profile.id,
          email,
          name,
          avatar: avatar || 'https://github.com/identicons/default.png',
        });

        await user.save();
        return done(null, user);
      } catch (error: any) {
        return done(error, false);
      }
    }
  )
);

// ─── GitHub ───────────────────────────────────────────────
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: GITHUB_CALLBACK_URL,
        scope: ['user:email'],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: GitHubProfile,
        done: (error: any, user?: any, info?: any) => void
      ) => {
        try {
          const emails = (profile.emails || []) as { value: string; primary?: boolean; verified?: boolean }[];
          const primary =
            emails.find((e) => e.primary && e.verified) ||
            emails.find((e) => e.verified) ||
            emails[0];
          const email = primary?.value || null;
          const avatar =
            (profile.photos && profile.photos[0]?.value) ||
            (profile as any)._json?.avatar_url ||
            '';
          const name =
            profile.displayName ||
            profile.username ||
            (profile as any)._json?.name ||
            'GitHub User';

          if (!email) {
            return done(
              new Error(
                'No email found on GitHub. Make your email public or grant user:email access.'
              ),
              false
            );
          }

          let user = await User.findOne({ githubId: profile.id });
          if (user) {
            return handleExistingUser(user, avatar, done as VerifyCallback);
          }

          user = await User.findOne({ email });
          if (user) {
            user.githubId = profile.id;
            return handleExistingUser(user, avatar, done as VerifyCallback);
          }

          user = new User({
            githubId: profile.id,
            email,
            name,
            avatar: avatar || 'https://github.com/identicons/default.png',
          });

          await user.save();
          return done(null, user);
        } catch (error: any) {
          return done(error, false);
        }
      }
    )
  );
} else {
  console.warn('⚠️ GitHub OAuth not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET missing)');
}

export default passport;
