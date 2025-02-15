const { validationResult } = require("express-validator");
import prisma from "../config/prisma";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary";

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

function uploadToCloudinary(buffer: Buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
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

    // for now lets get all file from the upload folder
    // const files = fs.readdirSync(path.join(__dirname, "..", "uploads"));

    const files = await prisma.file.findMany({
      where: {
        ownerId: req.user.id,
        folderId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    console.log("files", files);
    res.render("dashboard", { folders, files });
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

    try {
      if (!req.files) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const parentFolderId = req.body.parentFolderId;
      const userId = req.user.id;

      const files = req.files;
      console.log("parentFolderId", parentFolderId);
      console.log("files", files);

      // upload all files to cloudinary
      const uploadedPromises = files.map((file: any) =>
        uploadToCloudinary(file.buffer)
      );

      const cloudinaryResults = await Promise.all(uploadedPromises);

      console.log("cloudinaryResults", cloudinaryResults);

      if (parentFolderId === "") {
        // create file in the database
        const fileRecords = cloudinaryResults.map(
          (result: any, index: number) => ({
            name: files[index].originalname,
            url: result.secure_url,
            size: files[index].size,
            type: files[index].mimetype,
            ownerId: userId,
          })
        );

        await prisma.file.createMany({
          data: fileRecords,
        });
      } else {
        // create file in the database
        const fileRecords = cloudinaryResults.map(
          (result: any, index: number) => ({
            name: files[index].originalname,
            url: result.secure_url,
            size: files[index].size,
            type: files[index].mimetype,
            ownerId: userId,
            folderId: parentFolderId,
          })
        );
        await prisma.file.createMany({
          data: fileRecords,
        });
      }

      req.flash("success", "Files uploaded successfully");
      if (parentFolderId) {
        res.redirect(`/app/folder/${parentFolderId}`);
      } else {
        res.redirect("/app");
      }
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
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
