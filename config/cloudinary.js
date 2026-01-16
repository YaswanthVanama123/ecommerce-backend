import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import stream from 'stream';
import { promisify } from 'util';

dotenv.config();

// Cloudinary configuration with optimizations
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  // Enable automatic quality and format optimization
  secure_distribution: null,
  private_cdn: false,
  // Connection pool settings for better performance
  connection_timeout: 60000,
  socket_timeout: 60000,
  // Enable chunked uploads for large files
  chunk_size: 6000000
});

// Upload configuration presets
const UPLOAD_PRESETS = {
  product: {
    folder: 'ecommerce/products',
    transformation: [
      {
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'progressive',
        crop: 'limit',
        width: 2048,
        height: 2048
      }
    ],
    allowed_formats: ['jpg', 'png', 'webp'],
    resource_type: 'image',
    format: 'webp', // Convert to WebP for better compression
    eager: [
      // Generate thumbnails eagerly
      { width: 400, height: 400, crop: 'fill', quality: 'auto:good', format: 'webp' },
      { width: 800, height: 800, crop: 'fill', quality: 'auto:good', format: 'webp' },
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', format: 'webp' }
    ],
    eager_async: false, // Generate thumbnails synchronously for immediate availability
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    invalidate: true,
    // Enable responsive breakpoints
    responsive_breakpoints: {
      create_derived: true,
      bytes_step: 20000,
      min_width: 200,
      max_width: 1200,
      max_images: 5,
      transformation: {
        crop: 'fill',
        aspect_ratio: '1:1',
        gravity: 'auto'
      }
    }
  },
  category: {
    folder: 'ecommerce/categories',
    transformation: [
      {
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'progressive',
        crop: 'fill',
        width: 800,
        height: 800,
        gravity: 'auto'
      }
    ],
    allowed_formats: ['jpg', 'png', 'webp'],
    resource_type: 'image',
    format: 'webp',
    use_filename: true,
    unique_filename: true,
    overwrite: false
  },
  avatar: {
    folder: 'ecommerce/avatars',
    transformation: [
      {
        quality: 'auto:best',
        fetch_format: 'auto',
        flags: 'progressive',
        crop: 'fill',
        width: 500,
        height: 500,
        gravity: 'face'
      }
    ],
    allowed_formats: ['jpg', 'png', 'webp'],
    resource_type: 'image',
    format: 'webp',
    use_filename: true,
    unique_filename: true,
    overwrite: true
  }
};

// Promisify stream pipeline
const pipeline = promisify(stream.pipeline);

/**
 * Uploads a single file to Cloudinary with streaming
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    // Create a readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Uploads multiple files concurrently with progress tracking
 * @param {Array} files - Array of file objects with buffer
 * @param {Object} options - Upload options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleFiles = async (files, options = {}, onProgress = null) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided for upload');
  }

  const uploadedFiles = [];
  const failedFiles = [];
  let completedCount = 0;

  // Upload files concurrently with Promise.all
  const uploadPromises = files.map(async (file, index) => {
    try {
      const result = await uploadToCloudinary(file.buffer, {
        ...options,
        public_id: file.public_id || undefined,
        context: {
          originalName: file.originalname,
          size: file.size,
          ...options.context
        }
      });

      completedCount++;

      // Call progress callback if provided
      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          fileName: file.originalname,
          index,
          completed: completedCount,
          total: files.length,
          progress: Math.round((completedCount / files.length) * 100),
          success: true,
          result
        });
      }

      uploadedFiles.push({
        originalName: file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        thumbnail: result.eager?.[0]?.secure_url || result.secure_url,
        responsiveBreakpoints: result.responsive_breakpoints || []
      });

      return result;
    } catch (error) {
      completedCount++;

      // Call progress callback for failed upload
      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          fileName: file.originalname,
          index,
          completed: completedCount,
          total: files.length,
          progress: Math.round((completedCount / files.length) * 100),
          success: false,
          error: error.message
        });
      }

      failedFiles.push({
        originalName: file.originalname,
        error: error.message
      });

      throw error;
    }
  });

  try {
    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    return {
      success: true,
      uploadedFiles,
      failedFiles,
      totalUploaded: uploadedFiles.length,
      totalFailed: failedFiles.length
    };
  } catch (error) {
    // If any upload fails, attempt rollback
    if (uploadedFiles.length > 0) {
      await rollbackUploads(uploadedFiles.map(f => f.publicId));
    }

    return {
      success: false,
      uploadedFiles,
      failedFiles,
      totalUploaded: uploadedFiles.length,
      totalFailed: failedFiles.length,
      error: 'Some uploads failed and have been rolled back'
    };
  }
};

/**
 * Deletes files from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    // Delete files concurrently
    const deletePromises = publicIds.map(publicId =>
      cloudinary.uploader.destroy(publicId, { invalidate: true })
    );

    const results = await Promise.all(deletePromises);

    const deletedCount = results.filter(r => r.result === 'ok').length;
    const failedCount = results.length - deletedCount;

    return {
      success: failedCount === 0,
      deletedCount,
      failedCount,
      results
    };
  } catch (error) {
    throw new Error(`Failed to delete files from Cloudinary: ${error.message}`);
  }
};

/**
 * Rolls back uploaded files in case of error
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @returns {Promise<void>}
 */
const rollbackUploads = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) {
      return;
    }

    console.log(`Rolling back ${publicIds.length} uploaded files...`);
    await deleteFromCloudinary(publicIds);
    console.log('Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error.message);
    // Don't throw error during rollback to avoid masking original error
  }
};

/**
 * Generates optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized image URL
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = null,
    height = null,
    crop = 'limit',
    quality = 'auto:good',
    format = 'auto',
    gravity = 'auto',
    effect = null
  } = options;

  const transformation = {
    quality,
    fetch_format: format,
    flags: 'progressive'
  };

  if (width) transformation.width = width;
  if (height) transformation.height = height;
  if (crop) transformation.crop = crop;
  if (gravity) transformation.gravity = gravity;
  if (effect) transformation.effect = effect;

  return cloudinary.url(publicId, {
    transformation,
    secure: true
  });
};

/**
 * Generates multiple image sizes for responsive design
 * @param {string} publicId - Cloudinary public ID
 * @param {Array<number>} widths - Array of widths to generate
 * @returns {Array<Object>} - Array of image objects with URLs
 */
const generateResponsiveImages = (publicId, widths = [400, 800, 1200, 1600]) => {
  return widths.map(width => ({
    width,
    url: getOptimizedImageUrl(publicId, {
      width,
      quality: 'auto:good',
      format: 'auto',
      crop: 'limit'
    })
  }));
};

/**
 * Gets image metadata from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Image metadata
 */
const getImageMetadata = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      image_metadata: true,
      colors: true,
      phash: true
    });

    return {
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      url: result.secure_url,
      createdAt: result.created_at,
      colors: result.colors,
      predominantColors: result.predominant?.google || [],
      metadata: result.image_metadata
    };
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
};

/**
 * Checks if Cloudinary is properly configured
 * @returns {boolean} - Whether Cloudinary is configured
 */
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Gets upload preset configuration
 * @param {string} presetName - Preset name (product, category, avatar)
 * @returns {Object} - Preset configuration
 */
const getUploadPreset = (presetName = 'product') => {
  return UPLOAD_PRESETS[presetName] || UPLOAD_PRESETS.product;
};

/**
 * Creates a custom upload preset
 * @param {string} name - Preset name
 * @param {Object} config - Configuration options
 * @returns {Object} - Created preset
 */
const createCustomPreset = (name, config = {}) => {
  UPLOAD_PRESETS[name] = {
    ...UPLOAD_PRESETS.product,
    ...config
  };
  return UPLOAD_PRESETS[name];
};

/**
 * Validates Cloudinary connection
 * @returns {Promise<boolean>} - Whether connection is valid
 */
const validateConnection = async () => {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured. Please set environment variables.');
    }

    await cloudinary.api.ping();
    return true;
  } catch (error) {
    console.error('Cloudinary connection validation failed:', error.message);
    return false;
  }
};

// Export cloudinary instance and utilities
export default cloudinary;

export {
  uploadToCloudinary,
  uploadMultipleFiles,
  deleteFromCloudinary,
  rollbackUploads,
  getOptimizedImageUrl,
  generateResponsiveImages,
  getImageMetadata,
  isCloudinaryConfigured,
  validateConnection,
  getUploadPreset,
  createCustomPreset,
  UPLOAD_PRESETS
};
