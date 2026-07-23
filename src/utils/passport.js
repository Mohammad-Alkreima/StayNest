const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/v1/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
        // searching user has googleid or email
        let user = await User.findOne({ 
            $or: [{ googleId: profile.id }, { email: profile.emails[0].value }] 
        });

        if (!user) {
            // if does not exsist, we creat it as new user
            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isOAuthUser: true,
                profileImage: profile.photos[0]?.value
            });
        } else if (!user.googleId) {
            // If user has an account registered with an email, we link the Google ID.
            user.googleId = profile.id;
            user.isOAuthUser = true;
            await user.save();
        }
        return done(null, user);
        } catch (err) {
        return done(err, null);
        }
    }
));
