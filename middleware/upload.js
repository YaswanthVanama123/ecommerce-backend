import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import stream from 'stream';

// Constants for file validation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;
const COMPRESSION_QUALITY = 85;

// Promisify pipeline for streaming
const pipeline = promisify(stream.pipeline);

/**
 * Validates file type and extension
 * @param {Object} file - Multer file object
 * @returns {boolean} - Whether file is valid
 */
const isValidFileType = (file) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  return ALLOWED_EXTENSIONS.includes(extname) && ALLOWED_MIME_TYPES.includes(mimeType);
};

/**
 * Enhanced file filter with detailed validation
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check if file exists
    if (!file) {
      return cb(new Error('No file provided'), false);
    }

    // Validate file type and extension
    if (!isValidFileType(file)) {
      return cb(
        new Error(
          `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`
        ),
        false
      );
    }

    // Check file size (preliminary check, detailed check after upload)
    if (file.size > MAX_FILE_SIZE) {
      return cb(
        new Error(`File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`),
        false
      );
    }

    // Additional security check for file name
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    file.originalname = sanitizedFilename;

    cb(null, true);
  } catch (error) {
    cb(new Error(`File validation error: ${error.message}`), false);
  }
};

/**
 * Validates image dimensions and metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} - Image metadata
 */
const validateImageDimensions = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
      throw new Error(
        `Image dimensions too small. Minimum: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`
      );
    }

    if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
      throw new Error(
        `Image dimensions too large. Maximum: ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`
      );
    }

    return metadata;
  } catch (error) {
    throw new Error(`Image validation failed: ${error.message}`);
  }
};

/**
 * Compresses and optimizes image buffer
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
const compressImage = async (buffer, options = {}) => {
  try {
    const {
      quality = COMPRESSION_QUALITY,
      maxWidth = 2048,
      maxHeight = 2048,
      format = 'jpeg'
    } = options;

    const metadata = await sharp(buffer).metadata();
    let sharpInstance = sharp(buffer);

    // Resize if dimensions exceed maximum
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format-specific compression
    switch (format) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          quality,
          compressionLevel: 9,
          palette: true
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 6
        });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
    }

    // Remove metadata for smaller file size
    sharpInstance = sharpInstance.withMetadata({
      orientation: metadata.orientation
    });

    return await sharpInstance.toBuffer();
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
};

/**
 * Processes uploaded file with validation and compression
 * @param {Object} file - Multer file object
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processed file data
 */
const processUploadedFile = async (file, options = {}) => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }

    // Validate image dimensions
    const metadata = await validateImageDimensions(file.buffer);

    // Compress image
    const format = path.extname(file.originalname).slice(1).toLowerCase();
    const compressedBuffer = await compressImage(file.buffer, {
      ...options,
      format
    });

    // Calculate compression ratio
    const originalSize = file.buffer.length;
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    return {
      buffer: compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        hasAlpha: metadata.hasAlpha
      }
    };
  } catch (error) {
    throw new Error(`File processing failed: ${error.message}`);
  }
};

/**
 * Middleware to validate and process multiple files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const processMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Process files concurrently with Promise.all
    const processingPromises = req.files.map(async (file) => {
      try {
        const processedFile = await processUploadedFile(file, {
          quality: COMPRESSION_QUALITY,
          maxWidth: 2048,
          maxHeight: 2048
        });

        // Replace buffer with compressed version
        file.buffer = processedFile.buffer;
        file.size = processedFile.compressedSize;

        // Add processing metadata
        file.processingInfo = {
          originalSize: processedFile.originalSize,
          compressedSize: processedFile.compressedSize,
          compressionRatio: processedFile.compressionRatio,
          metadata: processedFile.metadata
        };

        return file;
      } catch (error) {
        throw new Error(`Failed to process ${file.originalname}: ${error.message}`);
      }
    });

    // Wait for all files to be processed
    req.files = await Promise.all(processingPromises);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Error handler for multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 files per upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field'
        });
      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many parts in the request'
        });
      case 'LIMIT_FIELD_KEY':
        return res.status(400).json({
          success: false,
          message: 'Field name too long'
        });
      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          message: 'Field value too long'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many fields'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  }

  next(error);
};

// Configure multer with memory storage for streaming
const storage = multer.memoryStorage();

// Create multer upload instance with enhanced configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
    fields: 10,
    parts: 20,
    headerPairs: 20
  }
});

/**
 * Creates upload middleware with processing
 * @param {string} fieldName - Field name for file upload
 * @param {number} maxCount - Maximum number of files
 * @returns {Array} - Array of middleware functions
 */
const createUploadMiddleware = (fieldName, maxCount = 1) => {
  const uploadHandler = maxCount === 1
    ? upload.single(fieldName)
    : upload.array(fieldName, maxCount);

  return [uploadHandler, processMultipleFiles, handleMulterError];
};

// Export upload instance and utilities
export default upload;

export {
  createUploadMiddleware,
  processMultipleFiles,
  processUploadedFile,
  compressImage,
  validateImageDimensions,
  handleMulterError,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  COMPRESSION_QUALITY
};
