import cloudinary from "./cloudinary";

const previewUrl = (url: string) => {
  return cloudinary.url(url + ".jpg", {
    resource_type: "auto",
    transformation: [{ page: 1, quality: "auto", crop: "full", width: 500 }],
  });
};

export default previewUrl;
