const { validationResult } = require("express-validator");
import prisma from "../config/prisma";

const dashboardController = {
  getDashboardPage: async (req: any, res: any) => {
    const folders = await prisma.folder.findMany({
      where: {
        ownerId: req.user.id,
      },
      include: {
        files: true,
        children: true,
      },
    });
    console.log(folders);
    res.render("dashboard", { folders });
  },
  createFolder: async (req: any, res: any) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      req.flash("error", error.array()[0].msg);
      return res.redirect("/app");
    }

    const { folderName, parentFolderId } = req.body;

    const userId = req.user.id;

    try {
      if (!parentFolderId) {
        // create folder in root
        const folder = await prisma.folder.create({
          data: {
            name: folderName,
            ownerId: userId,
          },
        });
        console.log(folder);
        req.flash("success", "Folder created successfully");
        return res.redirect("/app");
      }

      const parentFolder = await prisma.folder.findUnique({
        where: {
          id: parentFolderId,
        },
      });

      if (!parentFolder) {
        return res.status(404).json({ error: "Parent folder not found" });
      }

      if (parentFolder.ownerId !== userId) {
        return res.status(403).json({
          error: "You are not allowed to create folder in this folder",
        });
      }

      const folder = await prisma.folder.create({
        data: {
          name: folderName,
          parentFolderId: parentFolderId,
          ownerId: userId,
        },
      });
      console.log(folder);

      req.flash("success", "Folder created successfully");
      return res.redirect("/app");
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  },
};

export default dashboardController;
