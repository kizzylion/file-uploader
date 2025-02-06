import { comparePassword } from "./bcrypt";
import prisma from "./prisma";
import passport from "passport";
import * as passportLocal from "passport-local";

const localStrategy = passportLocal.Strategy;
passport.use(
  new localStrategy(
    { usernameField: "username" },
    async (username: string, password: string, done: Function) => {
      try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return done(null, false);
        const isPasswordValid = comparePassword(password, user.password);
        if (!isPasswordValid) return done(null, false);
        return done(null, { id: user.id, username: user.username });
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done: Function) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: Function) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
    console.error(error);
  }
});

export default passport;
