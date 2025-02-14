const { validationResult } = require("express-validator");
import prisma from "../config/prisma";

// function to get all the recursive parent folders for breadcrumb
interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  children: Folder[];
  files: File[];
  parentFolder: Folder | null;
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
      folder as unknown as Folder,
    ];
  }
  return [folder as unknown as Folder];
}

async function deleteFolderRecursively(folderId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      children: {
        include: {
          files: true,
          children: {
            include: {
              files: true,
            },
          },
        },
      },
      files: true,
    },
  });

  if (folder?.children && folder.children.length > 0) {
    for (const child of folder.children) {
      await deleteFolderRecursively(child.id);
    }
  }
  if (folder?.files && folder.files.length > 0) {
    for (const file of folder.files) {
      await prisma.file.delete({
        where: { id: file.id },
      });
    }
  }
  await prisma.folder.delete({
    where: { id: folderId },
  });
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

      req.flash("success", "Folder created successfully");
      return res.redirect(`/app/folder/${folder.id}`);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  },

  uploadFile: async (req: any, res: any) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      req.flash("error", error.array()[0].msg);
      return res.redirect("/app");
    }
    if (!req.files) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const parentFolderId =
      req.body.parentFolderId || req.params.folderId || null;
    const userId = req.user.id;

    const files = req.files;
    console.log("parentFolderId", parentFolderId);
    console.log("files", files);

    res.status(200).json({ message: "Files uploaded successfully" });
  },
  // delete folder, check if the folder is empty, if not, all the files in the folder will be deleted
  deleteFolder: async (req: any, res: any) => {
    const folderId = req.params.folderId;
    const userId = req.user.id;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, ownerId: userId },
      include: {
        files: true,
        children: true,
      },
    });

    if (!folder) {
      req.flash("error", "Folder not found");
      return res.redirect("/app");
    }

    if (folder.children.length > 0) {
      // recursively delete all the files in the folder
      await deleteFolderRecursively(folderId);
    } else {
      await prisma.folder.delete({
        where: { id: folderId, ownerId: userId },
      });
    }

    req.flash("success", "Folder deleted successfully");
    res.redirect("/app");
  },
};

export default dashboardController;
