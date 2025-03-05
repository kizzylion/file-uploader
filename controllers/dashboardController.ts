const { validationResult } = require("express-validator");
import prisma from "../config/prisma";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary";
import { Readable } from "stream";
import previewUrl from "../config/cloudinaryPreviewUrl";
import { v4 as uuidv4 } from "uuid";

// function to get all the recursive parent folders for breadcrumb
interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  children: Folder[];
  files: File[];
  parentFolder: Folder | null;
}

export async function getRecursiveParentFolders(
  folderId: string
): Promise<Folder[]> {
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
  try {
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
        if (file.publicId) {
          await cloudinary.uploader.destroy(file.publicId);
          await cloudinary.uploader.destroy(file.publicId, {
            resource_type: "raw",
          });
        }
        await prisma.file.delete({
          where: { id: file.id },
        });
      }
    }
    await prisma.folder.delete({
      where: { id: folderId },
    });
  } catch (error) {
    console.log(error);
  }
}

function uploadToCloudinary(buffer: Buffer) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "fileuploader" },
        (error, result) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.log("Upload to cloudinary error", error);
    throw error;
  }
}
function uploadToCloudinaryRaw(buffer: Buffer) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "fileuploader" },
        (error, result) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.log("Upload to cloudinary error", error);
    throw error;
  }
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

    let filesWithPreviewUrl = files.map((file) => {
      return {
        ...file,
        previewUrl: file.type.includes("pdf") ? previewUrl(file.url) : null,
      };
    });
    console.log("files", filesWithPreviewUrl);
    let shareUrl;
    res.render("dashboard", { folders, files: filesWithPreviewUrl, shareUrl });
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
        file.mimetype.includes("image")
          ? uploadToCloudinary(file.buffer)
          : uploadToCloudinaryRaw(file.buffer)
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
            publicId: result.public_id,
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
            publicId: result.public_id,
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

  downloadFile: async (req: any, res: any) => {
    try {
      const fileId = req.params.fileId;
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      // Append the parameter to the url to force download
      const downloadUrl =
        file?.url + "?response-content-disposition=attachment";

      // using fetch to retrieve the file from cloudinary
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        return res
          .status(500)
          .json({ error: "Error fetching file from cloudinary" });
      }

      const contentType = response.headers.get("content-type");

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const urlObj = new URL(file.url);
      const extension = path.extname(urlObj.pathname);

      // ensure the filename has the correct extension

      const fileNameWithExtension = file.name + extension;
      // const fileName = file.name;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileNameWithExtension}"`
      );

      // convert the web ReadableStream to a node.js Readable stream
      const stream = Readable.from(response.body as any);

      stream.pipe(res);

      // open the file in the browser
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  },
  downloadSharedFiles: async (req: any, res: any) => {
    try {
      const token = req.params.token;
      const sharedLink = await prisma.shareLink.findUnique({
        where: {
          token: token,
          expiresAt: { gt: new Date() },
        },
      });

      if (!sharedLink) res.status(404).render("404");

      const fileId = req.params.fileId;
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      // Append the parameter to the url to force download
      const downloadUrl =
        file?.url + "?response-content-disposition=attachment";

      // using fetch to retrieve the file from cloudinary
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        return res
          .status(500)
          .json({ error: "Error fetching file from cloudinary" });
      }

      const contentType = response.headers.get("content-type");

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const urlObj = new URL(file.url);
      const extension = path.extname(urlObj.pathname);

      // ensure the filename has the correct extension

      const fileNameWithExtension = file.name + extension;
      // const fileName = file.name;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileNameWithExtension}"`
      );

      // convert the web ReadableStream to a node.js Readable stream
      const stream = Readable.from(response.body as any);

      stream.pipe(res);

      // open the file in the browser
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Failed to download file" });
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

    folder.files.forEach(async (file) => {
      try {
        if (file.publicId) {
          await cloudinary.uploader.destroy(file.publicId);
          await cloudinary.uploader.destroy(file.publicId, {
            resource_type: "raw",
          });
        }
        await prisma.file.delete({
          where: { id: file.id, ownerId: userId },
        });
      } catch (error) {
        console.log(error);
        return;
      }
    });

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

  deleteFile: async (req: any, res: any) => {
    try {
      const fileId = req.params.fileId;
      const userId = req.user.id;

      const file = await prisma.file.findUnique({
        where: { id: fileId, ownerId: userId },
      });

      if (!file) {
        req.flash("error", "File not found");
        return res.redirect("back");
      }

      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
        await cloudinary.uploader.destroy(file.publicId, {
          resource_type: "raw",
        });
      }
      await prisma.file.delete({
        where: { id: fileId, ownerId: userId },
      });

      req.flash("success", "File deleted successfully");
      res.redirect("back");
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  },
  postShare: async (req: any, res: any) => {
    console.log("Received a share request for folder:", req.params.folderId);
    console.log("Request body:", req.body); // Inspect if the body is correct
    try {
      const folderId = req.params.folderId;
      let duration = req.body.duration;
      let expiresAt;

      if (duration === "custom") {
        const days = parseInt(req.body["customDays"] || "0");
        if (isNaN(days)) throw new Error("Invalid custom duration");
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else {
        const hours = parseInt(duration);
        if (isNaN(hours)) throw new Error("Invalid custom duration");
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }

      const shareLink = await prisma.shareLink.create({
        data: {
          token: uuidv4(),
          folderId,
          expiresAt,
          createdById: req.user.id,
        },
      });

      const shareUrl = `${req.protocol}://${req.get("host")}/shared/${
        shareLink.token
      }`;

      // Return JSON response
      res.json({
        success: true,
        shareUrl,
        expirationDate: expiresAt.toLocaleString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Error creating share link" });
    }
  },
};

export default dashboardController;
