import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './database.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if user already exists
        let user = await db('users').where({ email }).first();

        if (user) {
          // Update avatar if changed
          if (profile.photos[0]?.value && !user.avatar_url) {
            await db('users')
              .where({ id: user.id })
              .update({ avatar_url: profile.photos[0].value });
          }
          return done(null, user);
        }

        // Create new user from Google profile
        const [newUser] = await db('users')
          .insert({
            email,
            first_name: profile.name.givenName || profile.displayName,
            last_name: profile.name.familyName || '',
            avatar_url: profile.photos[0]?.value || null,
            role: 'freelancer', // default role, user can change later
            is_verified: true,  // Google accounts are pre-verified
            google_id: profile.id
          })
          .returning('*');

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db('users').where({ id }).first();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
