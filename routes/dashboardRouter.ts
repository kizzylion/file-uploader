import { Router } from "express";
const routes = Router();
import prisma from "../config/prisma";
import dashboardController from "../controllers/dashboardController";
const { body } = require("express-validator");
import upload from "../config/multerUploader";

// if is not authenticated, redirect to login
routes.use((req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  }
  next();
});

routes.get("/", dashboardController.getDashboardPage);

routes.post(
  "/folder",
  [body("folderName").notEmpty().withMessage("Folder name is required")],
  dashboardController.createFolder
);

// upload files
routes.post("/upload", upload.array("file"), dashboardController.uploadFile);

routes.get("/folder/:folderId", dashboardController.getFolderPage);
routes.get("/folder/:folderId/delete", dashboardController.deleteFolder);

routes.get("/download/:fileId", dashboardController.downloadFile);
routes.get("/file/:fileId/delete", dashboardController.deleteFile);
routes.post("/folder/:folderId/share", dashboardController.postShare);

export default routes;
