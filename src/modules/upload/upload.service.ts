import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export interface UploadResult {
  original: string;
  thumbnail: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadResult> {
    const filename = `${randomBytes(16).toString('hex')}`;
    const originalName = `${filename}.webp`;
    const thumbnailName = `${filename}-thumb.webp`;

    // Process original (max 1200px wide)
    const originalBuffer = await sharp(file.buffer)
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Process thumbnail (400x400 cover)
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    await Promise.all([
      writeFile(join(this.uploadDir, originalName), originalBuffer),
      writeFile(join(this.uploadDir, thumbnailName), thumbnailBuffer),
    ]);

    const baseUrl = this.configService.get('API_URL', 'http://localhost:3000');

    return {
      original: `${baseUrl}/uploads/${originalName}`,
      thumbnail: `${baseUrl}/uploads/${thumbnailName}`,
    };
  }
}
