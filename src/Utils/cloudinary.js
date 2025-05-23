import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    // Upload file on clodinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // File uploaded successfully
    fs.unlinkSync(localFilePath);
    return response; // Contains secure_url
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file if the upload operation got failed
    return null;
  }
};

export { UploadOnCloudinary };
