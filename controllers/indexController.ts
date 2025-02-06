const { validationResult } = require("express-validator");
import { hashPassword, comparePassword } from "../config/bcrypt";
import prisma from "../config/prisma";
import passport from "../config/auth";

const indexController = {
  getLandingPage: (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.redirect("/app");
    } else {
      res.render("index");
    }
  },
  getSignupPage: (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.redirect("/app");
    } else {
      res.render("auth/signup");
    }
  },
  getLoginPage: (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.redirect("/app");
    } else {
      res.render("auth/login");
    }
  },
  postSignup: async (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      res.redirect("/app");
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("error", errors.array()[0].msg);
      return res.redirect("/signup");
    }
    const { username, password, confirmPassword } = req.body;
    const hashedPassword = hashPassword(password);
    await prisma.user
      .create({
        data: {
          username,
          password: hashedPassword,
        },
      })
      .catch((error: any) => {
        console.log(error);
        req.flash("error", "Username already exists");
        return res.redirect("/signup");
      });

    req.flash("success", "Signup successful");
    res.redirect("/login");
  },
  postLogin: async (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      res.redirect("/app");
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("error", errors.array()[0].msg);
      return res.redirect("/login");
    }
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });
    if (!user) {
      req.flash("error", "Invalid username or password");
      return res.redirect("/login");
    }
    const isPasswordValid = comparePassword(password, user.password);
    if (!isPasswordValid) {
      req.flash("error", "Invalid username or password");
      return res.redirect("/login");
    }
    passport.authenticate("local", {
      successRedirect: "/app",
      failureRedirect: "/login",
      failureFlash: true,
      successFlash: true,
    })(req, res, next);
  },
  logout: (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Logout successful");
      res.redirect("/");
    });
  },
};

export default indexController;
