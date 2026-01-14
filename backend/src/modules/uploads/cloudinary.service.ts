// ============================================
// REUSA - Cloudinary Upload Service
// ============================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

interface UploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  };
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  thumbnailUrl?: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {
    this.initializeCloudinary();
  }

  private initializeCloudinary() {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary credentials not configured');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.isConfigured = true;
    this.logger.log('Cloudinary initialized successfully');
  }

  /**
   * Upload a single image from base64 or URL
   */
  async uploadImage(
    source: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new BadRequestException('Image upload service not configured');
    }

    const {
      folder = 'reusa/products',
      transformation = {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        format: 'webp',
      },
      resourceType = 'image',
    } = options;

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(source, {
        folder,
        resource_type: resourceType,
        transformation: [transformation],
        eager: [
          // Generate thumbnail
          { width: 300, height: 300, crop: 'fill', quality: 'auto:low' },
        ],
        eager_async: true,
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        thumbnailUrl: result.eager?.[0]?.secure_url,
      };
    } catch (error) {
      this.logger.error('Upload failed:', error.message);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    sources: string[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const source of sources) {
      const result = await this.uploadImage(source, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(source: string, userId: string): Promise<UploadResult> {
    return this.uploadImage(source, {
      folder: 'reusa/avatars',
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto:good',
        format: 'webp',
      },
    });
  }

  /**
   * Upload product images
   */
  async uploadProductImages(
    sources: string[],
    productId: string,
  ): Promise<UploadResult[]> {
    return this.uploadImages(sources, {
      folder: `reusa/products/${productId}`,
      transformation: {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        format: 'webp',
      },
    });
  }

  /**
   * Delete an image by public ID
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error('Delete failed:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteImages(publicIds: string[]): Promise<void> {
    if (!this.isConfigured || publicIds.length === 0) {
      return;
    }

    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      this.logger.error('Bulk delete failed:', error.message);
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {},
  ): string {
    const {
      width = 800,
      height,
      crop = 'limit',
      quality = 'auto',
      format = 'auto',
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        {
          width,
          height,
          crop,
          quality,
          fetch_format: format,
        },
      ],
      secure: true,
    });
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(publicId: string, size = 300): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: size,
          height: size,
          crop: 'fill',
          quality: 'auto:low',
          fetch_format: 'auto',
        },
      ],
      secure: true,
    });
  }

  /**
   * Generate blur placeholder URL
   */
  getBlurPlaceholderUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: 30,
          quality: 30,
          effect: 'blur:1000',
          fetch_format: 'auto',
        },
      ],
      secure: true,
    });
  }
}
