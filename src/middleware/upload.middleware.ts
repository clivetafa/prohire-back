import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

// Configure storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF files are allowed') as any, false);
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload to Cloudinary helper
import cloudinary from '../config/cloudinary';

export const uploadToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'prohire/resumes',
        public_id: `resume_${Date.now()}`,
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(500, 'Failed to upload file to Cloudinary'));
        } else {
          resolve(result?.secure_url || '');
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};