const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

passport.use(
  new LocalStrategy(
    { usernameField: "username" },
    async (username: string, password: string, done: Function) => {
      console.log(username, password);
      done(null, { username });
    }
  )
);
