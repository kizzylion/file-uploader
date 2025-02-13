import express from "express";
import dotenv from "dotenv";
import session from "express-session";
// import passport from "./config/auth";
import flash from "connect-flash";
import prisma from "./config/prisma";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import path from "path";
dotenv.config();
import indexRouter from "./routes/indexRouter";
import dashboardRouter from "./routes/dashboardRouter";
import passport from "./config/auth";

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
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

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
app.use("/", indexRouter);
app.use("/app", dashboardRouter);
// catch 404 and forward to error handler
app.use((req: any, res: any, next: any) => {
  res.status(404).render("404");
});

// error handler
app.use((err: any, req: any, res: any, next: any) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// start server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
