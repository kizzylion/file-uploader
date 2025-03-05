import { Router } from "express";
const routes = Router();
import indexController from "../controllers/indexController";
const { body } = require("express-validator");
import prisma from "../config/prisma";
import dashboardController from "../controllers/dashboardController";

routes.get("/", indexController.getLandingPage);

routes.get("/signup", indexController.getSignupPage);

routes.post(
  "/signup",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("username").custom(async (value: string, { req }: any) => {
      const user = await prisma.user.findUnique({ where: { username: value } });
      if (user) {
        req.flash("error", "Username already exists");
        return false;
      }
      return true;
    }),
    body("password")
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long"),
    body("confirmPassword").custom((value: string, { req }: any) => {
      if (value !== req.body.password) {
        req.flash("error", "Passwords do not match");
        return false;
      }
      return true;
    }),
  ],
  indexController.postSignup
);

routes.get("/login", indexController.getLoginPage);

routes.post(
  "/login",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("password")
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long"),
  ],
  indexController.postLogin
);

routes.get("/logout", indexController.logout);

routes.get("/shared/:token", indexController.showSharedLink);
routes.get("/shared/:token/:folderId", indexController.showSharedLink);
routes.get(
  "/shared/:token/download/:fileId",
  dashboardController.downloadSharedFiles
);

export default routes;
