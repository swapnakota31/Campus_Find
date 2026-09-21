import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import { config } from '../config';
import { AppError } from '../utils/errors';

export interface UploadImageResult {
  publicId: string;
  imageUrl: string;
  isPrivate: boolean;
}

export class ImageService {
  private isConfigured: boolean = false;

  constructor() {
    if (
      config.cloudinaryCloudName &&
      config.cloudinaryApiKey &&
      config.cloudinaryApiSecret
    ) {
      cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
        secure: true,
      });
      this.isConfigured = true;
    }
  }

  /**
   * Uploads an image buffer as a private/authenticated asset to Cloudinary.
   */
  async uploadPrivateImage(
    fileBuffer: Buffer,
    mimeType: string,
    itemType: 'lost' | 'found',
    itemId: string
  ): Promise<UploadImageResult> {
    const folder = `campusfind/${itemType}_items`;
    const publicId = `${folder}/${itemId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!this.isConfigured) {
      // Dev / Test fallback when real Cloudinary API keys are not present
      const mockUrl = `cloudinary://authenticated/${publicId}`;
      return {
        publicId,
        imageUrl: mockUrl,
        isPrivate: true,
      };
    }

    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            type: 'authenticated', // Private authenticated access mode in Cloudinary
            resource_type: 'image',
            overwrite: true,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(fileBuffer);
      });

      return {
        publicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url || uploadResult.url,
        isPrivate: true,
      };
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      throw new AppError('Failed to upload image to secure storage.', 500);
    }
  }

  /**
   * Generates a short-lived signed access URL for authorized users.
   */
  generateSignedAccessUrl(publicId: string, expiresInSeconds: number = 3600): string {
    if (!this.isConfigured) {
      // Dev / Test fallback signed URL generator
      const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const signature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${publicId}:${expires}`)
        .digest('hex');
      return `http://localhost:5000/api/images/access?publicId=${encodeURIComponent(publicId)}&expires=${expires}&signature=${signature}`;
    }

    // Cloudinary signed URL for authenticated asset
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt,
      secure: true,
    });
  }

  /**
   * Deletes a private asset from Cloudinary storage.
   */
  async deletePrivateImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      return; // Mock deletion in dev/test mode
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        type: 'authenticated',
        invalidate: true,
      });
    } catch (err: any) {
      console.error('Cloudinary deletion error:', err);
      throw new AppError('Failed to delete image asset from storage.', 500);
    }
  }

  /**
   * Future AI Matching Helper: Provides secure binary buffer or download stream for AI processing.
   */
  async getSecureBufferForAI(publicId: string): Promise<Buffer> {
    if (!this.isConfigured) {
      return Buffer.from(`MOCK_AI_IMAGE_BINARY_DATA:${publicId}`);
    }

    const signedUrl = this.generateSignedAccessUrl(publicId, 300);
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new AppError('Failed to retrieve private image for AI analysis.', 500);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export const imageService = new ImageService();
