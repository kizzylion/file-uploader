const { validationResult } = require("express-validator");
import prisma from "../config/prisma";

// function to get all the recursive parent folders for breadcrumb
interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
}

async function getRecursiveParentFolders(folderId: string): Promise<Folder[]> {
  const folder = await prisma.folder.findUnique({
    where: {
      id: folderId,
    },
  });
  if (folder?.parentFolderId) {
    return [
      ...(await getRecursiveParentFolders(folder.parentFolderId)),
      folder,
    ];
  }
  return [folder as Folder];
}

const dashboardController = {
  getDashboardPage: async (req: any, res: any) => {
    const folders = await prisma.folder.findMany({
      where: {
        ownerId: req.user.id,
        parentFolderId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        files: true,
        children: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    console.log(folders);
    res.render("dashboard", { folders });
  },

  getFolderPage: async (req: any, res: any) => {
    const folderId = req.params.folderId;
    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        files: true,
        children: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            files: true,
            children: {
              orderBy: {
                createdAt: "desc",
              },
            },
            parentFolder: true,
          },
        },
        parentFolder: true,
      },
    });
    const parentFolders = await getRecursiveParentFolders(folderId);
    console.log("parentFolders", parentFolders);
    console.log("folder", folder);
    res.render("folderPage", { folder, parentFolders });
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

  uploadFile: async (req: any, res: any) => {
    if (!req.files) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    console.log(req.files);
    res.status(200).json({ message: "Files uploaded successfully" });
  },
};

export default dashboardController;
