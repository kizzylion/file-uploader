const express = require("express");
const dotenv = require("dotenv");
const session = require("express-session");
// import passport from "./config/auth";
const flash = require("connect-flash");
const prisma = require("./config/prisma");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const path = require("path");
dotenv.config();

const app = express();

// verify required environment variables
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be defined in .env file");
}

// set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// setup middleware for parsing request body and serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// setup session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

// Initialize passport
// app.use(passport.initialize());
// app.use(passport.session());

// setup flash messages
app.use(flash());
app.use((req: any, res: any, next: any) => {
  res.locals.flash = req.flash();
  next();
});

app.use((req: any, res: any, next: any) => {
  res.locals.user = req.user;
  next();
});

// setup routes
app.get("/", (req: any, res: any) => {
  res.render("index");
});

// start server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
